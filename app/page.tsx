"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">


      <div className="flex-1 overflow-y-auto pb-6 scrollbar-hide">
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

        {/* Menu Grid */}
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
            <Link href="/articles" className="bg-card hover:bg-card/80 transition-colors p-4 rounded-2xl border border-border/50 flex flex-col gap-2 group col-span-2">
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-full bg-chart-1/20 flex items-center justify-center text-chart-1 group-hover:scale-110 transition-transform">
                  <Icon icon="solar:file-text-bold" className="text-xl" />
                </div>
                <Icon
                  icon="solar:alt-arrow-right-linear"
                  className="text-xl text-muted-foreground"
                />
              </div>
              <div>
                <h3 className="font-bold text-sm text-card-foreground">
                  過去の記事
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  作成した記事の履歴と編集
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Latest Article Mock */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading text-foreground/90">
              最新の記事
            </h2>
            <Link href="/articles" className="text-xs text-primary font-medium">
              すべて見る
            </Link>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border/50 flex gap-4 items-center">
            <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0">
              <img
                src="https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=400&q=80"
                alt="Office"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  下書き
                </span>
                <span className="text-[10px] text-muted-foreground">
                  2時間前
                </span>
              </div>
              <h4 className="font-bold text-sm truncate pr-2">
                週末のカフェ巡りについて
              </h4>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                インタビュー収録時間: 12:45
              </p>
            </div>
            <button className="h-8 w-8 flex items-center justify-center rounded-full bg-background border border-border text-foreground">
              <Icon icon="solar:pen-new-square-linear" className="text-base" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="shrink-0 bg-background border-t border-border px-6 py-2 pb-6 flex items-center justify-between z-50">
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
      </div>
    </div>
  );
}
