"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";
export type ConversationState = "idle" | "listening" | "thinking" | "speaking";

interface UseGeminiLiveOptions {
  mcId: string;
  theme: string;
  memo?: string;
  onMessage?: (text: string, isUser: boolean) => void;
  onStateChange?: (state: ConversationState) => void;
  onError?: (error: string) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export function useGeminiLive(options: UseGeminiLiveOptions) {
  const { mcId, theme, memo, onMessage, onStateChange, onError } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [conversationState, setConversationState] = useState<ConversationState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 状態変更をコールバックに通知
  useEffect(() => {
    onStateChange?.(conversationState);
  }, [conversationState, onStateChange]);

  // 非アクティブタイムアウト（5分）
  const resetInactivityTimeout = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    inactivityTimeoutRef.current = setTimeout(() => {
      console.log("Inactivity timeout - disconnecting");
      disconnect();
    }, 5 * 60 * 1000); // 5分
  }, []);

  // 音声再生キューの処理
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    if (!audioContextRef.current) return;

    console.log("Playing audio, queue length:", audioQueueRef.current.length);
    isPlayingRef.current = true;
    const buffer = audioQueueRef.current.shift()!;

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);

    source.onended = () => {
      isPlayingRef.current = false;
      if (audioQueueRef.current.length > 0) {
        playNextAudio();
      } else {
        setConversationState("listening");
      }
    };

    source.start();
  }, []);

  // 割り込み処理 - 再生中の音声を即座に停止
  const interruptPlayback = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    // 現在再生中の音声を停止するにはAudioContextを操作
    if (audioContextRef.current && audioContextRef.current.state === "running") {
      audioContextRef.current.suspend().then(() => {
        audioContextRef.current?.resume();
      });
    }
  }, []);

  // Base64 PCM16音声データをAudioBufferに変換
  const decodeAudioData = useCallback(async (base64Audio: string): Promise<AudioBuffer | null> => {
    if (!audioContextRef.current) return null;

    try {
      // Base64デコード
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // PCM16 (Int16) を Float32 に変換
      const int16Data = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      // AudioBuffer を手動で作成
      const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);
      
      console.log("Decoded audio buffer, length:", float32Data.length, "duration:", audioBuffer.duration.toFixed(2) + "s");
      return audioBuffer;
    } catch (error) {
      console.error("Failed to decode audio:", error);
      return null;
    }
  }, []);

  // WebSocket接続
  const connect = useCallback(async () => {
    if (connectionState === "connected" || connectionState === "connecting") return;

    setConnectionState("connecting");

    try {
      // サーバーから設定を取得
      const configResponse = await fetch("/api/gemini-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mcId, theme, memo, action: "get_config" }),
      });

      if (!configResponse.ok) {
        throw new Error("Failed to get Gemini Live config");
      }

      const config = await configResponse.json();

      // AudioContext初期化（出力用 - Geminiは24kHzで返す）
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // マイクアクセス（エコーキャンセル有効）
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      // Gemini Live API WebSocket接続
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${config.apiKey}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");

        // セットアップメッセージを送信
        const setupMessage = {
          setup: {
            model: `models/${config.model}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Aoede", // 日本語対応の声
                  },
                },
                languageCode: "ja-JP",
              },
            },
            systemInstruction: {
              parts: [{ text: config.systemPrompt }],
            },
          },
        };

        ws.send(JSON.stringify(setupMessage));
      };

      ws.onmessage = async (event) => {
        resetInactivityTimeout();

        let data;
        try {
          if (event.data instanceof Blob) {
            const text = await event.data.text();
            data = JSON.parse(text);
          } else {
            data = JSON.parse(event.data);
          }
        } catch (parseError) {
          console.error("Failed to parse message:", parseError, event.data);
          return;
        }

        // セットアップ完了
        if (data.setupComplete) {
          setConnectionState("connected");
          setConversationState("speaking");

          // 初期メッセージを送信して会話を開始
          const startMessage = {
            clientContent: {
              turns: [
                {
                  role: "user",
                  parts: [{ text: "日本語で番組を開始してください。リスナーに挨拶して、ゲストを紹介してください。" }],
                },
              ],
              turnComplete: true,
            },
          };
          ws.send(JSON.stringify(startMessage));

          // マイク入力の処理を開始
          startAudioCapture();
        }

        // サーバーからのコンテンツ
        // デバッグ: 受信データをログ
        console.log("Received data keys:", Object.keys(data));
        
        if (data.serverContent) {
          const content = data.serverContent;
          console.log("Server content:", JSON.stringify(content).substring(0, 200));

          // テキスト応答
          if (content.modelTurn?.parts) {
            for (const part of content.modelTurn.parts) {
              if (part.text) {
                const msg: Message = {
                  role: "assistant",
                  content: part.text,
                  timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, msg]);
                onMessage?.(part.text, false);
              }

              // 音声応答
              if (part.inlineData?.mimeType?.startsWith("audio/") && isAudioEnabled) {
                setConversationState("speaking");
                const audioBuffer = await decodeAudioData(part.inlineData.data);
                if (audioBuffer) {
                  audioQueueRef.current.push(audioBuffer);
                  playNextAudio();
                }
              }
            }
          }

          // ターン完了
          if (content.turnComplete) {
            if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
              setConversationState("listening");
            }
          }
        }

        // ユーザーの発話検出
        if (data.clientContent?.turns) {
          for (const turn of data.clientContent.turns) {
            if (turn.role === "user" && turn.parts) {
              for (const part of turn.parts) {
                if (part.text) {
                  const msg: Message = {
                    role: "user",
                    content: part.text,
                    timestamp: Date.now(),
                  };
                  setMessages((prev) => [...prev, msg]);
                  onMessage?.(part.text, true);
                }
              }
            }
          }
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionState("error");
        onError?.("WebSocket接続エラーが発生しました");
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setConnectionState("disconnected");
        setConversationState("idle");

        // 異常切断の場合は再接続を試みる
        if (event.code !== 1000 && event.code !== 1001) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting reconnection...");
            connect();
          }, 3000);
        }
      };
    } catch (error: any) {
      console.error("Connection error:", error);
      setConnectionState("error");
      onError?.(error.message || "接続に失敗しました");
    }
  }, [connectionState, mcId, theme, memo, isAudioEnabled, onMessage, onError, resetInactivityTimeout, decodeAudioData, playNextAudio]);

  // マイク入力用のAudioContext（別インスタンス）
  const micContextRef = useRef<AudioContext | null>(null);

  // マイク入力の処理開始
  const startAudioCapture = useCallback(() => {
    if (!mediaStreamRef.current || !wsRef.current) {
      console.error("Cannot start audio capture - missing refs");
      return;
    }

    console.log("Starting audio capture...");
    
    // マイク用に別のAudioContextを作成（ブラウザのネイティブサンプルレート）
    micContextRef.current = new AudioContext();
    console.log("Mic AudioContext sample rate:", micContextRef.current.sampleRate);
    
    const source = micContextRef.current.createMediaStreamSource(mediaStreamRef.current);
    const processor = micContextRef.current.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    let frameCount = 0;
    processor.onaudioprocess = (event) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;

      const inputData = event.inputBuffer.getChannelData(0);
      
      // デバッグ: 100フレームごとにログ
      frameCount++;
      if (frameCount % 100 === 0) {
        const rmsVal = Math.sqrt(inputData.reduce((sum, val) => sum + val * val, 0) / inputData.length);
        console.log("Audio frame", frameCount, "RMS:", rmsVal.toFixed(4));
      }

      // Float32をInt16に変換
      const int16Data = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Base64にエンコード
      const uint8 = new Uint8Array(int16Data.buffer);
      let binary = "";
      for (let i = 0; i < uint8.byteLength; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64Audio = btoa(binary);

      // 音声データを送信
      const audioMessage = {
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: "audio/pcm;rate=16000",
              data: base64Audio,
            },
          ],
        },
      };

      wsRef.current.send(JSON.stringify(audioMessage));

      // 発話検出時に割り込み
      const rmsVal = Math.sqrt(inputData.reduce((sum, val) => sum + val * val, 0) / inputData.length);
      if (rmsVal > 0.02 && conversationState === "speaking") {
        interruptPlayback();
        setConversationState("listening");
      }
    };

    source.connect(processor);
    // processorを出力に接続しないと動作しないブラウザがある
    processor.connect(micContextRef.current.destination);
    console.log("Audio capture connected");
  }, [conversationState, interruptPlayback]);

  // 切断
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setConnectionState("disconnected");
    setConversationState("idle");
  }, []);

  // テキストメッセージ送信（フォールバック用）
  const sendTextMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const message = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    };

    wsRef.current.send(JSON.stringify(message));

    const msg: Message = {
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    onMessage?.(text, true);
    setConversationState("thinking");
  }, [onMessage]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    conversationState,
    messages,
    isAudioEnabled,
    setIsAudioEnabled,
    connect,
    disconnect,
    sendTextMessage,
    interruptPlayback,
  };
}

