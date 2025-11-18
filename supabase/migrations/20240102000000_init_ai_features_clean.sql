-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- AI 配置表（仅用于向量搜索）
CREATE TABLE IF NOT EXISTS ai_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT,
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INT DEFAULT 10,
  chunk_size INT DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用行级安全
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- AI 配置策略
CREATE POLICY "Users can view own ai_settings"
ON ai_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_settings"
ON ai_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai_settings"
ON ai_settings FOR UPDATE
USING (auth.uid() = user_id);

-- 更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

