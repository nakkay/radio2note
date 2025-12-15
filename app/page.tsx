"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface SavedArticle {
  id: string;
  title: string;
  theme: string;
  createdAt: string;
  wordCount: number;
}

export default function Home() {
  const [recentArticles, setRecentArticles] = useState<SavedArticle[]>([]);

  useEffect(() => {
    // localStorageから記事一覧を取得
    const savedArticles = localStorage.getItem("radio2note_articles");
    if (savedArticles) {
      try {
        const articles: SavedArticle[] = JSON.parse(savedArticles);
        // 最新3件を取得
        setRecentArticles(articles.slice(0, 3));
      } catch {
        // パースエラーは無視
      }
    }
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

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">


      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        {/* Header Section */}
        <div className="px-6 pt-6 pb-4">
          <div className="inline-flex items-center justify-center px-3 py-1 mb-3 rounded-full bg-destructive/20 border border-destructive/40">
            <div className="w-2 h-2 rounded-full bg-destructive mr-2 animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-destructive uppercase">
              ON AIR
            </span>
          </div>
          <div className="relative mb-2">
            <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
              <div
                className="flex flex-wrap gap-3 text-xs font-bold text-primary/40 tracking-wider"
                style={{ transform: "translateY(-8px)" }}
              >
                <span>R2N</span>
                <span>R2N</span>
                <span>R2N</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-bold text-primary/40 tracking-wider mt-1">
                <span>R2N</span>
                <span>R2N</span>
                <span>R2N</span>
              </div>
            </div>
            <h1 className="relative text-3xl font-heading tracking-tight text-primary">
              Radio2Note
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            話すだけでnote記事が完成
          </p>
        </div>

        {/* Hero Image */}
        <div className="relative w-full h-56 mb-6 px-6">
          <div className="w-full h-full rounded-3xl overflow-hidden relative shadow-2xl shadow-primary/10 border border-border/50">
            <img
              src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80"
              alt="Vintage Radio Microphone"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
            <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md rounded-2xl p-3 border border-border/50 shadow-lg">
              <Icon icon="solar:soundwave-bold" className="text-2xl text-primary" />
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="px-6 mb-8">
          <Link
            href="/setup"
            className="w-full bg-primary text-primary-foreground h-16 rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 flex items-center justify-center gap-3 transition-transform active:scale-95"
          >
            <div className="bg-primary-foreground/10 p-2 rounded-full">
              <Icon icon="solar:microphone-3-bold" className="text-2xl" />
            </div>
            収録を始める
          </Link>
          <p className="text-center text-xs text-muted-foreground mt-3">
            タップしてインタビューを開始します
          </p>
        </div>

        {/* Menu Grid - 過去の記事を削除 */}
        <div className="px-6 mb-8">
          <h2 className="text-lg font-heading mb-4 text-foreground/90">
            メニュー
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/guide" className="bg-card hover:bg-card/80 transition-colors p-4 rounded-2xl border border-border/50 flex flex-col gap-2 group">
              <div className="w-10 h-10 rounded-full bg-chart-2/20 flex items-center justify-center text-chart-2 group-hover:scale-110 transition-transform">
                <Icon icon="solar:list-check-bold" className="text-xl" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-card-foreground">
                  収録の流れ
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  初めての方へ
                </p>
              </div>
            </Link>
            <Link href="/guide" className="bg-card hover:bg-card/80 transition-colors p-4 rounded-2xl border border-border/50 flex flex-col gap-2 group">
              <div className="w-10 h-10 rounded-full bg-chart-4/20 flex items-center justify-center text-chart-4 group-hover:scale-110 transition-transform">
                <Icon icon="solar:book-bookmark-bold" className="text-xl" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-card-foreground">
                  使い方ガイド
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  便利な機能紹介
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Latest Articles - 最新3件表示 */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading text-foreground/90">
              最新の記事
            </h2>
            <Link href="/articles" className="text-xs text-primary font-medium">
              すべて見る
            </Link>
          </div>
          
          {recentArticles.length > 0 ? (
            <div className="space-y-3">
              {recentArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/article?id=${article.id}`}
                  className="bg-card rounded-2xl p-4 border border-border/50 flex gap-4 items-center hover:bg-card/80 transition-colors"
                >
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
                    <h4 className="font-bold text-sm truncate pr-2">
                      {article.theme || "無題の記事"}
                    </h4>
                  </div>
                  <Icon
                    icon="solar:alt-arrow-right-linear"
                    className="text-lg text-muted-foreground shrink-0"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
              <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                <Icon icon="solar:document-add-linear" className="text-xl text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                まだ記事がありません
              </p>
              <Link
                href="/setup"
                className="inline-flex items-center gap-2 text-sm text-primary font-medium"
              >
                <Icon icon="solar:microphone-3-bold" className="text-base" />
                収録を始める
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation - Fixed */}
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-border px-6 py-3 flex items-center justify-around"
        style={{ 
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          zIndex: 9999,
        }}
      >
        <button className="flex flex-col items-center gap-1 w-16 text-primary">
          <Icon icon="solar:home-2-bold" className="text-2xl" />
          <span className="text-[10px] font-medium">ホーム</span>
        </button>
        <Link href="/setup" className="flex flex-col items-center gap-1 w-16 text-muted-foreground hover:text-foreground transition-colors">
          <Icon icon="solar:microphone-3-linear" className="text-2xl" />
          <span className="text-[10px] font-medium">収録</span>
        </Link>
        <Link href="/articles" className="flex flex-col items-center gap-1 w-16 text-muted-foreground hover:text-foreground transition-colors">
          <Icon icon="solar:file-text-linear" className="text-2xl" />
          <span className="text-[10px] font-medium">記事一覧</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-1 w-16 text-muted-foreground hover:text-foreground transition-colors">
          <Icon icon="solar:settings-linear" className="text-2xl" />
          <span className="text-[10px] font-medium">設定</span>
        </Link>
      </nav>
    </div>
  );
}
