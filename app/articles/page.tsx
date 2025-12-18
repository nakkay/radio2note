"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface SavedArticle {
    id: string;
    title: string;
    theme: string;
    content: string;
    createdAt: string;
    wordCount: number;
}

export default function ArticlesPage() {
    const { user } = useAuth();
    const [articles, setArticles] = useState<SavedArticle[]>([]);

    useEffect(() => {
        const loadArticles = async () => {
            try {
                // Supabaseから記事一覧を取得（ログインしている場合はユーザーIDを指定）
                const url = user?.id 
                    ? `/api/articles?userId=${user.id}` 
                    : "/api/articles";
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.articles) {
                        // Supabaseのデータ形式をフロントエンドの形式に変換
                        const formattedArticles = data.articles.map((a: any) => ({
                            id: a.id,
                            title: a.title,
                            theme: a.theme || a.title,
                            content: a.content,
                            createdAt: a.created_at,
                            wordCount: a.word_count || 0,
                        }));
                        setArticles(formattedArticles);
                        return; // Supabaseから取得できたので終了
                    }
                } else {
                    const errorData = await response.json();
                    if (errorData.useLocalStorage) {
                        console.warn("⚠️ Supabaseが利用できないため、localStorageから読み込みます");
                    }
                }
            } catch (error) {
                console.warn("⚠️ Supabaseからの取得に失敗しました。localStorageから読み込みます:", error);
            }

            // Supabaseから取得できなかった場合はlocalStorageから読み込む
            const savedArticles = localStorage.getItem("radio2note_articles");
            if (savedArticles) {
                try {
                    setArticles(JSON.parse(savedArticles));
                } catch {
                    setArticles([]);
                }
            }
        };

        loadArticles();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return "たった今";
        if (diffHours < 24) return `${diffHours}時間前`;
        if (diffDays < 7) return `${diffDays}日前`;
        return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("この記事を削除しますか？")) return;
        
        try {
            // Supabaseから削除を試みる
            const response = await fetch(`/api/articles/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                // Supabaseから削除できた場合は、ローカルの状態を更新
                const updatedArticles = articles.filter(a => a.id !== id);
                setArticles(updatedArticles);
                console.log("✅ Supabaseから記事を削除しました");
                return;
            } else {
                const errorData = await response.json();
                if (errorData.useLocalStorage) {
                    console.warn("⚠️ Supabaseが利用できないため、localStorageから削除します");
                }
            }
        } catch (error) {
            console.warn("⚠️ Supabaseからの削除に失敗しました。localStorageから削除します:", error);
        }

        // Supabaseから削除できなかった場合はlocalStorageから削除
        const updatedArticles = articles.filter(a => a.id !== id);
        setArticles(updatedArticles);
        localStorage.setItem("radio2note_articles", JSON.stringify(updatedArticles));
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">

            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between shrink-0">
                <Link
                    href="/"
                    className="flex items-center justify-center size-11 rounded-full bg-card border border-border/50 transition-transform active:scale-95"
                >
                    <Icon icon="solar:arrow-left-linear" className="text-2xl" />
                </Link>
                <h1 className="text-lg font-heading font-bold text-foreground">記事一覧</h1>
                <div className="size-11" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-32 scrollbar-hide">
                {articles.length > 0 ? (
                    <div className="space-y-4">
                        {articles.map((article) => (
                            <div
                                key={article.id}
                                className="bg-card rounded-2xl p-4 border border-border/50 hover:border-primary/50 transition-colors shadow-sm"
                            >
                                <div className="flex gap-4 items-center">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                        <Icon icon="solar:document-text-bold" className="text-xl text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] text-muted-foreground">
                                                {formatDate(article.createdAt)}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {article.wordCount.toLocaleString()}字
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-sm truncate pr-2 text-card-foreground">
                                            {article.theme || "無題の記事"}
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/article?id=${article.id}`}
                                            className="h-8 w-8 flex items-center justify-center rounded-full bg-background border border-border text-foreground hover:bg-muted transition-colors"
                                        >
                                            <Icon icon="solar:eye-linear" className="text-base" />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(article.id)}
                                            className="h-8 w-8 flex items-center justify-center rounded-full bg-background border border-border text-destructive hover:bg-destructive/10 transition-colors"
                                        >
                                            <Icon icon="solar:trash-bin-trash-linear" className="text-base" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Icon icon="solar:document-add-linear" className="text-3xl text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">まだ記事がありません</h3>
                        <p className="text-sm text-muted-foreground text-center mb-6">
                            収録を始めて、最初の記事を作成しましょう
                        </p>
                        <Link
                            href="/setup"
                            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold transition-transform active:scale-95"
                        >
                            <Icon icon="solar:microphone-3-bold" className="text-lg" />
                            収録を始める
                        </Link>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav 
                className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-border px-6 py-3 flex items-center justify-around"
                style={{ 
                    paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
                    zIndex: 9999,
                }}
            >
                <Link href="/" className="flex flex-col items-center gap-1 w-16 text-muted-foreground hover:text-foreground transition-colors">
                    <Icon icon="solar:home-2-linear" className="text-2xl" />
                    <span className="text-[10px] font-medium">ホーム</span>
                </Link>
                <Link href="/setup" className="flex flex-col items-center gap-1 w-16 text-muted-foreground hover:text-foreground transition-colors">
                    <Icon icon="solar:microphone-3-linear" className="text-2xl" />
                    <span className="text-[10px] font-medium">収録</span>
                </Link>
                <button className="flex flex-col items-center gap-1 w-16 text-primary">
                    <Icon icon="solar:file-text-bold" className="text-2xl" />
                    <span className="text-[10px] font-medium">記事一覧</span>
                </button>
                <Link href="/settings" className="flex flex-col items-center gap-1 w-16 text-muted-foreground hover:text-foreground transition-colors">
                    <Icon icon="solar:settings-linear" className="text-2xl" />
                    <span className="text-[10px] font-medium">設定</span>
                </Link>
            </nav>
        </div>
    );
}
