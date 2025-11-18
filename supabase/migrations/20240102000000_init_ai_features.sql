-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- AI 配置表
CREATE TABLE IF NOT EXISTS ai_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ollama_url TEXT DEFAULT 'http://localhost:11434',
  api_key TEXT,
  chat_model TEXT DEFAULT 'gpt-3.5-turbo',
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INT DEFAULT 5,
  chunk_size INT DEFAULT 500,
  temperature FLOAT DEFAULT 0.7,
  max_tokens INT DEFAULT 2000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文档表
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_type TEXT,
  file_size BIGINT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  vector_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文档向量表
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),  -- nomic-embed-text 维度
  chunk_index INT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI 对话表
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI 消息表
-- 注意：role 字段使用 TEXT 类型，应用层负责验证值必须是 'user', 'assistant', 或 'system'
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  sources JSONB,  -- 引用来源
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建向量索引
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 创建其他索引
CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents(user_id);
CREATE INDEX IF NOT EXISTS documents_status_idx ON documents(status);
CREATE INDEX IF NOT EXISTS document_embeddings_document_id_idx ON document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS ai_conversations_user_id_idx ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS ai_messages_conversation_id_idx ON ai_messages(conversation_id);

-- 启用行级安全
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

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

-- 文档策略
CREATE POLICY "Users can view own documents"
ON documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
ON documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
ON documents FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
ON documents FOR DELETE
USING (auth.uid() = user_id);

-- 文档向量策略
CREATE POLICY "Users can view own document_embeddings"
ON document_embeddings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM documents 
  WHERE documents.id = document_embeddings.document_id 
  AND documents.user_id = auth.uid()
));

CREATE POLICY "Users can insert own document_embeddings"
ON document_embeddings FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM documents 
  WHERE documents.id = document_embeddings.document_id 
  AND documents.user_id = auth.uid()
));

CREATE POLICY "Users can delete own document_embeddings"
ON document_embeddings FOR DELETE
USING (EXISTS (
  SELECT 1 FROM documents 
  WHERE documents.id = document_embeddings.document_id 
  AND documents.user_id = auth.uid()
));

-- 对话策略
CREATE POLICY "Users can view own conversations"
ON ai_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
ON ai_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
ON ai_conversations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
ON ai_conversations FOR DELETE
USING (auth.uid() = user_id);

-- 消息策略
CREATE POLICY "Users can view own messages"
ON ai_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM ai_conversations 
  WHERE ai_conversations.id = ai_messages.conversation_id 
  AND ai_conversations.user_id = auth.uid()
));

CREATE POLICY "Users can insert own messages"
ON ai_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM ai_conversations 
  WHERE ai_conversations.id = ai_messages.conversation_id 
  AND ai_conversations.user_id = auth.uid()
));

CREATE POLICY "Users can delete own messages"
ON ai_messages FOR DELETE
USING (EXISTS (
  SELECT 1 FROM ai_conversations 
  WHERE ai_conversations.id = ai_messages.conversation_id 
  AND ai_conversations.user_id = auth.uid()
));

-- 创建向量相似性搜索函数
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT,
  filter_user_id UUID
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  document_title TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.content,
    1 - (de.embedding <=> query_embedding) AS similarity,
    d.title AS document_title
  FROM document_embeddings de
  JOIN documents d ON d.id = de.document_id
  WHERE d.user_id = filter_user_id
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 更新时间触发器
CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
