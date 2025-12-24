# トラブルシューティングガイド

## 有料フラグが反映されない場合

### 1. データベースの確認

Supabase DashboardのSQL Editorで以下を実行して、データが正しく保存されているか確認：

```sql
-- あなたのメールアドレスに置き換えてください
SELECT 
  us.user_id,
  u.email,
  us.plan_type,
  us.status,
  us.current_period_start,
  us.current_period_end,
  CASE 
    WHEN us.status = 'active' AND (us.current_period_end IS NULL OR us.current_period_end > NOW()) 
    THEN '有効（プレミアム）'
    ELSE '無効（フリー）'
  END as plan_status,
  NOW() as current_time
FROM user_subscriptions us
JOIN auth.users u ON us.user_id = u.id
WHERE u.email = 'your-email@example.com';
```

### 2. 確認ポイント

- `plan_type` が `'premium'` になっているか
- `status` が `'active'` になっているか
- `current_period_end` が `NULL`（無期限）または未来の日付になっているか

### 3. よくある問題と解決方法

#### 問題1: RLS（Row Level Security）でブロックされている

**症状**: データは存在するが、APIから取得できない

**解決方法**:
1. Vercelの環境変数に `SUPABASE_SERVICE_ROLE_KEY` を追加
2. Supabase Dashboard → Settings → API → service_role key をコピー
3. Vercel Dashboard → Project Settings → Environment Variables に追加

#### 問題2: `current_period_end` が過去の日付になっている

**症状**: データは存在するが、`plan_status` が「無効」と表示される

**解決方法**: 以下のSQLで無期限に設定：

```sql
UPDATE user_subscriptions
SET 
  current_period_end = NULL,  -- 無期限
  status = 'active',
  updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID_HERE'::UUID;
```

#### 問題3: `status` が `'active'` になっていない

**症状**: データは存在するが、プランが反映されない

**解決方法**: 以下のSQLで `status` を更新：

```sql
UPDATE user_subscriptions
SET 
  status = 'active',
  updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID_HERE'::UUID;
```

### 4. デバッグ方法

#### ブラウザの開発者ツールで確認

1. 設定画面を開く
2. F12で開発者ツールを開く
3. Consoleタブで以下のログを確認：
   - `Plan fetch - userId: ...`
   - `Plan fetch - data: ...`
   - `Plan fetch - error: ...`

#### サーバーログで確認（Vercel）

1. Vercel Dashboard → プロジェクト → Functions
2. `/api/user/plan` のログを確認
3. エラーメッセージや取得データを確認

### 5. 推奨される設定方法（無期限）

```sql
-- メールアドレスで検索して有料ユーザーに設定（無期限・推奨）
INSERT INTO user_subscriptions (
  user_id,
  plan_type,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end
)
SELECT 
  id as user_id,
  'premium' as plan_type,
  'active' as status,
  NOW() as current_period_start,
  NULL as current_period_end,  -- NULL = 無期限
  false as cancel_at_period_end
FROM auth.users
WHERE email = 'your-email@example.com'  -- ここにメールアドレスを入力
ON CONFLICT (user_id) 
DO UPDATE SET
  plan_type = 'premium',
  status = 'active',
  current_period_start = COALESCE(user_subscriptions.current_period_start, NOW()),
  current_period_end = NULL,  -- 無期限
  cancel_at_period_end = false,
  updated_at = NOW();
```

### 6. 環境変数の確認

Vercel Dashboardで以下が設定されているか確認：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（推奨、RLSをバイパスするため）

