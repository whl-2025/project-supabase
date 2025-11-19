-- 更新向量维度为 768（nomic-embed-text）

-- 1. 删除旧的向量索引
DROP INDEX IF EXISTS vector_item_embeddings_embedding_idx;

-- 2. 删除旧的搜索函数
DROP FUNCTION IF EXISTS search_vector_items(VECTOR, FLOAT, INT, UUID, TEXT);
DROP FUNCTION IF EXISTS recommend_similar_items(UUID, INT, FLOAT);

-- 3. 删除所有现有向量数据（因为维度不匹配）
DELETE FROM vector_item_embeddings;

-- 4. 修改 embedding 列的维度
ALTER TABLE vector_item_embeddings 
ALTER COLUMN embedding TYPE VECTOR(768);

-- 5. 重新创建搜索函数（使用 768 维）
CREATE OR REPLACE FUNCTION search_vector_items(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_user_id UUID DEFAULT NULL,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  item_id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT,
  category TEXT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vie.id,
    vie.item_id,
    vi.title,
    vie.content,
    1 - (vie.embedding <=> query_embedding) AS similarity,
    vi.category,
    vi.metadata
  FROM vector_item_embeddings vie
  JOIN vector_items vi ON vi.id = vie.item_id
  WHERE (filter_user_id IS NULL OR vi.user_id = filter_user_id)
    AND (filter_category IS NULL OR vi.category = filter_category)
    AND 1 - (vie.embedding <=> query_embedding) > match_threshold
  ORDER BY vie.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. 重新创建推荐函数（使用 768 维）
CREATE OR REPLACE FUNCTION recommend_similar_items(
  item_id_param UUID,
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  item_id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT,
  category TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  item_embedding VECTOR(768);
  item_user_id UUID;
BEGIN
  SELECT vie.embedding, vi.user_id INTO item_embedding, item_user_id
  FROM vector_item_embeddings vie
  JOIN vector_items vi ON vi.id = vie.item_id
  WHERE vi.id = item_id_param
  LIMIT 1;

  IF item_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    vie.id,
    vie.item_id,
    vi.title,
    vie.content,
    1 - (vie.embedding <=> item_embedding) AS similarity,
    vi.category
  FROM vector_item_embeddings vie
  JOIN vector_items vi ON vi.id = vie.item_id
  WHERE vi.user_id = item_user_id
    AND vi.id != item_id_param
    AND 1 - (vie.embedding <=> item_embedding) > match_threshold
  ORDER BY vie.embedding <=> item_embedding
  LIMIT match_count;
END;
$$;

-- 7. 重新创建向量索引（768 维可以使用索引）
CREATE INDEX IF NOT EXISTS vector_item_embeddings_embedding_idx 
ON vector_item_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 8. 添加注释
COMMENT ON COLUMN vector_item_embeddings.embedding IS '向量维度: 768 (nomic-embed-text)';
