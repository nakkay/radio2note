"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getUserPlan, getPlanLimits, type PlanType } from "@/lib/plans";

export default function SettingsPage() {
    const router = useRouter();
    const { user, loading, signInWithGoogle, signOut } = useAuth();
    const [planType, setPlanType] = useState<PlanType>('free');
    const [articleCount, setArticleCount] = useState(0);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [showMicrophoneSettings, setShowMicrophoneSettings] = useState(false);
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);
    const [microphoneDevices, setMicrophoneDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
    const [microphoneVolume, setMicrophoneVolume] = useState(100);

    // URLパラメータから成功/キャンセルメッセージを取得
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('success') === 'true') {
            alert('プレミアムプランへのアップグレードが完了しました！');
            // URLからパラメータを削除
            window.history.replaceState({}, '', '/settings');
            // プラン情報を再取得
            if (user?.id) {
                getUserPlan(user.id).then(setPlanType);
            }
        } else if (searchParams.get('canceled') === 'true') {
            alert('アップグレードがキャンセルされました。');
            window.history.replaceState({}, '', '/settings');
        }
    }, [user]);

    const handleSignOut = async () => {
        if (!confirm("ログアウトしますか？")) return;
        await signOut();
        router.push("/");
    };

    // マイク設定を開く
    const handleOpenMicrophoneSettings = async () => {
        try {
            // マイクデバイス一覧を取得
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            setMicrophoneDevices(audioInputs);
            
            // 保存されている設定を読み込む
            const savedDeviceId = localStorage.getItem('radio2note_microphone_device_id');
            const savedVolume = localStorage.getItem('radio2note_microphone_volume');
            setSelectedMicrophone(savedDeviceId || audioInputs[0]?.deviceId || '');
            setMicrophoneVolume(savedVolume ? parseInt(savedVolume) : 100);
            
            setShowMicrophoneSettings(true);
        } catch (error) {
            console.error('Failed to get microphone devices:', error);
            alert('マイクデバイスの取得に失敗しました。ブラウザの設定でマイクのアクセス許可を確認してください。');
        }
    };

    // マイク設定を保存
    const handleSaveMicrophoneSettings = () => {
        localStorage.setItem('radio2note_microphone_device_id', selectedMicrophone);
        localStorage.setItem('radio2note_microphone_volume', microphoneVolume.toString());
        setShowMicrophoneSettings(false);
        alert('マイク設定を保存しました。');
    };

    // アカウント削除
    const handleDeleteAccount = async () => {
        if (!user?.id) return;
        setShowDeleteAccount(false);

        // 最終確認
        const finalConfirm = prompt('削除を確認するため、「削除」と入力してください:');
        if (finalConfirm !== '削除') {
            alert('入力が正しくありません。アカウント削除をキャンセルしました。');
            return;
        }

        try {
            // データベースのデータを削除（記事、サブスクリプション）
            const response = await fetch('/api/user/delete-account', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'アカウント削除に失敗しました');
            }

            alert('アカウントデータを削除しました。ログアウトします。\n\n注意: 認証情報の完全削除については、サポートまでお問い合わせください。');
            await signOut();
            router.push('/');
        } catch (error: any) {
            console.error('Delete account error:', error);
            alert('アカウント削除に失敗しました: ' + (error.message || '不明なエラー'));
        }
    };

    // ユーザー名の表示（個人情報を最小限に：メールアドレスの@より前の部分のみ）
    const getUserDisplayName = () => {
        if (!user) return "ゲスト";
        // メールアドレスの@より前の部分のみ表示（個人情報を最小限に）
        return user.email?.split("@")[0] || "ユーザー";
    };

    // ユーザーのイニシャルを取得（メールアドレスの最初の文字）
    const getUserInitial = () => {
        if (!user?.email) return "U";
        return user.email.charAt(0).toUpperCase();
    };

    // アバター画像は非表示（個人情報を最小限に）
    const getUserAvatar = () => {
        return null; // アバター画像は表示しない
    };

    // プラン情報を取得
    useEffect(() => {
        const loadPlanInfo = async () => {
            if (!user?.id) {
                setIsLoadingPlan(false);
                return;
            }

            try {
                const plan = await getUserPlan(user.id);
                setPlanType(plan);

                // 今週の記事作成数を取得
                const countResponse = await fetch(`/api/user/article-count?userId=${user.id}`);
                if (countResponse.ok) {
                    const countData = await countResponse.json();
                    setArticleCount(countData.count || 0);
                }
            } catch (error) {
                console.error('Failed to load plan info:', error);
            } finally {
                setIsLoadingPlan(false);
            }
        };

        loadPlanInfo();
    }, [user]);

    // プランアップグレード
    const handleUpgrade = async () => {
        if (!user?.id) return;

        setIsUpgrading(true);
        try {
            const response = await fetch('/api/stripe/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    userEmail: user.email,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.url) {
                    // Stripe Checkoutページにリダイレクト
                    window.location.href = data.url;
                }
            } else {
                const errorData = await response.json();
                alert('アップグレードに失敗しました: ' + (errorData.error || '不明なエラー'));
            }
        } catch (error) {
            console.error('Upgrade error:', error);
            alert('アップグレードに失敗しました');
        } finally {
            setIsUpgrading(false);
        }
    };

    // サブスクリプションキャンセル
    const handleCancelSubscription = async () => {
        if (!user?.id) return;
        if (!confirm('サブスクリプションをキャンセルしますか？現在の期間終了まで有料プランが利用できます。')) return;

        try {
            const response = await fetch('/api/stripe/cancel-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                }),
            });

            if (response.ok) {
                alert('サブスクリプションをキャンセルしました。現在の期間終了まで有料プランが利用できます。');
                // プラン情報を再取得
                const plan = await getUserPlan(user.id);
                setPlanType(plan);
            } else {
                const errorData = await response.json();
                alert('キャンセルに失敗しました: ' + (errorData.error || '不明なエラー'));
            }
        } catch (error) {
            console.error('Cancel subscription error:', error);
            alert('キャンセルに失敗しました');
        }
    };

    const limits = getPlanLimits(planType);
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
                                    {(() => {
                                        const avatar = getUserAvatar();
                                        return avatar ? (
                                            <img 
                                                src={avatar} 
                                                alt={getUserDisplayName()}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-primary-foreground font-bold text-lg">
                                                {getUserInitial()}
                                            </div>
                                        );
                                    })()}
                                    <div className="flex-1">
                                        <div className="font-bold text-foreground">{getUserDisplayName()}</div>
                                        {/* メールアドレスは非表示（個人情報を最小限に） */}
                                        <div className="text-xs text-muted-foreground">ログイン中</div>
                                    </div>
                                </div>
                                
                                {/* プラン情報 */}
                                {!isLoadingPlan && (
                                    <div className="p-4 border-b border-border/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-foreground">
                                                現在のプラン
                                            </span>
                                            <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                                planType === 'premium' 
                                                    ? 'bg-chart-1/20 text-chart-1' 
                                                    : 'bg-muted text-muted-foreground'
                                            }`}>
                                                {planType === 'premium' ? 'プレミアム' : 'フリー'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-1 mt-2">
                                            <div className="flex items-center justify-between">
                                                <span>今週の記事作成:</span>
                                                <span className={articleCount >= limits.maxArticlesPerWeek ? 'text-destructive font-bold' : ''}>
                                                    {articleCount} / {limits.maxArticlesPerWeek}件
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>画像生成:</span>
                                                <span className={limits.imageGenerationEnabled ? 'text-chart-1 font-medium' : 'text-muted-foreground'}>
                                                    {limits.imageGenerationEnabled ? '✓ 利用可能' : '✗ 利用不可'}
                                                </span>
                                            </div>
                                            {planType === 'premium' && (
                                                <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/30">
                                                    月額{limits.price.toLocaleString()}円
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* プランアップグレード/キャンセル */}
                                {planType === 'free' ? (
                                    <button 
                                        onClick={handleUpgrade}
                                        disabled={isUpgrading}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-chart-1/10 flex items-center justify-center text-chart-1">
                                                <Icon icon="solar:crown-star-bold" className="text-lg" />
                                            </div>
                                            <div>
                                                <span className="font-medium text-sm block">プレミアムプランにアップグレード</span>
                                                <span className="text-xs text-muted-foreground">月額1,280円</span>
                                            </div>
                                        </div>
                                        <Icon icon="solar:arrow-right-linear" className="text-muted-foreground text-xl" />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleCancelSubscription}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left text-destructive"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                                                <Icon icon="solar:close-circle-bold" className="text-lg" />
                                            </div>
                                            <span className="font-medium text-sm">サブスクリプションをキャンセル</span>
                                        </div>
                                        <Icon icon="solar:arrow-right-linear" className="text-muted-foreground text-xl" />
                                    </button>
                                )}
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
                        <button 
                            onClick={handleOpenMicrophoneSettings}
                            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                        >
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
                            <>
                                <button 
                                    onClick={handleSignOut}
                                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left border-b border-border/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                            <Icon icon="solar:logout-2-bold" className="text-lg" />
                                        </div>
                                        <span className="font-medium text-sm">ログアウト</span>
                                    </div>
                                    <Icon icon="solar:arrow-right-linear" className="text-muted-foreground text-xl" />
                                </button>
                                <button 
                                    onClick={() => setShowDeleteAccount(true)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left text-destructive"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                                            <Icon icon="solar:trash-bin-trash-bold" className="text-lg" />
                                        </div>
                                        <span className="font-medium text-sm">アカウントを削除</span>
                                    </div>
                                    <Icon icon="solar:arrow-right-linear" className="text-muted-foreground text-xl" />
                                </button>
                            </>
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

            {/* マイク設定モーダル */}
            {showMicrophoneSettings && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-2xl border border-border/50 p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">マイク設定</h2>
                            <button
                                onClick={() => setShowMicrophoneSettings(false)}
                                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
                            >
                                <Icon icon="solar:close-circle-bold" className="text-xl" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-foreground mb-2 block">
                                    マイクデバイス
                                </label>
                                <select
                                    value={selectedMicrophone}
                                    onChange={(e) => setSelectedMicrophone(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-muted border border-border text-foreground"
                                >
                                    {microphoneDevices.map((device) => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label || `マイク ${microphoneDevices.indexOf(device) + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground mb-2 block">
                                    マイク音量: {microphoneVolume}%
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={microphoneVolume}
                                    onChange={(e) => setMicrophoneVolume(parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowMicrophoneSettings(false)}
                                className="flex-1 h-12 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSaveMicrophoneSettings}
                                className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* アカウント削除確認モーダル */}
            {showDeleteAccount && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card rounded-2xl border border-border/50 p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-destructive">アカウントを削除</h2>
                            <button
                                onClick={() => setShowDeleteAccount(false)}
                                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
                            >
                                <Icon icon="solar:close-circle-bold" className="text-xl" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <p className="text-sm text-foreground">
                                アカウントを削除すると、以下のデータが完全に削除されます：
                            </p>
                            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                                <li>すべての記事データ</li>
                                <li>会話履歴</li>
                                <li>アカウント情報</li>
                                <li>サブスクリプション情報</li>
                            </ul>
                            <p className="text-sm text-destructive font-medium">
                                この操作は取り消せません。
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteAccount(false)}
                                className="flex-1 h-12 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="flex-1 h-12 rounded-xl bg-destructive text-white font-medium hover:bg-destructive/90 transition-colors"
                            >
                                削除する
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
