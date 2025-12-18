-- Supabaseデータベーススキーマ
-- このSQLをSupabaseのSQL Editorで実行してください

-- articlesテーブルを作成
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  image TEXT, -- Base64エンコードされた画像データ
  image_mime_type TEXT,
  conversation_history JSONB, -- 会話履歴をJSONとして保存
  elapsed_time INTEGER DEFAULT 0, -- 収録時間（秒）
  tone TEXT DEFAULT 'first', -- 'first' or 'dialogue'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_theme ON articles(theme);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) を有効化（必要に応じて）
-- ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み書きできるポリシー（認証が必要な場合は変更してください）
-- CREATE POLICY "Allow all operations" ON articles
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);
