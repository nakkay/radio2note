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
  onChapterChange?: (chapter: number, name: string, label: string) => void;
  onQuoteExtracted?: (quote: string) => void;
  onAutoEnd?: () => void; // MCが締めの言葉を言ったら自動終了
  onError?: (error: string) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// テキストから思考プロセス（**...**形式）や英語の内部メモを除去
function cleanTranscript(text: string | object): string {
  // オブジェクトの場合は文字列に変換を試みる
  if (typeof text === "object" && text !== null) {
    // textプロパティがあればそれを使用
    const obj = text as { text?: string };
    if (obj.text && typeof obj.text === "string") {
      text = obj.text;
    } else {
      console.log("⚠️ 予期しないオブジェクト形式:", JSON.stringify(text).substring(0, 100));
      return "";
    }
  }
  
  if (!text || typeof text !== "string") return "";
  
  // **...** 形式の思考プロセスを除去
  let cleaned = text.replace(/\*\*[^*]+\*\*/g, "");
  
  // 日本語文字が含まれているかチェック
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(cleaned);
  
  // 日本語が含まれていない場合は空を返す（英語のみの発言は無視）
  if (!hasJapanese) {
    console.log("⚠️ 日本語なしの発言をスキップ:", text.substring(0, 50) + "...");
    return "";
  }
  
  // 先頭の英語の思考テキストを除去（日本語が始まるまでスキップ）
  const japaneseMatch = cleaned.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
  if (japaneseMatch && japaneseMatch.index !== undefined && japaneseMatch.index > 0) {
    cleaned = cleaned.substring(japaneseMatch.index);
  }
  
  // 空白をトリム
  cleaned = cleaned.trim();
  
  return cleaned;
}

export function useGeminiLive(options: UseGeminiLiveOptions) {
  const { mcId, theme, memo, onMessage, onStateChange, onChapterChange, onQuoteExtracted, onAutoEnd, onError } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [conversationState, setConversationState] = useState<ConversationState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // conversationStateのRef（クロージャでの参照用）
  const conversationStateRef = useRef<ConversationState>("idle");
  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Web Speech APIは削除 - Gemini APIのinputTranscriptionを使用
  
  // ディレクター機能用
  const messageCountRef = useRef(0);
  const lastDirectorCheckRef = useRef(0);
  const startTimeRef = useRef<number | null>(null); // 会話開始時刻
  const currentChapterRef = useRef(1); // 現在のチャプター（1=起, 2=承, 3=転, 4=結）
  const DIRECTOR_CHECK_INTERVAL = 5; // 5発言ごとにディレクターに確認（頻度を下げる）
  
  // ストリーミング発言を蓄積するバッファ
  const mcBufferRef = useRef<string>("");
  const userBufferRef = useRef<string>("");
  
  // 割り込み検出用（デバウンス）- さらに保守的に
  const speechDetectionCountRef = useRef(0);
  const lastInterruptTimeRef = useRef(0);
  const SPEECH_DETECTION_THRESHOLD = 0.25; // RMS閾値をさらに上げる（0.15→0.25）
  const SPEECH_DETECTION_FRAMES = 20; // 20フレーム連続で検出したら割り込み（約1秒）
  const INTERRUPT_COOLDOWN = 5000; // 割り込み後5秒間は再割り込みしない

  // 状態変更をコールバックに通知
  useEffect(() => {
    onStateChange?.(conversationState);
  }, [conversationState, onStateChange]);

  // messagesをRefで保持（クロージャ問題回避）
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ディレクターに指示を求める
  const checkDirector = useCallback(async () => {
    const currentMessages = messagesRef.current;
    console.log(`🎬 ディレクターチェック: ${currentMessages.length}メッセージ`);
    
    if (currentMessages.length < 4) {
      console.log("   → メッセージ数不足でスキップ");
      return;
    }
    
    try {
      console.log("   → API呼び出し中...");
      const response = await fetch("/api/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationHistory: currentMessages,
          theme,
          memo,
          mcId,
          currentChapter: currentChapterRef.current,
        }),
      });

      if (!response.ok) {
        console.error("   → API エラー:", response.status);
        return;
      }

      const data = await response.json();
      
      // チャプター進行の処理（最大4チャプターまで）
      const MAX_CHAPTER = 4;
      if (data.shouldAdvanceChapter && data.chapterInfo && currentChapterRef.current < MAX_CHAPTER) {
        const newChapter = currentChapterRef.current + 1;
        if (newChapter <= MAX_CHAPTER) {
          currentChapterRef.current = newChapter;
          console.log(`🎬 チャプター進行: ${data.chapterInfo.name}「${data.chapterInfo.label}」`);
          console.log(`   理由: ${data.advanceReason}`);
          onChapterChange?.(newChapter, data.chapterInfo.name, data.chapterInfo.label);
        }
      }
      
      // MCへの指示送信（積極的に介入する）
      if (data.instruction && wsRef.current?.readyState === WebSocket.OPEN) {
        console.log("📋 ディレクター指示:", data.instruction);
        if (data.groundingTip) {
          console.log("💡 ネタ活用:", data.groundingTip);
        }
        
        // 指示をMCに送信（会話の流れを改善するため積極的に介入）
        let instructionText = `[ディレクターからの指示] ${data.instruction}`;
        
        if (data.shouldAdvanceChapter && data.chapterInfo) {
          instructionText += `\n[チャプター移行] ${data.chapterInfo.name}「${data.chapterInfo.label}」に進んでください。`;
        }
        
        if (data.groundingTip) {
          instructionText += `\n[ネタ情報] ${data.groundingTip}`;
        }
        
        // MCが話していない時、または会話が止まっている時に送信
        // 会話を中断しないよう、MCの次のターンで反映されるように送信
        const directorMessage = {
          clientContent: {
            turns: [
              {
                role: "user",
                parts: [{ text: instructionText }],
              },
            ],
            turnComplete: true,
          },
        };
        
        // 指示を送信（MCの次の発話時に反映される）
        wsRef.current.send(JSON.stringify(directorMessage));
        console.log("📤 ディレクター指示をMCに送信しました");
      }
      
      // 引用抽出：記事に使えそうなフレーズをコールバック
      if (data.notableQuote) {
        console.log("💬 ピックアップ:", data.notableQuote);
        onQuoteExtracted?.(data.notableQuote);
      }
    } catch (error) {
      console.error("Director check failed:", error);
    }
  }, [theme, memo, mcId, onChapterChange, onQuoteExtracted]);

  // 非アクティブタイムアウト（5分）
  const resetInactivityTimeout = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    inactivityTimeoutRef.current = setTimeout(() => {
      console.log("⏰ 非アクティブタイムアウト - 切断");
      disconnect();
    }, 5 * 60 * 1000); // 5分
  }, []);

  // 音声再生のスケジューリング用
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // 音声再生キューの処理（スケジューリング方式でブツ切れを解消）
  const playNextAudio = useCallback(async () => {
    if (audioQueueRef.current.length === 0) return;
    if (!audioContextRef.current) return;

    isPlayingRef.current = true;
    const buffer = audioQueueRef.current.shift()!;
    const ctx = audioContextRef.current;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // スケジューリング: 前の音声が終わる時間から開始
    const startTime = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    nextPlayTimeRef.current = startTime + buffer.duration;

    source.onended = () => {
      // アクティブソースから削除
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      
      if (audioQueueRef.current.length === 0 && activeSourcesRef.current.length === 0) {
        isPlayingRef.current = false;
        setConversationState("listening");
      }
    };

    activeSourcesRef.current.push(source);
    source.start(startTime);

    // キューに残りがあれば続けて処理
    if (audioQueueRef.current.length > 0) {
      playNextAudio();
    }
  }, []);

  // 割り込み処理 - 再生中の音声を即座に停止
  const interruptPlayback = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
    
    // アクティブな音声ソースを全て停止
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch {
        // 既に停止している場合は無視
      }
    });
    activeSourcesRef.current = [];
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
      // 現在の会話履歴を取得（再接続判定用）
      const currentMessages = messagesRef.current;
      const isReconnecting = currentMessages.length > 0;

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
      console.log("WebSocket接続開始...", config.model);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket接続完了");

        // セットアップメッセージを送信
        const setupMessage = {
          setup: {
            model: `models/${config.model}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: config.voiceName || "Aoede", // MCに合わせた声
                  },
                },
                languageCode: "ja-JP",
              },
            },
            // トランスクリプション設定を有効化
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: {
              parts: [{ text: config.systemPrompt }],
            },
          },
        };

        ws.send(JSON.stringify(setupMessage));
        console.log("セットアップ完了待機中...");
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
          const currentMessages = messagesRef.current;
          const isReconnecting = currentMessages.length > 0;

          if (isReconnecting) {
            console.log("✅ 再接続完了 - 会話を再開します（会話履歴:", currentMessages.length, "件）");
          } else {
            console.log("✅ 接続完了 - 番組開始");
            startTimeRef.current = Date.now(); // 会話開始時刻を記録
          }

          setConnectionState("connected");
          setConversationState("speaking");

          // 再接続時は会話履歴を送信、初回接続時は初期メッセージを送信
          if (isReconnecting) {
            // 会話履歴をGemini Live APIの形式に変換
            const historyTurns = currentMessages.map((msg) => ({
              role: msg.role === "user" ? "user" : "model",
              parts: [{ text: msg.content }],
            }));

            // 会話履歴を送信して会話を再開
            const resumeMessage = {
              clientContent: {
                turns: historyTurns,
                turnComplete: true,
              },
            };
            ws.send(JSON.stringify(resumeMessage));
            console.log("📝 会話履歴を送信しました（", historyTurns.length, "件）");
          } else {
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
          }

          // マイク入力の処理を開始
          startAudioCapture();
        }

        // サーバーからのコンテンツ
        if (data.serverContent) {
          const content = data.serverContent;
          
          // デバッグ: 未処理のserverContentキーを確認
          const keys = Object.keys(content);
          const handledKeys = ["modelTurn", "inputTranscription", "outputTranscription", "turnComplete", "generationComplete"];
          const unhandledKeys = keys.filter(k => !handledKeys.includes(k));
          if (unhandledKeys.length > 0) {
            console.log("📨 未処理キー:", unhandledKeys);
          }

          // ユーザーの音声トランスクリプト（inputTranscription）- バッファに蓄積
          if (content.inputTranscription) {
            const text = typeof content.inputTranscription === 'string' 
              ? content.inputTranscription 
              : (content.inputTranscription as { text?: string })?.text || '';
            if (text.trim()) {
              userBufferRef.current += text;
            }
          }

          // MCの音声トランスクリプト（outputTranscription）- バッファに蓄積
          if (content.outputTranscription) {
            const cleanedText = cleanTranscript(content.outputTranscription);
            if (cleanedText) {
              mcBufferRef.current += cleanedText;
            }
          }

          // テキスト応答（modelTurn.parts）
          // ※outputTranscriptionでバッファリングしているため、ここではテキストは無視
          // 音声応答のみ処理
          if (content.modelTurn?.parts) {
            for (const part of content.modelTurn.parts) {
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

          // ターン完了 - バッファをフラッシュしてメッセージを記録
          if (content.turnComplete) {
            // MCの発言をまとめて記録
            if (mcBufferRef.current.trim()) {
              const fullText = mcBufferRef.current.trim();
              console.log("🎙️ MC:", fullText);
              const msg: Message = {
                role: "assistant",
                content: fullText,
                timestamp: Date.now(),
              };
              setMessages((prev) => [...prev, msg]);
              onMessage?.(fullText, false);
              mcBufferRef.current = "";
              
              // 締めの言葉を検出したら自動終了
              const endingPhrases = [
                "バイバイ",
                "ばいばい",
                "また次回",
                "またね",
                "お送りしました",
                "ありがとうございました",
                "それでは",
                "また来週",
                "さようなら",
              ];
              const isEnding = endingPhrases.some(phrase => fullText.includes(phrase));
              // 「結」チャプター（4）で締めの言葉が出たら自動終了
              if (isEnding && currentChapterRef.current >= 4) {
                console.log("🎬 番組終了を検出 - 自動終了");
                setTimeout(() => {
                  onAutoEnd?.();
                }, 2000); // 2秒待ってから終了（余韻を持たせる）
              }
              
              // MCのターン完了後にディレクターチェック
              messageCountRef.current++;
              if (messageCountRef.current - lastDirectorCheckRef.current >= DIRECTOR_CHECK_INTERVAL) {
                lastDirectorCheckRef.current = messageCountRef.current;
                checkDirector();
              }
            }
            
            if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
              setConversationState("listening");
            }
          }
          
          // ユーザーの発言をフラッシュ（inputTranscriptionが蓄積されている場合）
          // generationCompleteのタイミングでフラッシュ
          if (content.generationComplete) {
            if (userBufferRef.current.trim() && userBufferRef.current.trim().length >= 2) {
              const userText = userBufferRef.current.trim();
              console.log("🎤 ユーザー:", userText);
              const userMsg: Message = {
                role: "user",
                content: userText,
                timestamp: Date.now(),
              };
              setMessages((prev) => [...prev, userMsg]);
              onMessage?.(userText, true);
              userBufferRef.current = "";
              
              // ディレクターチェック
              messageCountRef.current++;
              if (messageCountRef.current - lastDirectorCheckRef.current >= DIRECTOR_CHECK_INTERVAL) {
                lastDirectorCheckRef.current = messageCountRef.current;
                checkDirector();
              }
            }
          }

          // 割り込み検出
          if (content.interrupted) {
            interruptPlayback();
          }
        }

        // ユーザーの発話検出（clientContentエコー - フォールバック）
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
        console.error("WebSocket readyState:", ws.readyState);
        setConnectionState("error");
        onError?.("WebSocket接続エラーが発生しました");
      };

      ws.onclose = (event) => {
        console.log("WebSocket切断:", event.code, event.reason);
        setConnectionState("disconnected");
        setConversationState("idle");

        // 異常切断の場合は再接続を試みる
        if (event.code !== 1000 && event.code !== 1001) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("再接続中...");
            connect();
          }, 3000);
        }
      };
    } catch (error: any) {
      console.error("Connection error:", error);
      setConnectionState("error");
      onError?.(error.message || "接続に失敗しました");
    }
  }, [connectionState, mcId, theme, memo, isAudioEnabled, onMessage, onError, resetInactivityTimeout, decodeAudioData, playNextAudio, messagesRef]);

  // マイク入力用のAudioContext（別インスタンス）
  const micContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  // ダウンサンプリング関数（48kHz → 16kHz など）
  const downsample = useCallback((inputData: Float32Array, inputSampleRate: number, outputSampleRate: number): Int16Array => {
    const ratio = inputSampleRate / outputSampleRate;
    const outputLength = Math.floor(inputData.length / ratio);
    const output = new Int16Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const inputIndex = Math.floor(i * ratio);
      const s = Math.max(-1, Math.min(1, inputData[inputIndex]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    
    return output;
  }, []);

  // マイク入力の処理開始（AudioWorklet使用）
  const startAudioCapture = useCallback(async () => {
    if (!mediaStreamRef.current || !wsRef.current) {
      console.error("Cannot start audio capture - missing refs");
      return;
    }

    try {
      // マイク用に別のAudioContextを作成
      micContextRef.current = new AudioContext();
      const inputSampleRate = micContextRef.current.sampleRate;
      
      // AudioWorkletモジュールをロード
      await micContextRef.current.audioWorklet.addModule('/audio-capture-processor.js');
      console.log("🎤 マイク接続完了");
      
      const source = micContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      const workletNode = new AudioWorkletNode(micContextRef.current, 'audio-capture-processor');
      workletNodeRef.current = workletNode;
      
      let frameCount = 0;
      
      // AudioWorkletからのメッセージを受信
      workletNode.port.onmessage = (event) => {
        const data = event.data;
        
        // デバッグログは無視（必要時のみ有効化）
        if (data.type === 'debug') {
          return;
        }
        
        if (data.type === 'audioData') {
          if (wsRef.current?.readyState !== WebSocket.OPEN) return;
          
          frameCount++;
          
          // Float32データからRMS計算
          const float32Data = new Float32Array(data.float32Data);
          const rmsVal = Math.sqrt(float32Data.reduce((sum: number, val: number) => sum + val * val, 0) / float32Data.length);
          
          // ダウンサンプリング（inputSampleRate → 16kHz）
          const int16Data = downsample(float32Data, inputSampleRate, 16000);
          
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
          
          // 発話検出時に割り込み（デバウンス + クールダウン付き）
          const now = Date.now();
          const timeSinceLastInterrupt = now - lastInterruptTimeRef.current;
          
          if (conversationStateRef.current === "speaking" && timeSinceLastInterrupt > INTERRUPT_COOLDOWN) {
            if (rmsVal > SPEECH_DETECTION_THRESHOLD) {
              speechDetectionCountRef.current++;
              // 連続して閾値を超えた場合のみ割り込み
              if (speechDetectionCountRef.current >= SPEECH_DETECTION_FRAMES) {
                console.log("🔇 ユーザー発話検出 - MC音声を中断");
                interruptPlayback();
                setConversationState("listening");
                speechDetectionCountRef.current = 0;
                lastInterruptTimeRef.current = now;
              }
            } else {
              // 閾値を下回ったらカウンターをリセット
              speechDetectionCountRef.current = 0;
            }
          } else {
            speechDetectionCountRef.current = 0;
          }
        }
      };
      
      source.connect(workletNode);
      // WorkletNodeを出力に接続（無音を出力）
      workletNode.connect(micContextRef.current.destination);
      
    } catch (error) {
      console.error("Failed to start AudioWorklet, falling back to ScriptProcessor:", error);
      // フォールバック: ScriptProcessorを使用
      startAudioCaptureWithScriptProcessor();
    }
  }, [interruptPlayback, downsample]);

  // フォールバック用のScriptProcessor（古いブラウザ用）
  const startAudioCaptureWithScriptProcessor = useCallback(() => {
    if (!mediaStreamRef.current || !wsRef.current) return;
    
    console.log("🎤 マイク接続完了 (フォールバック)");
    
    micContextRef.current = new AudioContext();
    const inputSampleRate = micContextRef.current.sampleRate;
    
    const source = micContextRef.current.createMediaStreamSource(mediaStreamRef.current);
    const processor = micContextRef.current.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    let frameCount = 0;
    processor.onaudioprocess = (event) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;

      const inputData = event.inputBuffer.getChannelData(0);
      frameCount++;
      
      // ダウンサンプリング
      const int16Data = downsample(inputData, inputSampleRate, 16000);

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
    };

    source.connect(processor);
    processor.connect(micContextRef.current.destination);
  }, [downsample]);

  // 切断
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // AudioWorkletNodeのクリーンアップ
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // マイク用AudioContextのクリーンアップ
    if (micContextRef.current) {
      micContextRef.current.close();
      micContextRef.current = null;
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

