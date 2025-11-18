-- 更新嵌入向量维度以支持 OpenAI embeddings
-- OpenAI text-embedding-ada-002 和 text-embedding-3-small 使用 1536 维度
-- text-embedding-3-large 使用 3072 维度（可选）

-- 删除旧的向量索引
DROP INDEX IF EXISTS document_embeddings_embedding_idx;

-- 删除旧的向量列（如果存在）
-- 注意：这将删除所有现有的向量数据
ALTER TABLE document_embeddings DROP COLUMN IF EXISTS embedding;

-- 添加新的向量列（支持 1536 维度，OpenAI 标准）
ALTER TABLE document_embeddings ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

-- 重新创建向量索引
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 更新向量相似性搜索函数以支持 1536 维度
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
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

-- 添加 embedding_model 字段到 ai_settings 表（如果不存在）
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';

