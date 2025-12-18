"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export default function ArticlePage() {
    const router = useRouter();
    const [article, setArticle] = useState("");
    const [theme, setTheme] = useState("");
    const [elapsedTime, setElapsedTime] = useState("");
    const [wordCount, setWordCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const [titleImage, setTitleImage] = useState<string | null>(null);
    const [titleImageMimeType, setTitleImageMimeType] = useState<string>("image/png");

    useEffect(() => {
        const savedArticle = localStorage.getItem("radio2note_article");
        const savedTheme = localStorage.getItem("radio2note_articleTheme");
        const savedElapsedTime = localStorage.getItem("radio2note_elapsedTime");
        const savedWordCount = localStorage.getItem("radio2note_articleWordCount");
        const savedImage = localStorage.getItem("radio2note_articleImage");

        if (!savedArticle) {
            alert("記事が見つかりません。記事生成からやり直してください。");
            router.push("/setup");
            return;
        }

        setArticle(savedArticle);
        setTheme(savedTheme || "");
        setElapsedTime(savedElapsedTime || "0");
        const wc = parseInt(savedWordCount || "0", 10);
        setWordCount(wc);
        
        // タイトル画像があれば設定
        if (savedImage) {
            setTitleImage(savedImage);
            const savedMimeType = localStorage.getItem("radio2note_articleImageMimeType");
            if (savedMimeType) {
                setTitleImageMimeType(savedMimeType);
            }
        }

        // 記事一覧に保存（重複チェック）
        const articleId = `article_${Date.now()}`;
        const savedMimeType = localStorage.getItem("radio2note_articleImageMimeType");
        const newArticle = {
            id: articleId,
            title: savedTheme || "無題の記事",
            theme: savedTheme || "",
            content: savedArticle,
            createdAt: new Date().toISOString(),
            wordCount: wc,
            image: savedImage || null,
            imageMimeType: savedMimeType || "image/png",
        };

        const existingArticles = localStorage.getItem("radio2note_articles");
        let articles = [];
        if (existingArticles) {
            try {
                articles = JSON.parse(existingArticles);
            } catch {
                articles = [];
            }
        }

        // 同じ内容の記事が最近保存されていないかチェック（5分以内の同じテーマ）
        const recentDuplicate = articles.find((a: { theme: string; createdAt: string }) => {
            const timeDiff = Date.now() - new Date(a.createdAt).getTime();
            return a.theme === savedTheme && timeDiff < 5 * 60 * 1000;
        });

        if (!recentDuplicate) {
            articles.unshift(newArticle); // 先頭に追加
            localStorage.setItem("radio2note_articles", JSON.stringify(articles));
            console.log("📝 記事を保存しました:", newArticle.title);
        }
    }, [router]);

    const formatTime = (seconds: string) => {
        const secs = parseInt(seconds, 10);
        const mins = Math.floor(secs / 60);
        const secsRemainder = secs % 60;
        return `${mins}:${secsRemainder.toString().padStart(2, "0")}`;
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(article);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
            alert("コピーに失敗しました");
        }
    };

    const handleDownloadImage = () => {
        if (!titleImage) {
            alert("画像がありません");
            return;
        }

        try {
            // Base64データをBlobに変換
            const base64Data = titleImage;
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: titleImageMimeType });

            // ファイル名を生成（テーマから）
            const sanitizedTheme = (theme || "article-image")
                .replace(/[^\w\s-]/g, "")
                .replace(/\s+/g, "-")
                .substring(0, 50);
            const extension = titleImageMimeType === "image/jpeg" ? "jpg" : "png";
            const filename = `${sanitizedTheme}.${extension}`;

            // ダウンロードリンクを作成してクリック
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to download image:", error);
            alert("画像のダウンロードに失敗しました");
        }
    };

    // 記事をHTMLとして表示（改行を保持）
    const formatArticle = (text: string) => {
        return text.split("\n").map((line, index) => {
            if (line.trim() === "") {
                return <br key={index} />;
            }
            // 見出しの判定（簡易版）
            if (line.match(/^#{1,3}\s/)) {
                const level = line.match(/^#+/)?.[0].length || 1;
                const content = line.replace(/^#+\s/, "");
                const HeadingTag = `h${Math.min(level + 2, 4)}` as keyof JSX.IntrinsicElements;
                return (
                    <HeadingTag key={index} className="text-xl font-heading mt-8 mb-4">
                        {content}
                    </HeadingTag>
                );
            }
            return (
                <p key={index} className="mb-4">
                    {line}
                </p>
            );
        });
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">

            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <Link href="/" className="flex items-center justify-center size-10 rounded-full hover:bg-muted transition-colors">
                    <Icon icon="solar:arrow-left-linear" className="text-2xl" />
                </Link>
                <h1 className="text-lg font-heading">記事プレビュー</h1>
                <button className="flex items-center justify-center size-10 rounded-full hover:bg-muted transition-colors">
                    <Icon icon="solar:share-bold" className="text-xl text-primary" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-40 scrollbar-hide">
                {/* タイトル画像 */}
                {titleImage && (
                    <div className="w-full aspect-video bg-muted overflow-hidden relative group">
                        <img 
                            src={`data:${titleImageMimeType};base64,${titleImage}`}
                            alt={theme || "記事のタイトル画像"}
                            className="w-full h-full object-cover"
                        />
                        <button
                            onClick={handleDownloadImage}
                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background/90 backdrop-blur-sm rounded-full p-2 shadow-lg"
                            title="画像をダウンロード"
                        >
                            <Icon icon="solar:download-bold" className="text-xl text-foreground" />
                        </button>
                    </div>
                )}
                
                <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-bold bg-primary/20 text-primary px-3 py-1 rounded-full">
                            公開準備完了
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {new Date().toLocaleDateString("ja-JP")}
                        </span>
                    </div>
                    <h2 className="text-2xl font-heading mb-3 leading-tight">
                        {theme || "記事タイトル"}
                    </h2>
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
                        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                            <Icon icon="solar:user-circle-bold" className="w-full h-full text-muted-foreground opacity-50" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">あなた</p>
                            <p className="text-xs text-muted-foreground">
                                収録時間: {formatTime(elapsedTime)}
                                {wordCount > 0 && ` | 文字数: ${wordCount.toLocaleString()}字`}
                            </p>
                        </div>
                    </div>
                    <div className="prose prose-invert max-w-none text-foreground/90 leading-relaxed">
                        {formatArticle(article)}
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-4 pb-8 z-50">
                <button
                    onClick={handleCopy}
                    className={clsx(
                        "w-full h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/25 flex items-center justify-center gap-3 transition-transform active:scale-95 mb-3",
                        copied ? "bg-chart-2 text-white" : "bg-primary text-primary-foreground"
                    )}
                >
                    <Icon icon={copied ? "solar:check-circle-bold" : "solar:copy-bold"} className="text-xl" />
                    {copied ? "コピーしました！" : "記事をコピー"}
                </button>
                <p className="text-center text-xs text-muted-foreground">noteにペーストして公開できます</p>
            </div>
        </div>
    );
}
