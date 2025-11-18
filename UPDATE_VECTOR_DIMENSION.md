# 更新向量维度到 2048

## 问题说明

1. 数据库中的向量维度是 1536，但 deepseek-coder:1.3b 生成的是 2048 维向量
2. pgvector 的 ivfflat 索引最多支持 2000 维，无法为 2048 维创建索引
3. 对于小数据量（几千条以内），不使用索引也可以正常工作

## 解决方法

### 在 Supabase Studio 中执行 SQL

1. 打开浏览器访问: **http://localhost:54323**
2. 点击左侧菜单的 **"SQL Editor"**
3. 点击 **"New query"** 创建新查询
4. 复制下面的完整 SQL 并粘贴到编辑器中
5. 点击 **"Run"** 按钮执行

```sql
-- 更新向量维度以支持 deepseek-coder (2048维)

-- 1. 删除旧的向量索引
DROP INDEX IF EXISTS vector_item_embeddings_embedding_idx;

-- 2. 删除旧的搜索函数
DROP FUNCTION IF EXISTS search_vector_items(VECTOR, FLOAT, INT, UUID, TEXT);
DROP FUNCTION IF EXISTS recommend_similar_items(UUID, INT, FLOAT);

-- 3. 修改 embedding 列的维度
ALTER TABLE vector_item_embeddings 
ALTER COLUMN embedding TYPE VECTOR(2048);

-- 4. 重新创建搜索函数（使用新维度，不使用索引）
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

-- 5. 重新创建推荐函数（使用新维度）
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
```

## 执行后的步骤

1. 确认 SQL 执行成功（应该看到 "Success" 提示）
2. 刷新你的应用页面
3. 在"数据项管理"页面点击"创建测试数据"
4. 选择一个数据项，点击"向量化"按钮
5. 应该能看到成功提示："向量化完成，生成 X 个向量块"

## 关于索引的说明

由于 pgvector 的 ivfflat 索引最多支持 2000 维，而 deepseek-coder:1.3b 生成 2048 维向量，所以无法创建索引。

**影响：**
- 小数据量（几千条以内）：性能影响不大，可以正常使用
- 大数据量（几万条以上）：搜索可能会变慢

**解决方案（可选）：**

### 方案 1: 使用维度更小的模型（推荐）

安装并使用 nomic-embed-text（768维）：
```bash
ollama pull nomic-embed-text
```

然后在模型配置页面将模型改为 `nomic-embed-text`，并重新执行向量化。

### 方案 2: 继续使用 deepseek-coder

如果数据量不大（几千条以内），可以继续使用 deepseek-coder:1.3b，不需要索引也能正常工作。

## 验证（可选）

在 SQL Editor 中运行以下查询验证维度已更新：

```sql
SELECT 
  table_name, 
  column_name, 
  udt_name
FROM information_schema.columns 
WHERE table_name = 'vector_item_embeddings' 
AND column_name = 'embedding';
```
