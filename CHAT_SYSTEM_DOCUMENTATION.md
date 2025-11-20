# 聊天室系统实现文档
┌─────────────────────────────────────────────────────────────┐
│                    Realtime 完整流程                          │
└─────────────────────────────────────────────────────────────┘

1. 数据库配置
   ↓
   ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
   (启用表的实时推送)

2. 前端订阅
   ↓
   supabase.channel('global-chat')
   .on('postgres_changes', {...}, callback)
   .subscribe()
   (建立 WebSocket 连接)

3. 用户A发送消息
   ↓
   INSERT INTO chat_messages (...)
   (普通数据库插入)

4. PostgreSQL 触发器
   ↓
   检测到表变化 → 发送到 Realtime 服务器

5. Realtime 服务器
   ↓
   通过 WebSocket 推送给所有订阅的客户端

6. 所有客户端收到推送
   ↓
   用户A浏览器 ← WebSocket ← Realtime 服务器
   用户B浏览器 ← WebSocket ← Realtime 服务器
   用户C浏览器 ← WebSocket ← Realtime 服务器

7. 执行回调函数
   ↓
   (payload) => {
     const newMessage = payload.new;
     setMessages(prev => [...prev, newMessage]);
   }

8. 界面更新
   ↓
   所有用户看到新消息


## 系统概述

这是一个基于 Supabase 实时数据库的全局聊天室系统，所有登录用户都可以实时交流。系统使用 PostgreSQL 存储数据，通过 Supabase Realtime 实现消息的实时推送。

---

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI 组件库**: Ant Design 5
- **数据库**: PostgreSQL (Supabase)
- **实时通信**: Supabase Realtime (基于 WebSocket)
- **认证**: Supabase Auth

---

## 数据库设计

### 1. chat_messages 表（聊天消息）

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**字段说明：**
- `id`: 消息唯一标识
- `user_id`: 发送者用户ID（外键关联 auth.users）
- `user_email`: 发送者邮箱（冗余字段，避免频繁查询用户表）
- `content`: 消息内容（最大1000字符）
- `created_at`: 发送时间

**索引：**
- `chat_messages_user_id_idx`: 用户ID索引，快速查询某用户的消息
- `chat_messages_created_at_idx`: 时间倒序索引，快速获取最新消息

### 2. user_presence 表（在线状态）

```sql
CREATE TABLE user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline')),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);
```

**字段说明：**
- `user_id`: 用户ID（主键）
- `user_email`: 用户邮箱
- `status`: 在线状态（online/offline）
- `last_seen`: 最后活跃时间

**索引：**
- `user_presence_status_idx`: 状态索引，快速查询在线用户

---

## 安全策略（RLS）

### chat_messages 表策略

1. **查看消息**：所有登录用户可以查看所有消息
```sql
CREATE POLICY "Authenticated users can view messages"
ON chat_messages FOR SELECT
TO authenticated
USING (true);
```

2. **发送消息**：用户只能以自己的身份发送消息
```sql
CREATE POLICY "Authenticated users can send messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

3. **删除消息**：用户只能删除自己的消息
```sql
CREATE POLICY "Users can delete own messages"
ON chat_messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

### user_presence 表策略

1. **查看在线状态**：所有登录用户可以查看所有人的在线状态
```sql
CREATE POLICY "Authenticated users can view presence"
ON user_presence FOR SELECT
TO authenticated
USING (true);
```

2. **更新在线状态**：用户只能更新自己的在线状态
```sql
CREATE POLICY "Users can insert own presence"
ON user_presence FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence"
ON user_presence FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
```

---

## 实时通信机制

### Realtime 配置

```sql
-- 启用 Realtime 发布
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
```

这使得表的变化（INSERT/UPDATE/DELETE）会通过 WebSocket 实时推送给订阅的客户端。

---

## 前端实现流程

### 组件结构

```
app/chat/page.tsx          # 聊天室页面
  └─ components/GlobalChat.tsx  # 聊天组件
```

### 核心状态管理

```typescript
const [messages, setMessages] = useState<Message[]>([]);        // 消息列表
const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]); // 在线用户
const [inputValue, setInputValue] = useState('');               // 输入框内容
const [currentUserId, setCurrentUserId] = useState<string>(''); // 当前用户ID
const [currentUserEmail, setCurrentUserEmail] = useState<string>(''); // 当前用户邮箱
```

### 初始化流程

```
1. 组件挂载
   ↓
2. 获取当前登录用户信息
   ├─ 设置 currentUserId
   ├─ 设置 currentUserEmail
   └─ 更新在线状态为 'online'
   ↓
3. 加载历史消息（最近100条）
   ↓
4. 获取在线用户列表（5分钟内活跃）
   ↓
5. 订阅实时更新
   ├─ 订阅 chat_messages 表的 INSERT 事件
   └─ 订阅 user_presence 表的所有事件
```

### 详细实现步骤

#### 1. 用户认证与在线状态初始化

```typescript
useEffect(() => {
  const getUser = async () => {
    // 获取当前登录用户
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      setCurrentUserEmail(user.email || '未知用户');
      
      // 更新在线状态
      await updatePresence(user.id, user.email || '未知用户', 'online');
      
      // 获取在线用户列表
      await fetchOnlineUsers();
    }
  };
  getUser();

  // 组件卸载时设置为离线
  return () => {
    if (currentUserId) {
      updatePresence(currentUserId, currentUserEmail, 'offline');
    }
  };
}, []);
```

#### 2. 加载历史消息

```typescript
useEffect(() => {
  const fetchMessages = async () => {
    setLoading(true);
    
    // 查询最近100条消息，按时间升序
    const { data: messagesData, error } = await supabase
      .from('chat_messages')
      .select('id, user_id, user_email, content, created_at')
      .order('created_at', { ascending: true })
      .limit(100);

    if (messagesData) {
      setMessages(messagesData);
    }
    
    setLoading(false);
  };

  if (currentUserId) {
    fetchMessages();
  }
}, [currentUserId]);
```

#### 3. 订阅实时消息

```typescript
useEffect(() => {
  if (!currentUserId) return;

  const channel = supabase
    .channel('global-chat')  // 创建频道
    .on(
      'postgres_changes',
      {
        event: 'INSERT',           // 监听插入事件
        schema: 'public',
        table: 'chat_messages'
      },
      (payload) => {
        // 收到新消息，添加到列表
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
        setTimeout(scrollToBottom, 100);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',                // 监听所有事件
        schema: 'public',
        table: 'user_presence'
      },
      () => {
        // 在线状态变化，重新获取在线用户
        fetchOnlineUsers();
      }
    )
    .subscribe();  // 开始订阅

  // 组件卸载时取消订阅
  return () => {
    channel.unsubscribe();
  };
}, [currentUserId]);
```

#### 4. 发送消息流程

```typescript
const handleSend = async () => {
  // 1. 验证输入
  if (!inputValue.trim()) {
    message.warning('请输入消息内容');
    return;
  }

  // 2. 插入消息到数据库
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: currentUserId,
      user_email: currentUserEmail,
      content: inputValue.trim(),
    })
    .select();

  if (error) {
    message.error('发送失败');
    return;
  }

  // 3. 清空输入框
  setInputValue('');
  
  // 4. 更新在线状态（保持活跃）
  await updatePresence(currentUserId, currentUserEmail, 'online');
};
```

**注意**：发送消息后不需要手动添加到消息列表，因为：
1. 数据库插入成功后会触发 Realtime 的 INSERT 事件
2. 订阅的回调函数会自动将新消息添加到列表
3. 这样可以确保所有客户端看到的消息顺序一致

#### 5. 获取在线用户

```typescript
const fetchOnlineUsers = async () => {
  // 查询5分钟内活跃的在线用户
  const { data, error } = await supabase
    .from('user_presence')
    .select('user_id, user_email, status, last_seen')
    .eq('status', 'online')
    .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());

  if (data) {
    setOnlineUsers(data);
  }
};
```

#### 6. 更新在线状态

```typescript
const updatePresence = async (
  userId: string, 
  userEmail: string, 
  status: 'online' | 'offline'
) => {
  // 使用 upsert 插入或更新
  await supabase
    .from('user_presence')
    .upsert({
      user_id: userId,
      user_email: userEmail,
      status,
      last_seen: new Date().toISOString(),
    });
};
```

---

## 消息流转过程

### 发送消息的完整流程

```
用户A输入消息并点击发送
  ↓
前端验证（非空、长度限制）
  ↓
调用 Supabase insert API
  ↓
PostgreSQL 插入数据到 chat_messages 表
  ↓
RLS 策略验证（检查 user_id 是否匹配）
  ↓
插入成功，触发 Realtime 事件
  ↓
Supabase Realtime 服务器推送事件
  ↓
所有订阅的客户端收到事件
  ├─ 用户A的浏览器
  ├─ 用户B的浏览器
  └─ 用户C的浏览器
  ↓
各客户端更新消息列表
  ↓
自动滚动到底部
```

### 在线状态更新流程

```
用户进入聊天室
  ↓
调用 updatePresence('online')
  ↓
upsert 到 user_presence 表
  ↓
触发 Realtime 事件
  ↓
所有客户端收到事件
  ↓
重新获取在线用户列表
  ↓
更新在线成员显示
```

---

## 性能优化

### 1. 消息分页加载
- 初始只加载最近100条消息
- 可扩展：实现向上滚动加载更多历史消息

### 2. 在线用户过滤
- 只显示5分钟内活跃的用户
- 避免显示已离线但未更新状态的用户

### 3. 实时订阅优化
- 使用单个 channel 订阅多个表
- 组件卸载时及时取消订阅，避免内存泄漏

### 4. 数据库索引
- 为常用查询字段添加索引
- 时间字段使用倒序索引，优化最新消息查询

---

## 用户体验优化

### 1. 自动滚动
```typescript
useEffect(() => {
  scrollToBottom();
}, [messages]);
```
新消息到达时自动滚动到底部

### 2. 键盘快捷键
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};
```
- Enter 发送消息
- Shift+Enter 换行

### 3. 消息时间格式化
```typescript
const formatTime = (dateString: string) => {
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};
```

### 4. 消息气泡样式
- 自己的消息：右对齐，蓝色背景
- 他人的消息：左对齐，灰色背景
- 显示发送者邮箱和时间

---

## 错误处理

### 1. 网络错误
```typescript
try {
  const { error } = await supabase.from('chat_messages').insert(...);
  if (error) throw error;
} catch (err) {
  console.error('发送消息失败:', err);
  message.error('发送失败: ' + err.message);
}
```

### 2. 认证错误
- 未登录用户无法访问聊天室
- RLS 策略自动拒绝未授权操作

### 3. 实时连接断开
- Supabase 客户端会自动重连
- 重连后自动重新订阅

---

## 扩展功能建议

### 1. 消息类型扩展
- 支持图片、文件、表情
- 支持 @提及用户
- 支持消息回复

### 2. 消息管理
- 消息编辑
- 消息撤回（限时）
- 消息搜索

### 3. 用户功能
- 用户头像
- 用户昵称
- 用户状态（忙碌、离开等）

### 4. 聊天室功能
- 多个聊天室/频道
- 私聊功能
- 消息已读状态

### 5. 通知功能
- 新消息桌面通知
- 消息提示音
- 未读消息计数

---

## 部署注意事项

### 1. 数据库迁移
按顺序执行迁移文件：
```
20240122000000_create_chat_system.sql
20240123000000_add_user_email_to_chat.sql
```

### 2. Realtime 配置
确保 Supabase 项目启用了 Realtime 功能

### 3. RLS 策略
确保所有 RLS 策略正确配置，避免安全漏洞

### 4. 环境变量
配置正确的 Supabase URL 和 anon key

---

## 故障排查

### 问题1：消息发送后不显示
**原因**：可能是 Realtime 未正确订阅
**解决**：检查浏览器控制台，确认 WebSocket 连接成功

### 问题2：在线用户数为0
**原因**：在线状态未正确更新
**解决**：检查 updatePresence 函数是否正确调用

### 问题3：历史消息加载失败
**原因**：RLS 策略或数据库字段问题
**解决**：检查数据库表结构和 RLS 策略配置

### 问题4：消息重复显示
**原因**：实时订阅回调中重复添加消息
**解决**：确保不在发送消息后手动添加到列表

---

## 总结

这个聊天室系统利用了 Supabase 的核心功能：
- **PostgreSQL**：可靠的数据存储
- **RLS**：细粒度的安全控制
- **Realtime**：低延迟的实时通信
- **Auth**：简单的用户认证

通过合理的数据库设计、安全策略和前端状态管理，实现了一个功能完整、性能良好的实时聊天系统。
