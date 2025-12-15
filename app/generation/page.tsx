"use client";

import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function GenerationPage() {
    const router = useRouter();
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("会話を分析中...");

    useEffect(() => {
        const generateArticle = async () => {
            try {
                // ローカルストレージからデータを取得
                const conversationStr = localStorage.getItem("radio2note_conversation");
                const theme = localStorage.getItem("radio2note_theme") || "";
                const tone = localStorage.getItem("radio2note_tone") || "first";

                if (!conversationStr) {
                    alert("会話データが見つかりません。収録からやり直してください。");
                    router.push("/setup");
                    return;
                }

                const conversationHistory = JSON.parse(conversationStr);
                console.log("📝 会話データ:", conversationHistory.length, "件");
                console.log("📝 会話内容:", JSON.stringify(conversationHistory, null, 2));
                
                if (conversationHistory.length === 0) {
                    alert("会話が記録されていません。もう一度収録してください。");
                    router.push("/setup");
                    return;
                }

                setProgress(30);
                setStatus("記事を生成中...");

                const response = await fetch("/api/article/generate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        conversationHistory,
                        theme,
                        tone,
                    }),
                });

                if (!response.ok) {
                    throw new Error("記事生成に失敗しました");
                }

                const data = await response.json();
                
                setProgress(100);
                setStatus("完了！");

                // 生成された記事を保存
                localStorage.setItem("radio2note_article", data.article);
                localStorage.setItem("radio2note_articleTheme", theme);
                localStorage.setItem("radio2note_articleTone", tone);
                localStorage.setItem("radio2note_articleWordCount", data.wordCount.toString());

                // 記事ページに遷移
                setTimeout(() => {
                    router.push("/article");
                }, 500);
            } catch (error: any) {
                console.error("Article generation error:", error);
                alert("記事生成中にエラーが発生しました: " + error.message);
                router.push("/tone");
            }
        };

        generateArticle();
    }, [router]);

    return (
        <div className="flex flex-col h-full bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground items-center justify-center px-6">
            <div className="bg-card rounded-2xl p-8 border border-border/50 text-center w-full max-w-md shadow-2xl shadow-primary/10">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                    <Icon icon="solar:soundwave-bold" className="text-4xl text-primary animate-pulse" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-card-foreground">記事を生成中...</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    {status}
                    <br />
                    しばらくお待ちください
                </p>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-300 origin-left"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{progress}%</p>
            </div>
        </div>
    );
}
