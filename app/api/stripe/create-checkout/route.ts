import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// Stripeクライアントを取得（環境変数が設定されている場合のみ）
function getStripeClient(): Stripe | null {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    return null;
  }
  return new Stripe(apiKey, {
    apiVersion: '2025-12-15.clover',
  });
}

// Stripe Checkoutセッションを作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userEmail } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // 既存のStripe顧客IDを取得または作成
    let customerId: string | null = null;

    if (supabase) {
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (subscription?.stripe_customer_id) {
        customerId = subscription.stripe_customer_id;
      } else {
        // Stripe顧客を作成
        const customer = await stripe.customers.create({
          email: userEmail || undefined,
          metadata: {
            userId: userId,
          },
        });
        customerId = customer.id;

        // Supabaseに保存
        await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            plan_type: 'free',
            status: 'incomplete',
          });
      }
    }

    // Stripe Checkoutセッションを作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID || '', // 月額1,280円の価格ID
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?canceled=true`,
      metadata: {
        userId: userId,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
