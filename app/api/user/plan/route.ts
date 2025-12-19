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
    // 注意: サーバー側ではRLSが適用されるため、サービスロールキーが必要な場合があります
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('plan_type, status, current_period_start, current_period_end')
      .eq('user_id', userId)
      .single();

    // デバッグログ
    console.log('Plan fetch - userId:', userId);
    console.log('Plan fetch - data:', data);
    console.log('Plan fetch - error:', error);

    if (error) {
      if (error.code === 'PGRST116') {
        // 行が見つからない = サブスクリプションなし
        console.log('No subscription found for user:', userId);
        return NextResponse.json({ planType: 'free' });
      }
      console.error('Supabase error:', error);
      return NextResponse.json({ planType: 'free' });
    }

    // サブスクリプションがない場合はフリープラン
    if (!data) {
      console.log('No subscription data for user:', userId);
      return NextResponse.json({ planType: 'free' });
    }

    // statusが'active'でない場合はフリープラン
    if (data.status !== 'active') {
      console.log('Subscription status is not active:', data.status);
      return NextResponse.json({ planType: 'free' });
    }

    // current_period_endが過去の場合はフリープラン
    if (data.current_period_end) {
      const periodEnd = new Date(data.current_period_end);
      const now = new Date();
      if (periodEnd < now) {
        console.log('Subscription period has ended:', periodEnd, 'now:', now);
        return NextResponse.json({ planType: 'free' });
      }
    }

    console.log('User has active premium plan:', data.plan_type);
    return NextResponse.json({ planType: data.plan_type || 'free' });
  } catch (error: any) {
    console.error('Plan fetch error:', error);
    return NextResponse.json({ planType: 'free' });
  }
}
