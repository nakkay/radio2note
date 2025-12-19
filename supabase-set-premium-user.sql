-- ユーザーを有料ユーザー（プレミアムプラン）に設定するSQL
-- Supabase DashboardのSQL Editorで実行してください

-- 方法1: ユーザーIDを指定して有料ユーザーに設定（推奨）
-- 以下の'YOUR_USER_ID_HERE'を実際のユーザーID（UUID）に置き換えてください
-- ユーザーIDは、Supabase Dashboard → Authentication → Users で確認できます

-- 重要: RLSポリシーを一時的に無効化して実行する必要がある場合があります
-- または、サービスロールキーを使用してAPIから実行してください

INSERT INTO user_subscriptions (
  user_id,
  plan_type,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end
)
VALUES (
  'YOUR_USER_ID_HERE'::UUID,  -- ここにユーザーIDを入力
  'premium',
  'active',
  NOW(),  -- 現在時刻を開始日として設定
  NULL,  -- 終了日をNULLに設定（無期限）- または 'NOW() + INTERVAL ''1 year''' で1年後に設定
  false
)
ON CONFLICT (user_id) 
DO UPDATE SET
  plan_type = 'premium',
  status = 'active',
  current_period_start = COALESCE(user_subscriptions.current_period_start, NOW()),
  current_period_end = NULL,  -- 無期限にする場合はNULL、期間を設定する場合は 'NOW() + INTERVAL ''1 year'''
  cancel_at_period_end = false,
  updated_at = NOW();

-- 方法2: メールアドレスで検索して有料ユーザーに設定
-- 以下の'your-email@example.com'を実際のメールアドレスに置き換えてください

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
  NOW() + INTERVAL '1 month' as current_period_end,
  false as cancel_at_period_end
FROM auth.users
WHERE email = 'your-email@example.com'  -- ここにメールアドレスを入力
ON CONFLICT (user_id) 
DO UPDATE SET
  plan_type = 'premium',
  status = 'active',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 month',
  cancel_at_period_end = false,
  updated_at = NOW();

-- 方法3: 現在のユーザー情報を確認する（ユーザーIDを探す）
-- 以下のクエリで、ユーザー一覧とメールアドレスを確認できます

SELECT 
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- 方法4: 特定のユーザーの現在のプラン情報を確認する

SELECT 
  us.user_id,
  u.email,
  us.plan_type,
  us.status,
  us.current_period_start,
  us.current_period_end,
  us.cancel_at_period_end
FROM user_subscriptions us
JOIN auth.users u ON us.user_id = u.id
WHERE u.email = 'your-email@example.com';  -- ここにメールアドレスを入力

-- 方法5: 有料ユーザーを無期限に設定する（終了日を設定しない）

INSERT INTO user_subscriptions (
  user_id,
  plan_type,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end
)
VALUES (
  'YOUR_USER_ID_HERE'::UUID,  -- ここにユーザーIDを入力
  'premium',
  'active',
  NOW(),
  NULL,  -- 終了日を設定しない（無期限）
  false
)
ON CONFLICT (user_id) 
DO UPDATE SET
  plan_type = 'premium',
  status = 'active',
  current_period_start = NOW(),
  current_period_end = NULL,  -- 終了日をクリア（無期限）
  cancel_at_period_end = false,
  updated_at = NOW();

-- 方法6: デバッグ用 - 現在のサブスクリプション情報を確認
-- 特定のユーザーのサブスクリプション情報を確認

SELECT 
  us.user_id,
  u.email,
  us.plan_type,
  us.status,
  us.current_period_start,
  us.current_period_end,
  us.cancel_at_period_end,
  CASE 
    WHEN us.status = 'active' AND (us.current_period_end IS NULL OR us.current_period_end > NOW()) 
    THEN '有効（プレミアム）'
    ELSE '無効（フリー）'
  END as plan_status,
  NOW() as current_time
FROM user_subscriptions us
JOIN auth.users u ON us.user_id = u.id
WHERE u.email = 'your-email@example.com';  -- ここにメールアドレスを入力

-- 方法7: すべてのユーザーのサブスクリプション情報を確認

SELECT 
  us.user_id,
  u.email,
  us.plan_type,
  us.status,
  us.current_period_start,
  us.current_period_end,
  CASE 
    WHEN us.status = 'active' AND (us.current_period_end IS NULL OR us.current_period_end > NOW()) 
    THEN '有効'
    ELSE '無効'
  END as plan_status
FROM user_subscriptions us
JOIN auth.users u ON us.user_id = u.id
ORDER BY us.created_at DESC;
