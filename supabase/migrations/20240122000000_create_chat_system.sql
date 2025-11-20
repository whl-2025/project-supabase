-- 创建全局聊天系统

-- 1. 创建聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建在线状态表
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline')),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS user_presence_status_idx ON user_presence(status);

-- 4. 启用 RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略 - chat_messages

-- 所有登录用户可以查看消息
CREATE POLICY "Authenticated users can view messages"
ON chat_messages FOR SELECT
TO authenticated
USING (true);

-- 所有登录用户可以发送消息
CREATE POLICY "Authenticated users can send messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 用户可以删除自己的消息
CREATE POLICY "Users can delete own messages"
ON chat_messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 6. 创建 RLS 策略 - user_presence

-- 所有登录用户可以查看在线状态
CREATE POLICY "Authenticated users can view presence"
ON user_presence FOR SELECT
TO authenticated
USING (true);

-- 用户可以更新自己的在线状态
CREATE POLICY "Users can insert own presence"
ON user_presence FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence"
ON user_presence FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 7. 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- 8. 添加注释
COMMENT ON TABLE chat_messages IS '全局聊天消息';
COMMENT ON TABLE user_presence IS '用户在线状态';
COMMENT ON COLUMN chat_messages.content IS '消息内容';
COMMENT ON COLUMN user_presence.status IS '在线状态：online/offline';
COMMENT ON COLUMN user_presence.last_seen IS '最后活跃时间';
