import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getWeekStart, getWeekEnd } from '@/lib/plans';

// ユーザーの今週の記事作成数を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Supabaseが設定されていない場合は0を返す
    if (!supabase) {
      return NextResponse.json({ count: 0 });
    }

    // 今週の開始日と終了日を取得
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    // 今週作成された記事数を取得
    const { count, error } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString());

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error: any) {
    console.error('Article count fetch error:', error);
    return NextResponse.json({ count: 0 });
  }
}
