"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useGeminiLive, ConversationState } from "../hooks/useGeminiLive";

const STEPS = [
  { id: 1, label: "起", description: "導入・アイスブレイク", duration: 3 },
  { id: 2, label: "承", description: "深掘り・きっかけ", duration: 5 },
  { id: 3, label: "転", description: "発見・転換点", duration: 5 },
  { id: 4, label: "結", description: "まとめ・締め", duration: 2 },
];

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function RecordingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [theme, setTheme] = useState("");
  const [memo, setMemo] = useState("");
  const [mcId, setMcId] = useState("");
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const [shouldAutoEnd, setShouldAutoEnd] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Gemini Live フック
  const {
    connectionState,
    conversationState,
    messages,
    isAudioEnabled,
    setIsAudioEnabled,
    connect,
    disconnect,
  } = useGeminiLive({
    mcId,
    theme,
    memo,
    onMessage: (text, isUser) => {
      // メッセージを保存（記事生成用）
      setDisplayMessages((prev) => [
        ...prev,
        { role: isUser ? "user" : "assistant", content: text, timestamp: Date.now() },
      ]);
    },
    onAutoEnd: () => {
      // MCが締めの言葉を言ったら自動的に収録終了
      console.log("🎬 自動終了トリガー");
      setShouldAutoEnd(true);
    },
    onChapterChange: (chapter) => {
      // ディレクターからのチャプター進行指示
      console.log(`🎬 チャプター変更: ${chapter}`);
      setCurrentStep(chapter);
    },
    onError: (error) => {
      console.error("Gemini Live error:", error);
      alert(`エラー: ${error}`);
    },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ローカルストレージからデータを読み込む
  useEffect(() => {
    const savedTheme = localStorage.getItem("radio2note_theme");
    const savedMemo = localStorage.getItem("radio2note_memo");
    const savedMcId = localStorage.getItem("radio2note_mcId");

    if (savedTheme) setTheme(savedTheme);
    if (savedMemo) setMemo(savedMemo);
    if (savedMcId) setMcId(savedMcId);
  }, []);

  // theme と mcId が設定されたら接続開始（一度だけ）
  const hasConnectedRef = useRef(false);
  useEffect(() => {
    if (theme && mcId && connectionState === "disconnected" && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
      connect();
      startTimeRef.current = Date.now();
    }
  }, [theme, mcId, connectionState, connect]);

  // タイマー（チャプター進行はディレクターAIが判断）
  useEffect(() => {
    if (connectionState === "connected") {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [connectionState]);

  const handleEndRecording = () => {
    disconnect();
    // useGeminiLiveのmessagesを優先（より信頼性が高い）
    const conversationToSave = messages.length > 0 ? messages : displayMessages;
    console.log("💾 保存する会話:", conversationToSave.length, "件");
    localStorage.setItem("radio2note_conversation", JSON.stringify(conversationToSave));
    localStorage.setItem("radio2note_elapsedTime", elapsedTime.toString());
    router.push("/tone");
  };

  // 自動終了のハンドリング
  useEffect(() => {
    if (shouldAutoEnd) {
      handleEndRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoEnd]);

  // 状態に応じたビジュアライザーの色
  const getVisualizerColor = (state: ConversationState) => {
    switch (state) {
      case "listening":
        return "bg-chart-2"; // オレンジ - 聞いている
      case "thinking":
        return "bg-chart-4"; // グレー - 考え中
      case "speaking":
        return "bg-primary"; // ゴールド - 話している
      default:
        return "bg-muted";
    }
  };

  const getMcName = () => {
    switch (mcId) {
      case "hikaru":
        return "ヒカル";
      case "waka":
        return "ワカ";
      case "kono":
        return "コノ";
      default:
        return "MC";
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0">
        <Link
          href="/mc"
          className="flex items-center justify-center size-11 rounded-full bg-card border border-border/50 transition-transform active:scale-95"
          onClick={() => disconnect()}
        >
          <Icon icon="solar:arrow-left-linear" className="text-2xl" />
        </Link>
        <button
          onClick={() => setIsAudioEnabled(!isAudioEnabled)}
          className={clsx(
            "flex items-center justify-center size-11 rounded-full border transition-colors",
            isAudioEnabled
              ? "bg-primary/20 border-primary/50 text-primary"
              : "bg-card border-border/50 text-muted-foreground"
          )}
          title={isAudioEnabled ? "音声をオフにする" : "音声をオンにする"}
        >
          <Icon
            icon={isAudioEnabled ? "solar:soundwave-bold" : "solar:soundwave-off-bold"}
            className="text-xl"
          />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Theme & Timer */}
        <div className="px-6 pt-2 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">トークテーマ</p>
              <h2 className="text-lg font-heading font-bold text-foreground truncate">{theme}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">収録時間</p>
              <div className="text-2xl font-bold font-heading text-primary">{formatTime(elapsedTime)}</div>
            </div>
          </div>

          {/* Step Indicator - Compact */}
          <div className="flex items-center gap-1">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div
                  className={clsx(
                    "flex-1 h-1.5 rounded-full transition-colors",
                    currentStep >= step.id ? "bg-primary" : "bg-border"
                  )}
                />
                {index < STEPS.length - 1 && <div className="w-1" />}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => (
              <span
                key={step.id}
                className={clsx(
                  "text-[10px] font-medium",
                  currentStep === step.id ? "text-primary font-bold" : currentStep > step.id ? "text-primary/60" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            ))}
          </div>
          {/* 現在のコーナー説明 */}
          <div className="mt-3 text-center">
            <span className="text-xs text-muted-foreground">
              {STEPS.find(s => s.id === currentStep)?.description}
            </span>
          </div>
        </div>

        {/* Main Content - Large Visualizer */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
          {/* Large Visualizer */}
          <div className="w-full max-w-lg flex-1 flex flex-col items-center justify-center">
            <div 
              className={clsx(
                "w-full rounded-[2rem] p-8 border shadow-2xl transition-all duration-300",
                connectionState === "connected"
                  ? conversationState === "speaking"
                    ? "bg-gradient-to-b from-primary/10 to-primary/5 border-primary/30 shadow-primary/20"
                    : conversationState === "listening"
                    ? "bg-gradient-to-b from-chart-2/10 to-chart-2/5 border-chart-2/30 shadow-chart-2/20"
                    : "bg-card border-border/50 shadow-primary/5"
                  : "bg-card border-border/50 shadow-primary/5"
              )}
            >
              <div className="flex items-end justify-center gap-1.5 h-48">
                {Array.from({ length: 32 }).map((_, i) => {
                  // 中央が高くなるようなパターン
                  const centerIndex = 15.5;
                  const distanceFromCenter = Math.abs(i - centerIndex);
                  const maxHeight = 100 - distanceFromCenter * 2;
                  
                  return (
                    <div
                      key={i}
                      className={clsx(
                        "w-2 rounded-full transition-all",
                        connectionState === "connected" ? getVisualizerColor(conversationState) : "bg-muted"
                      )}
                      style={{
                        height:
                          connectionState === "connected" && conversationState !== "idle"
                            ? `${Math.random() * maxHeight * 0.7 + 15}%`
                            : "8%",
                        transition: "height 0.08s ease-out",
                        opacity: connectionState === "connected" && conversationState !== "idle" ? 1 : 0.4,
                      }}
                    />
                  );
                })}
              </div>
              
              {/* Status text inside visualizer */}
              <div className="text-center mt-6">
                <p className={clsx(
                  "text-lg font-bold",
                  connectionState === "connected"
                    ? conversationState === "speaking"
                      ? "text-primary"
                      : conversationState === "listening"
                      ? "text-chart-2"
                      : "text-muted-foreground"
                    : "text-muted-foreground"
                )}>
                  {connectionState === "connected" 
                    ? conversationState === "listening" 
                      ? "🎙️ あなたの番です"
                      : conversationState === "speaking"
                      ? `🎧 ${getMcName()}が話しています`
                      : conversationState === "thinking"
                      ? "💭 考え中..."
                      : "準備中..."
                    : "🔌 接続中..."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Controls */}
      <div className="shrink-0 bg-background border-t border-border px-6 py-4 pb-8 z-50">
        <div className="flex items-center gap-3">
          <div className="flex-1 text-left">
            <p className="text-xs text-muted-foreground">発言数</p>
            <p className="text-lg font-bold text-foreground">{displayMessages.length}</p>
          </div>
          <button
            onClick={handleEndRecording}
            className="flex-[2] h-14 rounded-2xl bg-destructive text-white flex items-center justify-center gap-2 font-bold shadow-lg shadow-destructive/25 transition-transform active:scale-95"
          >
            <Icon icon="solar:square-bold" className="text-xl" />
            収録終了
          </button>
        </div>
      </div>
    </div>
  );
}
