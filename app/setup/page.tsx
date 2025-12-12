"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
    const router = useRouter();
    const [theme, setTheme] = useState("");
    const [memo, setMemo] = useState("");

    // ローカルストレージからデータを読み込む
    useEffect(() => {
        const savedTheme = localStorage.getItem("radio2note_theme");
        const savedMemo = localStorage.getItem("radio2note_memo");
        if (savedTheme) setTheme(savedTheme);
        if (savedMemo) setMemo(savedMemo);
    }, []);

    const handleNext = () => {
        if (!theme.trim()) {
            alert("トークテーマを入力してください");
            return;
        }

        if (theme.length > 30) {
            alert("トークテーマは30文字以内で入力してください");
            return;
        }

        // ローカルストレージに保存
        localStorage.setItem("radio2note_theme", theme);
        localStorage.setItem("radio2note_memo", memo);

        router.push("/mc");
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground" style={{ minHeight: '100dvh' }}>
            {/* Navigation Header */}
            <div className="px-6 py-4 flex items-center justify-between shrink-0">
                <Link
                    href="/"
                    className="flex items-center justify-center size-11 rounded-full bg-card border border-border/50 transition-transform active:scale-95"
                >
                    <Icon icon="solar:arrow-left-linear" className="text-2xl" />
                </Link>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="w-2 h-2 rounded-full bg-border" />
                    <div className="w-2 h-2 rounded-full bg-border" />
                </div>
                <div className="size-11" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-32 scrollbar-hide">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary/20 border border-primary/40">
                        <Icon icon="solar:microphone-3-bold" className="text-base text-primary mr-2" />
                        <span className="text-sm font-bold text-primary">STEP 1/3</span>
                    </div>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-heading tracking-tight text-center mb-3 text-foreground">
                        今日は何について
                        <br />
                        話しますか？
                    </h1>
                    <p className="text-center text-sm text-muted-foreground">トークテーマを入力してください</p>
                </div>

                <div className="flex items-center justify-center mb-8">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-chart-2/30 border-2 border-primary/50 flex items-center justify-center">
                            <Icon icon="solar:soundwave-bold" className="text-4xl text-primary" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive border-2 border-background flex items-center justify-center animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-background" />
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-bold mb-3 text-foreground">
                        トークテーマ
                        <span className="ml-2 text-xs text-destructive bg-destructive/20 px-2 py-0.5 rounded-full">
                            必須
                        </span>
                    </label>
                    <textarea
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        placeholder="例：初めてのマラソン完走"
                        maxLength={30}
                        className="w-full px-5 py-4 rounded-2xl border border-border bg-input text-foreground placeholder:text-muted-foreground min-h-28 resize-none shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground mt-2 ml-1">
                        {theme.length}/30文字
                    </p>
                </div>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-background px-4 text-xs text-muted-foreground font-medium">
                            オプション
                        </span>
                    </div>
                </div>

                <div className="mb-8">
                    <label className="block text-sm font-bold mb-3 text-foreground">
                        MCに拾ってほしいポイント
                        <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            任意
                        </span>
                    </label>
                    <p className="text-xs text-muted-foreground mb-3">
                        話の中で特に強調してほしいことがあれば教えてください
                    </p>
                    <textarea
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="例：練習よりメンタルが大事だった"
                        className="w-full px-5 py-4 rounded-2xl border border-border bg-input text-foreground placeholder:text-muted-foreground min-h-24 resize-none shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>

                <div className="bg-card rounded-2xl p-4 border border-border/50 flex gap-3 mb-6">
                    <div className="shrink-0 mt-0.5">
                        <Icon icon="solar:lightbulb-bolt-bold" className="text-xl text-chart-1" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold mb-1 text-card-foreground">ヒント</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            MCはこのポイントをもとに質問を投げかけます。空欄でも収録は進められます。
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Action */}
            <div className="fixed-bottom-button bg-background border-t border-border px-6 py-4 pb-8">
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
