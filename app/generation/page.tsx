"use client";

import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function GenerationPage() {
    const router = useRouter();
    const { user } = useAuth();
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

                setProgress(20);
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
                
                // 生成された記事を一時的にlocalStorageに保存（フォールバック用）
                localStorage.setItem("radio2note_article", data.article);
                localStorage.setItem("radio2note_articleTheme", theme);
                localStorage.setItem("radio2note_articleTone", tone);
                localStorage.setItem("radio2note_articleWordCount", data.wordCount.toString());

                setProgress(60);
                setStatus("タイトル画像を生成中...");

                // 記事の最初の段落をサマリーとして使用
                const articleLines = data.article.split("\n").filter((line: string) => line.trim());
                const articleSummary = articleLines.slice(0, 3).join(" ").substring(0, 200);

                let imageBase64 = null;
                let imageMimeType = "image/png";

                // タイトル画像を生成
                try {
                    const imageResponse = await fetch("/api/image/generate", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            title: theme,
                            articleSummary,
                        }),
                    });

                    if (imageResponse.ok) {
                        const imageData = await imageResponse.json();
                        if (imageData.success && imageData.imageBase64) {
                            imageBase64 = imageData.imageBase64;
                            imageMimeType = imageData.mimeType || "image/png";
                            // 一時的にlocalStorageにも保存（フォールバック用）
                            localStorage.setItem("radio2note_articleImage", imageBase64);
                            localStorage.setItem("radio2note_articleImageMimeType", imageMimeType);
                            console.log("🎨 タイトル画像を保存しました:", imageMimeType);
                        }
                    } else {
                        console.warn("画像生成に失敗しましたが、記事は正常に生成されました");
                    }
                } catch (imageError) {
                    console.warn("画像生成中にエラーが発生しましたが、記事は正常に生成されました:", imageError);
                }

                setProgress(80);
                setStatus("記事を保存中...");

                // 収録時間を取得（会話履歴は既に取得済み）
                const elapsedTime = parseInt(localStorage.getItem("radio2note_elapsedTime") || "0", 10);

                // Supabaseに記事を保存（失敗した場合はlocalStorageにフォールバック）
                try {
                    const saveResponse = await fetch("/api/articles", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            title: theme,
                            theme: theme,
                            content: data.article,
                            wordCount: data.wordCount,
                            image: imageBase64,
                            imageMimeType: imageMimeType,
                            conversationHistory: conversationHistory,
                            elapsedTime: elapsedTime,
                            tone: tone,
                            userId: user?.id || null, // ログインしている場合はユーザーIDを送信
                        }),
                    });

                    if (saveResponse.ok) {
                        const saveData = await saveResponse.json();
                        if (saveData.article) {
                            console.log("✅ Supabaseに記事を保存しました:", saveData.article.id);
                            // 記事IDを保存して記事ページに遷移
                            setTimeout(() => {
                                router.push(`/article?id=${saveData.article.id}`);
                            }, 500);
                            return;
                        }
                    } else {
                        const errorData = await saveResponse.json();
                        if (errorData.useLocalStorage) {
                            console.warn("⚠️ Supabaseが利用できないため、localStorageを使用します");
                        }
                    }
                } catch (saveError) {
                    console.warn("⚠️ 記事の保存に失敗しましたが、localStorageに保存済みです:", saveError);
                }

                setProgress(100);
                setStatus("完了！");

                // Supabaseに保存できなかった場合はlocalStorageから読み込む
                setTimeout(() => {
                    router.push("/article");
                }, 500);
            } catch (error: unknown) {
                console.error("Article generation error:", error);
                const errorMessage = error instanceof Error ? error.message : "不明なエラー";
                alert("記事生成中にエラーが発生しました: " + errorMessage);
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
