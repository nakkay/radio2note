# 本番環境デプロイチェックリスト

## 環境変数の設定（Vercel）

Vercel Dashboard → Project Settings → Environment Variables で以下を設定：

### 必須環境変数

```env
# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google Gemini API (画像生成用)
GOOGLE_API_KEY=your_google_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe (有料プラン用)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_...  # 月額1,280円の価格ID
STRIPE_WEBHOOK_SECRET=whsec_...

# Next.js
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### オプション環境変数

```env
# OpenAI API (TTS用 - 現在は使用していない)
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs API (TTS用 - 現在は使用していない)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

## Supabaseの設定

1. ✅ SQL Editorで `supabase-schema.sql` を実行
2. ✅ Google認証を有効化
3. ✅ Redirect URLsを設定:
   - `https://your-domain.vercel.app/auth/callback`
4. ✅ Row Level Security (RLS) が有効化されていることを確認

## Stripeの設定

1. ✅ 価格を作成（月額1,280円）
2. ✅ Webhookエンドポイントを設定:
   - URL: `https://your-domain.vercel.app/api/stripe/webhook`
   - イベント: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. ✅ Webhookシークレットを環境変数に設定

## Google OAuthの設定

1. ✅ Google Cloud ConsoleでOAuth 2.0クライアントIDを作成
2. ✅ 承認済みのリダイレクト URI:
   - `https://your-project.supabase.co/auth/v1/callback`
3. ✅ 承認済みのJavaScript生成元:
   - `https://your-project.supabase.co`
4. ✅ Supabase DashboardでGoogle認証を有効化

## 動作確認項目

- [ ] ログイン機能が正常に動作する
- [ ] 記事の作成・保存が正常に動作する
- [ ] 画像生成がプレミアムプランでのみ動作する
- [ ] 記事作成数の制限が正常に動作する（フリー: 週3記事、プレミアム: 週10記事）
- [ ] Stripe決済が正常に動作する
- [ ] Webhookが正常に動作する
- [ ] 設定画面でユーザー情報が正しく表示される

## セキュリティ確認

- [ ] 環境変数が正しく設定されている（シークレットキーが漏洩していない）
- [ ] Supabase RLSが有効化されている
- [ ] APIルートで適切なエラーハンドリングが行われている

