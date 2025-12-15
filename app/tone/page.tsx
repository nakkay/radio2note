"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export default function TonePage() {
    const router = useRouter();
    const [selectedTone, setSelectedTone] = useState<"first" | "dialogue">("first");

    const handleNext = () => {
        localStorage.setItem("radio2note_tone", selectedTone);
        router.push("/generation");
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
            <div className="px-6 py-4 flex items-center justify-between shrink-0">
                <Link
                    href="/recording"
                    className="flex items-center justify-center size-11 rounded-full bg-card border border-border/50 transition-transform active:scale-95"
                >
                    <Icon icon="solar:arrow-left-linear" className="text-2xl" />
                </Link>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-border" />
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="w-2 h-2 rounded-full bg-border" />
                </div>
                <div className="size-11" />
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-32 scrollbar-hide">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary/20 border border-primary/40">
                        <Icon icon="solar:pen-new-round-bold" className="text-base text-primary mr-2" />
                        <span className="text-sm font-bold text-primary">STEP 2/3</span>
                    </div>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-heading tracking-tight text-center mb-3 text-foreground">
                        記事のトーンを
                        <br />
                        選択してください
                    </h1>
                    <p className="text-center text-sm text-muted-foreground">
                        読者に合わせた最適な文体を選びましょう
                    </p>
                </div>

                <div className="flex items-center justify-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-chart-2/30 border-2 border-primary/50 flex items-center justify-center">
                        <Icon icon="solar:document-text-bold" className="text-4xl text-primary" />
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <button
                        onClick={() => setSelectedTone("first")}
                        className={clsx(
                            "w-full bg-card rounded-2xl p-6 transition-transform active:scale-95 shadow-sm border-2 text-left",
                            selectedTone === "first" ? "border-primary" : "border-border"
                        )}
                    >
                        <div className="flex items-start gap-4">
                            <div className="shrink-0">
                                <div
                                    className={clsx(
                                        "w-12 h-12 rounded-full flex items-center justify-center border",
                                        selectedTone === "first"
                                            ? "bg-primary/20 border-primary/40 text-primary"
                                            : "bg-muted border-border text-muted-foreground"
                                    )}
                                >
                                    <Icon icon="solar:user-speak-bold" className="text-2xl" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-card-foreground mb-2">一人称（私）</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    親しみやすく、個人的な体験を伝えるスタイル。読者との距離が近い印象を与えます。
                                </p>
                                {selectedTone === "first" && (
                                    <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
                                        <Icon icon="solar:check-circle-bold" className="text-base text-primary mr-1.5" />
                                        <span className="text-xs font-bold text-primary">選択中</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => setSelectedTone("dialogue")}
                        className={clsx(
                            "w-full bg-card rounded-2xl p-6 transition-transform active:scale-95 shadow-sm border-2 text-left",
                            selectedTone === "dialogue" ? "border-primary" : "border-border"
                        )}
                    >
                        <div className="flex items-start gap-4">
                            <div className="shrink-0">
                                <div
                                    className={clsx(
                                        "w-12 h-12 rounded-full flex items-center justify-center border",
                                        selectedTone === "dialogue"
                                            ? "bg-primary/20 border-primary/40 text-primary"
                                            : "bg-muted border-border text-muted-foreground"
                                    )}
                                >
                                    <Icon icon="solar:chat-round-dots-bold" className="text-2xl" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-card-foreground mb-2">対談形式</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    MCとゲストの会話形式で構成。ラジオ番組のような臨場感のある記事になります。
                                </p>
                                {selectedTone === "dialogue" && (
                                    <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
                                        <Icon icon="solar:check-circle-bold" className="text-base text-primary mr-1.5" />
                                        <span className="text-xs font-bold text-primary">選択中</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>
                </div>

                <div className="bg-card rounded-2xl p-4 border border-border/50 flex gap-3 mb-6">
                    <div className="shrink-0 mt-0.5">
                        <Icon icon="solar:lightbulb-bolt-bold" className="text-xl text-chart-1" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold mb-1 text-card-foreground">ヒント</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            一人称はエッセイ風に、対談形式はラジオ番組のトーク風になります。
                        </p>
                    </div>
                </div>
            </div>

            <div 
                className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-4 pb-8 z-[9999]"
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)',
                    willChange: 'transform',
                }}
            >
                <button
                    onClick={handleNext}
                    className="w-full bg-primary text-primary-foreground h-14 rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 flex items-center justify-center gap-3 transition-transform active:scale-95"
                >
                    次へ
                    <Icon icon="solar:arrow-right-linear" className="text-2xl" />
                </button>
            </div>
        </div>
    );
}
