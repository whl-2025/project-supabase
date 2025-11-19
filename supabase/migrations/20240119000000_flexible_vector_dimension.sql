-- 使用灵活的向量维度方案
-- 设置最大维度为 3072（支持大部分模型）

-- 1. 删除旧的索引和函数
DROP INDEX IF EXISTS vector_item_embeddings_embedding_idx;
DROP FUNCTION IF EXISTS search_vector_items(VECTOR, FLOAT, INT, UUID, TEXT);
DROP FUNCTION IF EXISTS recommend_similar_items(UUID, INT, FLOAT);

-- 2. 清空向量数据
DELETE FROM vector_item_embeddings;

-- 3. 修改向量维度为 3072（最大维度）
ALTER TABLE vector_item_embeddings 
ALTER COLUMN embedding TYPE VECTOR(3072);

-- 4. 添加实际维度字段
ALTER TABLE vector_item_embeddings 
ADD COLUMN IF NOT EXISTS actual_dimension INT DEFAULT 3072;

-- 5. 添加模型名称字段
ALTER TABLE vector_item_embeddings 
ADD COLUMN IF NOT EXISTS model_name TEXT;

-- 6. 创建灵活的搜索函数
CREATE OR REPLACE FUNCTION search_vector_items(
  query_embedding VECTOR(3072),
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

-- 7. 创建推荐函数
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
  item_embedding VECTOR(3072);
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

-- 8. 注释
COMMENT ON COLUMN vector_item_embeddings.embedding IS '向量维度: 3072 (最大维度，支持多种模型)';
COMMENT ON COLUMN vector_item_embeddings.actual_dimension IS '实际向量维度';
COMMENT ON COLUMN vector_item_embeddings.model_name IS '使用的模型名称';

-- 注意：3072 维太大，无法创建 ivfflat 索引（限制 2000 维）
-- 对于小数据量（< 10000 条），不使用索引也可以接受
-- 如果需要索引，建议使用维度 <= 2000 的模型
