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

// クライアントサイド用のSupabaseクライアント（シングルトンパターン）
let clientSupabaseInstance: ReturnType<typeof createClient> | null = null;

export const createSupabaseClient = () => {
  if (typeof window === 'undefined') return null;
  
  // 既にインスタンスが作成されている場合は再利用
  if (clientSupabaseInstance) {
    return clientSupabaseInstance;
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!url || !key) return null;
  
  // 新しいインスタンスを作成して保存
  clientSupabaseInstance = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  
  return clientSupabaseInstance;
};

