"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();

  useEffect(() => {
    // 既にログインしている場合はホームにリダイレクト
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background text-foreground font-sans items-center justify-center px-6">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (user) {
    return null; // リダイレクト中
  }

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
        <h1 className="text-lg font-heading font-bold text-foreground">ログイン</h1>
        <div className="size-11" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 scrollbar-hide flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl p-8 border border-border/50 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Icon icon="solar:user-circle-bold" className="text-4xl text-primary" />
            </div>
            <h2 className="font-bold text-2xl mb-3 text-card-foreground">Radio2Noteへようこそ</h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              ログインして、あなたの対話を記事に変換しましょう
            </p>

            <button
              onClick={signInWithGoogle}
              className="w-full h-14 rounded-xl font-bold text-base bg-background border-2 border-border hover:border-primary transition-colors flex items-center justify-center gap-3 mb-4"
            >
              <Icon icon="logos:google-icon" className="text-2xl" />
              Googleでログイン
            </button>

            <p className="text-xs text-muted-foreground">
              ログインすることで、
              <Link href="/guide" className="text-primary hover:underline">
                利用規約
              </Link>
              と
              <Link href="/guide" className="text-primary hover:underline">
                プライバシーポリシー
              </Link>
              に同意したものとみなされます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

