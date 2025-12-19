import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ユーザーのプラン情報を取得
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

    // Supabaseが設定されていない場合はフリープランを返す
    if (!supabase) {
      return NextResponse.json({ planType: 'free' });
    }

    // ユーザーのサブスクリプション情報を取得
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('plan_type, status, current_period_end')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116は「行が見つからない」エラー
      console.error('Supabase error:', error);
      return NextResponse.json({ planType: 'free' });
    }

    // サブスクリプションがない、または無効な場合はフリープラン
    if (!data || data.status !== 'active' || (data.current_period_end && new Date(data.current_period_end) < new Date())) {
      return NextResponse.json({ planType: 'free' });
    }

    return NextResponse.json({ planType: data.plan_type || 'free' });
  } catch (error: any) {
    console.error('Plan fetch error:', error);
    return NextResponse.json({ planType: 'free' });
  }
}
