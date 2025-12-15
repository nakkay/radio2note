"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

// MC Data (実在のMCの話術分析に基づく架空のキャラクター)
const MC_LIST = [
    {
        id: "hikaru",
        name: "ヒカル",
        description: "鋭いツッコミと計算された間で話を引き出すMC",
        icon: "solar:star-bold",
        themeColor: "chart-1",
        tags: ["ツッコミ上手", "深掘り", "知的"],
        gradient: "from-chart-1/30 to-chart-2/30",
        borderColor: "border-chart-1/50",
        iconColor: "text-chart-1",
        tagBg: "bg-primary/20",
        tagText: "text-primary",
    },
    {
        id: "waka",
        name: "ワカ",
        description: "自己客観視と執拗な好奇心で本質を引き出すMC",
        icon: "solar:book-bold",
        themeColor: "chart-4",
        tags: ["論理的", "分析力", "好奇心"],
        gradient: "from-chart-4/30 to-chart-5/30",
        borderColor: "border-chart-4/50",
        iconColor: "text-chart-4",
        tagBg: "bg-chart-4/20",
        tagText: "text-chart-4",
    },
    {
        id: "kono",
        name: "コノ",
        description: "徹底した肯定と共感で話しやすい雰囲気を作るMC",
        icon: "solar:sun-bold",
        themeColor: "chart-2",
        tags: ["共感力", "優しい", "聞き上手"],
        gradient: "from-chart-2/30 to-chart-3/30",
        borderColor: "border-chart-2/50",
        iconColor: "text-chart-2",
        tagBg: "bg-chart-2/20",
        tagText: "text-chart-2",
    },
];

export default function McSelectionPage() {
    const router = useRouter();
    const [selectedMc, setSelectedMc] = useState<string | null>(null);

    const handleNext = () => {
        if (!selectedMc) return;
        localStorage.setItem("radio2note_mcId", selectedMc);
        router.push("/recording");
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">


            {/* Navigation Header */}
            <div className="px-6 py-4 flex items-center justify-between shrink-0">
                <Link
                    href="/setup"
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-32 scrollbar-hide">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary/20 border border-primary/40">
                        <Icon icon="solar:user-speak-bold" className="text-base text-primary mr-2" />
                        <span className="text-sm font-bold text-primary">STEP 2/3</span>
                    </div>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-heading tracking-tight text-center mb-3 text-foreground">
                        MCキャラクターを
                        <br />
                        選択してください
                    </h1>
                    <p className="text-center text-sm text-muted-foreground">
                        あなたの話を引き出すMCを選びましょう
                    </p>
                </div>

                <div className="space-y-4">
                    {MC_LIST.map((mc) => (
                        <button
                            key={mc.id}
                            onClick={() => setSelectedMc(mc.id)}
                            className={clsx(
                                "w-full bg-card rounded-2xl p-5 border transition-all active:scale-98 hover:border-primary/50 text-left relative",
                                selectedMc === mc.id ? "border-primary ring-1 ring-primary" : "border-border"
                            )}
                        >
                            <div className="flex items-start gap-4">
                                <div className="shrink-0">
                                    <div
                                        className={clsx(
                                            "w-16 h-16 rounded-full bg-gradient-to-br border-2 flex items-center justify-center",
                                            mc.gradient,
                                            mc.borderColor
                                        )}
                                    >
                                        <Icon icon={mc.icon} className={clsx("text-3xl", mc.iconColor)} />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold mb-1 text-card-foreground">{mc.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-2">{mc.description}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {mc.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className={clsx(
                                                    "text-xs px-2 py-1 rounded-full",
                                                    mc.tagBg,
                                                    mc.tagText
                                                )}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="shrink-0 flex items-center h-full pt-1">
                                    {selectedMc === mc.id ? (
                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                            <Icon icon="solar:check-read-linear" className="text-primary-foreground text-lg" />
                                        </div>
                                    ) : (
                                        <Icon icon="solar:arrow-right-linear" className="text-2xl text-muted-foreground" />
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="bg-card rounded-2xl p-4 border border-border/50 flex gap-3 mt-6">
                    <div className="shrink-0 mt-0.5">
                        <Icon icon="solar:lightbulb-bolt-bold" className="text-xl text-chart-1" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold mb-1 text-card-foreground">ヒント</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            MCによって引き出される話の雰囲気が変わります。話しやすそうなMCを選んでみてください。
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Action */}
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
                    disabled={!selectedMc}
                    className={clsx(
                        "w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-transform active:scale-95",
                        selectedMc
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                >
                    {selectedMc ? "次へ" : "MCを選択してください"}
                </button>
            </div>
        </div>
    );
}
