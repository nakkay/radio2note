# Supabase認証設定ガイド

## 重要な設定ポイント

### 1. Supabase DashboardでのURL設定

Supabase Dashboard → **Authentication** → **URL Configuration** で以下を設定：

#### Site URL
- 開発環境: `http://localhost:3000`
- 本番環境: `https://your-domain.vercel.app`

#### Redirect URLs（複数追加可能）
- 開発環境: `http://localhost:3000/auth/callback`
- 本番環境: `https://your-domain.vercel.app/auth/callback`
- ワイルドカード: `http://localhost:3000/**`（開発用）

**重要**: これらのURLを設定しないと、認証後に「OAuth state parameter missing」エラーが発生します。

### 2. Google Cloud Consoleでの設定

#### 承認済みのリダイレクト URI
```
https://vnbcrywtqgkgmhphpjjd.supabase.co/auth/v1/callback
```
- これはSupabaseのドメインです（あなたのプロジェクトの参照IDに置き換えてください）
- パス（`/auth/v1/callback`）を含む完全なURL

#### 承認済みのJavaScript生成元
```
https://vnbcrywtqgkgmhphpjjd.supabase.co
```
- ドメインのみ（パスなし）

### 3. 認証フローの流れ

1. ユーザーが「Googleでログイン」をクリック
2. SupabaseがGoogle認証ページにリダイレクト
3. ユーザーがGoogleで認証
4. GoogleがSupabaseのコールバックURL（`https://vnbcrywtqgkgmhphpjjd.supabase.co/auth/v1/callback`）にリダイレクト
5. Supabaseが認証コードを処理し、アプリのコールバックURL（`http://localhost:3000/auth/callback`）にリダイレクト
6. アプリが認証コードをセッションに変換

### 4. よくあるエラーと解決方法

#### 「OAuth state parameter missing」
- **原因**: SupabaseのRedirect URLsが設定されていない、または一致していない
- **解決**: Supabase Dashboard → Authentication → URL Configuration でRedirect URLsを確認

#### 「リダイレクトURI不一致」
- **原因**: Google Cloud ConsoleのリダイレクトURIがSupabaseのドメインと一致していない
- **解決**: Google Cloud ConsoleでSupabaseのドメイン（`https://your-project.supabase.co/auth/v1/callback`）を追加
