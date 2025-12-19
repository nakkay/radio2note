"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const router = useRouter();
    const { user, loading, signInWithGoogle, signOut } = useAuth();

    const handleSignOut = async () => {
        if (!confirm("ログアウトしますか？")) return;
        await signOut();
        router.push("/");
    };

    // ユーザー名の初期値を取得（メールアドレスの@より前の部分、または表示名）
    const getUserDisplayName = () => {
        if (!user) return "ゲスト";
        return user.user_metadata?.full_name || 
               user.user_metadata?.name || 
               user.email?.split("@")[0] || 
               "ユーザー";
    };

    // ユーザーのイニシャルを取得
    const getUserInitial = () => {
        const name = getUserDisplayName();
        return name.charAt(0).toUpperCase();
    };

    // ユーザーのアバター画像を取得
    const getUserAvatar = () => {
        return user?.user_metadata?.avatar_url || null;
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
                <h1 className="text-lg font-heading font-bold text-foreground">設定</h1>
                <div className="size-11" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-32 scrollbar-hide">
                {/* User Profile */}
                <div className="mb-8">
                    <h2 className="text-sm font-bold text-muted-foreground mb-3 px-1">アカウント</h2>
                    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                        {loading ? (
                            <div className="w-full flex items-center gap-4 p-4">
                                <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                                <div className="flex-1">
                                    <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                                    <div className="h-3 bg-muted rounded animate-pulse w-20" />
                                </div>
                            </div>
                        ) : user ? (
                            <>
                                <div className="w-full flex items-center gap-4 p-4 border-b border-border/50">
                                    {getUserAvatar() ? (
                                        <img 
                                            src={getUserAvatar()} 
                                            alt={getUserDisplayName()}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-primary-foreground font-bold text-lg">
                                            {getUserInitial()}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="font-bold text-foreground">{getUserDisplayName()}</div>
                                        <div className="text-xs text-muted-foreground">{user.email}</div>
                                    </div>
                                </div>
                                <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-chart-1/10 flex items-center justify-center text-chart-1">
                                            <Icon icon="solar:crown-star-bold" className="text-lg" />
                                        </div>
                                        <span className="font-medium text-sm">プランのアップグレード</span>
                                    </div>
                                    <Icon icon="solar:arrow-right-linear" className="text-muted-foreground text-xl" />
                                </button>
                            </>
                        ) : (
                            <div className="p-4 text-center">
                                <p className="text-sm text-muted-foreground mb-4">
                                    ログインして記事を保存しましょう
                                </p>
                                <button
                                    onClick={signInWithGoogle}
                                    className="w-full h-12 rounded-xl font-bold text-sm bg-background border-2 border-border hover:border-primary transition-colors flex items-center justify-center gap-3"
                                >
                                    <Icon icon="logos:google-icon" className="text-xl" />
                                    Googleでログイン
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* App Settings */}
                <div className="mb-8">
                    <h2 className="text-sm font-bold text-muted-foreground mb-3 px-1">アプリ設定</h2>
                    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                    <Icon icon="solar:microphone-3-bold" className="text-lg" />
                                </div>
                                <span className="font-medium text-sm">マイク設定</span>
                            </div>
                            <Icon icon="solar:arrow-right-linear" className="text-muted-foreground text-xl" />
                        </button>
                    </div>
                </div>

                {/* Support */}
                <div>
                    <h2 className="text-sm font-bold text-muted-foreground mb-3 px-1">サポート</h2>
                    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left border-b border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                    <Icon icon="solar:question-circle-bold" className="text-lg" />
                                </div>
                                <span className="font-medium text-sm">ヘルプセンター</span>
                            </div>
                            <Icon icon="solar:arrow-right-linear" className="text-muted-foreground text-xl" />
                        </button>
                        {user ? (
                            <button 
                                onClick={handleSignOut}
                                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left text-destructive"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                                        <Icon icon="solar:logout-2-bold" className="text-lg" />
                                    </div>
                                    <span className="font-medium text-sm">ログアウト</span>
                                </div>
                            </button>
                        ) : (
                            <Link 
                                href="/login"
                                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Icon icon="solar:login-3-bold" className="text-lg" />
                                    </div>
                                    <span className="font-medium text-sm">ログイン</span>
                                </div>
                                <Icon icon="solar:arrow-right-linear" className="text-muted-foreground text-xl" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-2 pb-6 flex items-center justify-between z-50">
                <Link href="/" className="flex flex-col items-center gap-1 w-16 text-muted-foreground hover:text-foreground transition-colors">
                    <Icon icon="solar:home-2-linear" className="text-2xl" />
                    <span className="text-[10px] font-medium">ホーム</span>
                </Link>
                <Link href="/setup" className="flex flex-col items-center gap-1 w-16 text-muted-foreground hover:text-foreground transition-colors">
                    <Icon icon="solar:microphone-3-linear" className="text-2xl" />
                    <span className="text-[10px] font-medium">収録</span>
                </Link>
                <Link href="/articles" className="flex flex-col items-center gap-1 w-16 text-muted-foreground hover:text-foreground transition-colors">
                    <Icon icon="solar:file-text-linear" className="text-2xl" />
                    <span className="text-[10px] font-medium">記事一覧</span>
                </Link>
                <button className="flex flex-col items-center gap-1 w-16 text-primary">
                    <Icon icon="solar:settings-bold" className="text-2xl" />
                    <span className="text-[10px] font-medium">設定</span>
                </button>
            </div>
        </div>
    );
}
