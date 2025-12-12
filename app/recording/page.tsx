"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useGeminiLive, ConversationState } from "../hooks/useGeminiLive";

const STEPS = [
  { id: 1, label: "テーマ発表" },
  { id: 2, label: "きっかけ" },
  { id: 3, label: "わかったこと" },
  { id: 4, label: "まとめ" },
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
  const [userInput, setUserInput] = useState("");
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const [showTextInput, setShowTextInput] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Gemini Live フック
  const {
    connectionState,
    conversationState,
    messages,
    isAudioEnabled,
    setIsAudioEnabled,
    connect,
    disconnect,
    sendTextMessage,
  } = useGeminiLive({
    mcId,
    theme,
    memo,
    onMessage: (text, isUser) => {
      setDisplayMessages((prev) => [
        ...prev,
        { role: isUser ? "user" : "assistant", content: text, timestamp: Date.now() },
      ]);

      // ステップ進行
      if (!isUser) {
        const msgCount = displayMessages.length + 1;
        if (msgCount >= 6 && currentStep === 1) setCurrentStep(2);
        else if (msgCount >= 12 && currentStep === 2) setCurrentStep(3);
        else if (msgCount >= 18 && currentStep === 3) setCurrentStep(4);
      }
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

  // theme と mcId が設定されたら接続開始
  useEffect(() => {
    if (theme && mcId && connectionState === "disconnected") {
      connect();
      startTimeRef.current = Date.now();
    }
  }, [theme, mcId, connectionState, connect]);

  // タイマー
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

  // メッセージ表示の自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  const handleEndRecording = () => {
    disconnect();
    localStorage.setItem("radio2note_conversation", JSON.stringify(displayMessages));
    localStorage.setItem("radio2note_elapsedTime", elapsedTime.toString());
    router.push("/tone");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      sendTextMessage(userInput);
      setUserInput("");
    }
  };

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

  const getStateLabel = (state: ConversationState) => {
    switch (state) {
      case "listening":
        return "LISTENING";
      case "thinking":
        return "THINKING";
      case "speaking":
        return "SPEAKING";
      default:
        return "CONNECTING";
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
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className={clsx(
              "flex items-center justify-center size-11 rounded-full border transition-colors",
              showTextInput
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-card border-border/50 text-muted-foreground"
            )}
            title="テキスト入力に切り替え"
          >
            <Icon icon="solar:keyboard-bold" className="text-xl" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6 scrollbar-hide">
        {/* Header Status */}
        <div className="px-6 pt-2 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div
              className={clsx(
                "inline-flex items-center justify-center px-3 py-1 rounded-full border",
                connectionState === "connected"
                  ? conversationState === "speaking"
                    ? "bg-primary/20 border-primary/40"
                    : conversationState === "listening"
                    ? "bg-chart-2/20 border-chart-2/40"
                    : "bg-chart-4/20 border-chart-4/40"
                  : "bg-muted/20 border-border/40"
              )}
            >
              <div
                className={clsx(
                  "w-2 h-2 rounded-full mr-2 animate-pulse",
                  connectionState === "connected"
                    ? conversationState === "speaking"
                      ? "bg-primary"
                      : conversationState === "listening"
                      ? "bg-chart-2"
                      : "bg-chart-4"
                    : "bg-muted-foreground"
                )}
              />
              <span
                className={clsx(
                  "text-xs font-bold tracking-widest uppercase",
                  connectionState === "connected"
                    ? conversationState === "speaking"
                      ? "text-primary"
                      : conversationState === "listening"
                      ? "text-chart-2"
                      : "text-chart-4"
                    : "text-muted-foreground"
                )}
              >
                {connectionState === "connected" ? getStateLabel(conversationState) : connectionState.toUpperCase()}
              </span>
            </div>
            <div className="text-xl font-bold font-heading text-primary">{formatTime(elapsedTime)}</div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-start justify-between gap-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="contents">
                <div className="flex flex-col items-center gap-2 z-10">
                  <div
                    className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                      currentStep >= step.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-border text-muted-foreground"
                    )}
                  >
                    {step.id}
                  </div>
                  <span
                    className={clsx(
                      "text-[10px] font-medium text-center leading-tight whitespace-pre-wrap",
                      currentStep >= step.id ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {step.label.replace(" ", "\n")}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={clsx(
                      "flex-1 h-0.5 mt-5 transition-colors",
                      currentStep > step.id ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Visualizer */}
        <div className="px-6 mb-8">
          <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-2xl shadow-primary/5">
            <div className="flex items-end justify-center gap-1 h-32">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={clsx(
                    "w-1 rounded-full transition-all duration-150",
                    connectionState === "connected" ? getVisualizerColor(conversationState) : "bg-muted"
                  )}
                  style={{
                    height:
                      connectionState === "connected" && conversationState !== "idle"
                        ? `${Math.random() * 60 + 20}%`
                        : "20%",
                    animationDelay: `${i * 0.1}s`,
                    transition: "height 0.15s ease-out",
                  }}
                />
              ))}
            </div>
            <div className="text-center mt-4">
              <p className="text-xs text-muted-foreground">
                {conversationState === "listening" && "マイクで話してください..."}
                {conversationState === "thinking" && "考え中..."}
                {conversationState === "speaking" && "MCが話しています"}
                {conversationState === "idle" && connectionState === "connecting" && "接続中..."}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="px-6 space-y-4 mb-6">
          {displayMessages.map((msg, index) => (
            <div
              key={index}
              className={clsx("flex items-start gap-4", msg.role === "assistant" ? "" : "flex-row-reverse")}
            >
              {msg.role === "assistant" && (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
                  <Icon icon="solar:microphone-3-bold" className="text-3xl text-primary-foreground" />
                </div>
              )}
              <div
                className={clsx(
                  "flex-1 rounded-2xl p-4 border",
                  msg.role === "assistant" ? "bg-card border-border/50" : "bg-secondary/50 border-border/30"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-primary">Radio2Note</span>
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="flex items-center gap-2 mb-2">
                    <Icon icon="solar:user-bold" className="text-base text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground">あなた</span>
                  </div>
                )}
                <p
                  className={clsx(
                    "text-sm leading-relaxed",
                    msg.role === "assistant" ? "text-card-foreground" : "text-foreground/90"
                  )}
                >
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Text Input (Optional) */}
        {showTextInput && connectionState === "connected" && (
          <div className="px-6 mb-6">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="テキストで入力..."
                className="flex-1 px-4 py-3 rounded-2xl border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={!userInput.trim()}
                className={clsx(
                  "px-6 py-3 rounded-2xl font-bold transition-transform active:scale-95",
                  userInput.trim()
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                送信
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="shrink-0 bg-background border-t border-border px-6 py-4 pb-8 z-50">
        <button
          onClick={handleEndRecording}
          className="w-full h-14 rounded-2xl bg-destructive text-white flex items-center justify-center gap-2 font-bold shadow-lg shadow-destructive/25 transition-transform active:scale-95"
        >
          <Icon icon="solar:square-bold" className="text-xl" />
          収録終了
        </button>
      </div>
    </div>
  );
}
