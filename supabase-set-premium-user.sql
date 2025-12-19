-- ユーザーを有料ユーザー（プレミアムプラン）に設定するSQL
-- Supabase DashboardのSQL Editorで実行してください

-- 方法1: ユーザーIDを指定して有料ユーザーに設定
-- 以下の'YOUR_USER_ID_HERE'を実際のユーザーID（UUID）に置き換えてください
-- ユーザーIDは、Supabase Dashboard → Authentication → Users で確認できます

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
  NOW() + INTERVAL '1 month',  -- 1ヶ月後を終了日として設定
  false
)
ON CONFLICT (user_id) 
DO UPDATE SET
  plan_type = 'premium',
  status = 'active',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 month',
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
