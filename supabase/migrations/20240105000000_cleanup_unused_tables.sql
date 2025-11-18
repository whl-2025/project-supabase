-- 清理无用的数据库表和函数
-- 删除AI问答相关的表（如果存在）

-- 删除AI消息表
DROP TABLE IF EXISTS ai_messages CASCADE;

-- 删除AI对话表
DROP TABLE IF EXISTS ai_conversations CASCADE;

-- 删除文档表（已被vector_items替代）
DROP TABLE IF EXISTS documents CASCADE;

-- 删除文档向量表（已被vector_item_embeddings替代）
DROP TABLE IF EXISTS document_embeddings CASCADE;

-- 删除旧的match_documents函数（如果存在）
DROP FUNCTION IF EXISTS match_documents(VECTOR(768), FLOAT, INT, UUID);
DROP FUNCTION IF EXISTS match_documents(VECTOR(1536), FLOAT, INT, UUID);

-- 清理ai_settings表中不需要的字段（保留embedding相关配置）
-- 注意：这里不删除字段，只是注释说明哪些字段不再需要
-- chat_model, temperature, max_tokens 等字段可以保留用于未来功能
-- 如果需要完全清理，可以执行：
-- ALTER TABLE ai_settings DROP COLUMN IF EXISTS chat_model;
-- ALTER TABLE ai_settings DROP COLUMN IF EXISTS temperature;
-- ALTER TABLE ai_settings DROP COLUMN IF EXISTS max_tokens;
-- ALTER TABLE ai_settings DROP COLUMN IF EXISTS ollama_url;

-- 删除旧的触发器（如果存在）
DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON ai_conversations;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;

-- 删除旧的索引（如果存在）
DROP INDEX IF EXISTS ai_conversations_user_id_idx;
DROP INDEX IF EXISTS ai_messages_conversation_id_idx;
DROP INDEX IF EXISTS documents_user_id_idx;
DROP INDEX IF EXISTS documents_status_idx;
DROP INDEX IF EXISTS document_embeddings_document_id_idx;
DROP INDEX IF EXISTS document_embeddings_embedding_idx;

