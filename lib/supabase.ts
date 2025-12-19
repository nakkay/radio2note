import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// サーバー側でRLSをバイパスするためのサービスロールキー（オプション）
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase環境変数が設定されていません。localStorageを使用します。');
}

// サーバー側用: サービスロールキーがあればそれを使用（RLSをバイパス）、なければアノンキーを使用
export const supabase = supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey)
  ? createClient(
      supabaseUrl, 
      supabaseServiceRoleKey || supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null;

// クライアントサイド用のSupabaseクライアント
export const createSupabaseClient = () => {
  if (typeof window === 'undefined') return null;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!url || !key) return null;
  
  return createClient(url, key);
};

