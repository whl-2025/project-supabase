-- 清理 ai_settings 表，移除不需要的字段（可选）
-- 注意：这些字段不影响功能，可以保留以保持兼容性

-- 如果确定不需要这些字段，可以取消注释下面的代码来删除它们
-- ALTER TABLE ai_settings DROP COLUMN IF EXISTS ollama_url;
-- ALTER TABLE ai_settings DROP COLUMN IF EXISTS chat_model;
-- ALTER TABLE ai_settings DROP COLUMN IF EXISTS temperature;
-- ALTER TABLE ai_settings DROP COLUMN IF EXISTS max_tokens;

-- 保留这些字段，但更新默认值以匹配向量搜索的需求
-- 实际上这些字段不会影响功能，可以保留

-- 确保 embedding_model 字段存在
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';

-- 更新 max_results 默认值为 10（更适合向量搜索）
ALTER TABLE ai_settings ALTER COLUMN max_results SET DEFAULT 10;

