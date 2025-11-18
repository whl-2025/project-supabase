-- 更新向量维度以支持 deepseek-coder (2048维)

-- 1. 删除旧的向量索引
DROP INDEX IF EXISTS vector_item_embeddings_embedding_idx;

-- 2. 删除旧的搜索函数
DROP FUNCTION IF EXISTS search_vector_items(VECTOR, FLOAT, INT, UUID, TEXT);
DROP FUNCTION IF EXISTS recommend_similar_items(UUID, INT, FLOAT);

-- 3. 修改 embedding 列的维度
ALTER TABLE vector_item_embeddings 
ALTER COLUMN embedding TYPE VECTOR(2048);

-- 4. 注意：ivfflat 索引最多支持 2000 维，2048 维无法创建索引
-- 对于小数据量，不使用索引也可以正常工作
-- 如果需要索引，可以考虑：
-- a) 使用维度更小的模型（如 nomic-embed-text 768维）
-- b) 使用 PCA 降维到 2000 维以下
-- c) 等待 pgvector 支持更高维度

-- 5. 重新创建搜索函数（使用新维度，不使用索引）
CREATE OR REPLACE FUNCTION search_vector_items(
  query_embedding VECTOR(2048),
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

-- 6. 重新创建推荐函数（使用新维度）
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
  item_embedding VECTOR(2048);
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
