import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// アカウント削除
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      );
    }

    // 1. ユーザーの記事を削除
    const { error: articlesError } = await supabase
      .from('articles')
      .delete()
      .eq('user_id', userId);

    if (articlesError) {
      console.error('Failed to delete articles:', articlesError);
      // エラーがあっても続行（記事が存在しない可能性がある）
    }

    // 2. サブスクリプション情報を削除
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subscriptionError) {
      console.error('Failed to delete subscription:', subscriptionError);
      // エラーがあっても続行（サブスクリプションが存在しない可能性がある）
    }

    // 3. Supabase Authでユーザーを削除
    // 注意: これはサービスロールキーが必要な場合があります
    // クライアント側から直接削除する場合は、Supabase AuthのdeleteUserメソッドを使用してください
    // ここではデータベースのデータのみ削除し、認証情報の削除はクライアント側で行います

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}
