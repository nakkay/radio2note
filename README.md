# Radio2Note

ラジオ番組にゲスト出演するような対話体験を通じて、ユーザーの一次情報をnote記事として成型するサービス。

## 概要

Radio2Noteは、話すだけでnote記事が完成するWebアプリケーションです。MC役のAIがユーザーとの対話を通じて、ユーザーの体験や発見を引き出し、それを読みやすい記事として自動生成します。

## 機能

- **トークテーマ設定**: 今日話したいテーマを入力
- **MCキャラクター選択**: 4種類のMCキャラクターから選択可能
- **リアルタイム対話**: MCとのテキストベースの対話
- **記事生成**: 対話内容を基に、3,000〜5,000字の記事を自動生成
- **トーン選択**: 一人称/三人称の文体を選択可能

## 技術スタック

- **フロントエンド**: Next.js 16, React 19, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **AI**: 
  - Claude API (Anthropic) - MC対話・記事生成
  - Google Gemini API - 画像生成 (Nano Banana Pro)
  - OpenAI TTS - 音声合成（オプション）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google Gemini API (画像生成用)
GOOGLE_API_KEY=your_google_api_key_here

# OpenAI API (for TTS - オプション)
OPENAI_API_KEY=your_openai_api_key_here

# Supabase (本番環境用)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe (有料プラン用)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_PRICE_ID=your_stripe_price_id  # 月額1,280円の価格ID
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabaseのセットアップ（本番環境用）

本番環境で記事データを保存する場合は、Supabaseのセットアップが必要です。

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. SQL Editorで `supabase-schema.sql` の内容を実行してテーブルを作成
3. **Google認証の設定**:
   - Supabase Dashboard → Authentication → Providers → Google
   - Google認証を有効化
   - Google Cloud ConsoleでOAuth 2.0クライアントIDを作成
   - リダイレクトURL: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Client IDとClient SecretをSupabaseに設定
4. 環境変数に以下を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトのURL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabaseの匿名キー

**注意**: Supabaseが設定されていない場合、アプリは自動的にlocalStorageにフォールバックします（開発環境では問題ありません）。

### 4. Stripeのセットアップ（有料プラン用）

有料プラン機能を使用する場合は、Stripeのセットアップが必要です。

1. [Stripe](https://stripe.com)でアカウントを作成
2. **価格を作成**:
   - Stripe Dashboard → Products → Add product
   - 名前: "Radio2Note Premium"
   - 価格: 1,280円（月額）
   - 価格IDをコピー
3. **Webhookエンドポイントを設定**:
   - Stripe Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://your-domain.vercel.app/api/stripe/webhook`
   - イベント: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Webhookシークレットをコピー
4. 環境変数に以下を設定:
   - `STRIPE_SECRET_KEY`: Stripeのシークレットキー
   - `STRIPE_PUBLISHABLE_KEY`: Stripeの公開可能キー（フロントエンドで使用する場合は追加）
   - `STRIPE_PRICE_ID`: 作成した価格のID
   - `STRIPE_WEBHOOK_SECRET`: Webhookのシークレット

**注意**: Stripeが設定されていない場合、有料プラン機能は利用できません（フリープランのみ利用可能）。

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 使い方

1. **セットアップ**: トークテーマとMCに拾ってほしいポイントを入力
2. **MC選択**: 4種類のMCキャラクターから選択
3. **収録**: MCとの対話を開始（4ステップで進行）
4. **トーン選択**: 記事の文体（一人称/三人称）を選択
5. **記事生成**: AIが自動的に記事を生成
6. **コピー**: 生成された記事をコピーして、noteなどに投稿

## プロジェクト構造

```
app/
├── api/              # API Routes
│   ├── conversation/ # MC対話API
│   ├── tts/         # 音声合成API
│   └── article/     # 記事生成API
├── setup/           # セットアップページ
├── mc/              # MC選択ページ
├── recording/       # 収録ページ
├── tone/            # トーン選択ページ
├── generation/      # 記事生成ページ
└── article/         # 記事表示ページ
```

## ライセンス

このプロジェクトはプライベートプロジェクトです。
