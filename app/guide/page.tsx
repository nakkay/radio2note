"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";

export default function GuidePage() {
    const [activeTab, setActiveTab] = useState<"flow" | "tips">("flow");

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
                <h1 className="text-lg font-heading">ガイド</h1>
                <div className="size-11" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-32 scrollbar-hide">
                {/* Tab Switcher */}
                <div className="bg-muted p-1 rounded-xl flex mb-6">
                    <button
                        onClick={() => setActiveTab("flow")}
                        className={clsx(
                            "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                            activeTab === "flow" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        収録の流れ
                    </button>
                    <button
                        onClick={() => setActiveTab("tips")}
                        className={clsx(
                            "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                            activeTab === "tips" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        使い方のコツ
                    </button>
                </div>

                {activeTab === "flow" ? (
                    <div className="space-y-6">
                        <div className="relative pl-6 border-l-2 border-border/50">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                            <h3 className="font-bold text-lg mb-2 text-primary">1. テーマを決める</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                最初に「今日話したいこと」を入力します。MCに拾ってほしいキーワードがあれば、オプションで入力することもできます。
                            </p>
                        </div>
                        <div className="relative pl-6 border-l-2 border-border/50">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-chart-2 border-4 border-background" />
                            <h3 className="font-bold text-lg mb-2 text-chart-2">2. MCを選ぶ</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                あなたの話を聞いてくれるパートナーを選びます。元気なアキラ、聞き上手のユイなど、気分に合わせて選んでみましょう。
                            </p>
                        </div>
                        <div className="relative pl-6 border-l-2 border-border/50">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-destructive border-4 border-background" />
                            <h3 className="font-bold text-lg mb-2 text-destructive">3. 収録スタート</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                MCとの対話形式で進みます。「きっかけ」「わかったこと」「まとめ」の順に質問されるので、リラックスして答えてください。
                            </p>
                        </div>
                        <div className="relative pl-6 border-l-2 border-border/50">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-chart-1 border-4 border-background" />
                            <h3 className="font-bold text-lg mb-2 text-chart-1">4. 記事生成</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                収録が終わったら、記事の文体（一人称/三人称）を選びます。AIが自動的に会話を整理し、読みやすい記事を作成します。
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-card rounded-2xl p-5 border border-border/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                    <Icon icon="solar:chat-round-line-bold" className="text-xl" />
                                </div>
                                <h3 className="font-bold text-card-foreground">短く話してOK</h3>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                一度に長く話そうとせず、MCとのキャッチボールを楽しんでください。短い返答でもAIがうまく意図を汲み取ります。
                            </p>
                        </div>
                        <div className="bg-card rounded-2xl p-5 border border-border/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-chart-2/20 flex items-center justify-center text-chart-2">
                                    <Icon icon="solar:refresh-circle-bold" className="text-xl" />
                                </div>
                                <h3 className="font-bold text-card-foreground">言い直しも自然に</h3>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                噛んでしまったり、言い直したとしても大丈夫。AIが記事化する際に、不要な言葉は自動的にカットして整えます。
                            </p>
                        </div>
                        <div className="bg-card rounded-2xl p-5 border border-border/50">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-chart-4/20 flex items-center justify-center text-chart-4">
                                    <Icon icon="solar:magic-stick-3-bold" className="text-xl" />
                                </div>
                                <h3 className="font-bold text-card-foreground">トーンは後から変更可</h3>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                生成された記事の雰囲気が合わない場合は、トーンを選び直して再生成することができます。
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Start Action */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-4 pb-8 z-50">
                <Link
                    href="/setup"
                    className="w-full bg-primary text-primary-foreground h-14 rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 flex items-center justify-center gap-3 transition-transform active:scale-95"
                >
                    <Icon icon="solar:microphone-3-bold" className="text-2xl" />
                    収録を始める
                </Link>
            </div>
        </div>
    );
}
