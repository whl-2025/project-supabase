-- 创建数据项表（用于向量搜索的内容）
CREATE TABLE IF NOT EXISTS vector_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建数据项向量表
CREATE TABLE IF NOT EXISTS vector_item_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES vector_items(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- OpenAI embeddings 维度
  chunk_index INT DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS vector_items_user_id_idx ON vector_items(user_id);
CREATE INDEX IF NOT EXISTS vector_items_category_idx ON vector_items(category);
CREATE INDEX IF NOT EXISTS vector_item_embeddings_item_id_idx ON vector_item_embeddings(item_id);

-- 创建向量索引
-- 注意：如果 pgvector 版本支持 HNSW，可以使用 HNSW 索引（性能更好）
-- 否则使用 ivfflat 索引
DO $$
BEGIN
  -- 尝试创建 HNSW 索引（如果支持）
  BEGIN
    CREATE INDEX IF NOT EXISTS vector_item_embeddings_embedding_idx 
    ON vector_item_embeddings 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  EXCEPTION
    WHEN OTHERS THEN
      -- 如果不支持 HNSW，使用 ivfflat 索引
      CREATE INDEX IF NOT EXISTS vector_item_embeddings_embedding_idx 
      ON vector_item_embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
  END;
END $$;

-- 启用行级安全
ALTER TABLE vector_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vector_item_embeddings ENABLE ROW LEVEL SECURITY;

-- 数据项策略
CREATE POLICY "Users can view own vector_items"
ON vector_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vector_items"
ON vector_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vector_items"
ON vector_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vector_items"
ON vector_items FOR DELETE
USING (auth.uid() = user_id);

-- 向量策略
CREATE POLICY "Users can view own vector_item_embeddings"
ON vector_item_embeddings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM vector_items 
  WHERE vector_items.id = vector_item_embeddings.item_id 
  AND vector_items.user_id = auth.uid()
));

CREATE POLICY "Users can insert own vector_item_embeddings"
ON vector_item_embeddings FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM vector_items 
  WHERE vector_items.id = vector_item_embeddings.item_id 
  AND vector_items.user_id = auth.uid()
));

CREATE POLICY "Users can delete own vector_item_embeddings"
ON vector_item_embeddings FOR DELETE
USING (EXISTS (
  SELECT 1 FROM vector_items 
  WHERE vector_items.id = vector_item_embeddings.item_id 
  AND vector_items.user_id = auth.uid()
));

-- 创建向量相似性搜索函数
CREATE OR REPLACE FUNCTION search_vector_items(
  query_embedding VECTOR(1536),
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

-- 创建推荐函数（基于相似性）
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
  item_embedding VECTOR(1536);
  item_user_id UUID;
BEGIN
  -- 获取目标项的嵌入向量和用户ID
  SELECT vie.embedding, vi.user_id INTO item_embedding, item_user_id
  FROM vector_item_embeddings vie
  JOIN vector_items vi ON vi.id = vie.item_id
  WHERE vi.id = item_id_param
  LIMIT 1;

  IF item_embedding IS NULL THEN
    RETURN;
  END IF;

  -- 查找相似项（排除自己）
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

-- 更新时间触发器
CREATE TRIGGER update_vector_items_updated_at
  BEFORE UPDATE ON vector_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 更新 ai_settings 表，添加 embedding_model 字段
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';

