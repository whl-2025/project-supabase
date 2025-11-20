-- 为聊天系统添加用户邮箱字段

-- 1. 为 chat_messages 表添加 user_email 字段
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 2. 为 user_presence 表添加 user_email 字段
ALTER TABLE user_presence ADD COLUMN IF NOT EXISTS user_email TEXT;

-- 3. 添加注释
COMMENT ON COLUMN chat_messages.user_email IS '发送者邮箱';
COMMENT ON COLUMN user_presence.user_email IS '用户邮箱';
