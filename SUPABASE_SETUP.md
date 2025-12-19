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

### 5. OAuthログイン画面の文言を変更する

「vnbcrywtqgkgmhphpjjd.supabase.co にログイン」という文言を変更するには、Google Cloud ConsoleのOAuth同意画面でアプリケーション名を設定します。

#### 手順

1. **Google Cloud Console**にアクセス
   - https://console.cloud.google.com/

2. **APIs & Services** → **OAuth consent screen** に移動

3. **アプリケーション名**を設定
   - 例: 「Radio2Note」や「あなたのアプリ名」
   - これが「○○にログイン」の○○部分に表示されます

4. **アプリケーションのロゴ**を設定（オプション）
   - ユーザーに信頼感を与えるため、ロゴを設定することを推奨

5. **サポートメール**を設定
   - 必須項目です

6. **保存**して、必要に応じて**Googleのブランド検証**を申請
   - 検証が完了すると、より信頼性の高い表示になります
   - 検証には数営業日かかる場合があります

#### 注意事項

- アプリケーション名を変更すると、GoogleのOAuth同意画面に新しい名前が表示されます
- 「○○にログイン」の文言は、Google側で自動的に生成されるため、完全にカスタマイズすることはできません
- より細かいカスタマイズが必要な場合は、SupabaseのCustom Domainを設定することを検討してください
