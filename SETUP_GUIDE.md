# 系统设置指南

## 已实现的功能

### ✅ 核心功能
1. **仪表板** (`/home`) - 数据统计和快速操作
2. **项目管理** (`/projects`) - 项目 CRUD
3. **AI 助手** (`/ai/*`) - 知识库、智能问答、模型配置
4. **文件管理** (`/files`) - 文件列表和管理
5. **团队管理** (`/teams`) - 团队创建和成员管理
6. **活动日志** (`/activity`) - 操作历史记录
7. **通知中心** (`/notifications`) - 系统通知
8. **系统设置** (`/settings`) - 个人资料、密码、偏好设置

### ✅ 数据库表
- `files` - 文件记录
- `notifications` - 通知
- `activity_logs` - 活动日志
- `user_settings` - 用户设置
- `teams` - 团队
- `team_members` - 团队成员
- `project_members` - 项目成员

## 设置步骤

### 步骤 1: 执行数据库迁移

1. 打开 Supabase Studio: http://localhost:54323
2. 进入 SQL Editor
3. 执行以下迁移文件（按顺序）:

#### 迁移 1: 向量维度更新
文件: `supabase/migrations/20240107000000_update_vector_dimension_2048.sql`

```sql
-- 复制文件内容并执行
```

#### 迁移 2: 完整功能表
文件: `supabase/migrations/20240108000000_add_complete_features.sql`

```sql
-- 复制文件内容并执行
```

### 步骤 2: 生成测试数据

有两种方式生成测试数据：

#### 方式 1: 使用 API（推荐）

1. 确保已登录系统
2. 打开浏览器开发者工具（F12）
3. 在 Console 中执行：

```javascript
fetch('/api/test-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
}).then(res => res.json()).then(data => console.log(data));
```

#### 方式 2: 手动创建

在 Supabase Studio 的 SQL Editor 中执行：

```sql
-- 获取当前用户 ID（替换为你的用户 ID）
-- 可以在 Authentication > Users 中查看

-- 1. 创建用户设置
INSERT INTO user_settings (user_id, theme, language, bio)
VALUES ('你的用户ID', 'light', 'zh-CN', '这是测试用户');

-- 2. 创建通知
INSERT INTO notifications (user_id, title, content, type)
VALUES 
  ('你的用户ID', '欢迎使用', '欢迎使用项目管理系统', 'success'),
  ('你的用户ID', '系统更新', '系统已更新到最新版本', 'info'),
  ('你的用户ID', '项目提醒', '您有项目即将到期', 'warning');

-- 3. 创建活动日志
INSERT INTO activity_logs (user_id, action, resource_type, details)
VALUES 
  ('你的用户ID', 'create', 'project', '{"name": "测试项目"}'),
  ('你的用户ID', 'upload', 'file', '{"name": "文档.pdf"}'),
  ('你的用户ID', 'create', 'team', '{"name": "开发团队"}');

-- 4. 创建团队
INSERT INTO teams (name, description, owner_id)
VALUES ('开发团队', '核心开发团队', '你的用户ID');

-- 5. 创建文件记录
INSERT INTO files (user_id, name, size, mime_type, storage_path)
VALUES 
  ('你的用户ID', '需求文档.pdf', 1024000, 'application/pdf', 'docs/req.pdf'),
  ('你的用户ID', '设计稿.fig', 2048000, 'application/octet-stream', 'design/mockup.fig'),
  ('你的用户ID', '截图.png', 512000, 'image/png', 'images/screenshot.png');
```

### 步骤 3: 验证功能

1. **仪表板** - 访问 `/home`，查看统计数据
2. **通知中心** - 点击顶部铃铛图标，查看通知
3. **文件管理** - 访问 `/files`，查看文件列表
4. **团队管理** - 访问 `/teams`，查看团队
5. **活动日志** - 访问 `/activity`，查看操作记录
6. **系统设置** - 点击用户头像 > 系统设置

## 功能说明

### 仪表板
- 显示项目、文件、团队等统计数据
- 显示项目完成进度
- 显示最近项目和活动
- 提供快速操作入口

### 通知中心
- 查看所有通知
- 标记已读/未读
- 删除通知
- 通知类型：info、success、warning、error

### 文件管理
- 查看文件列表
- 显示文件大小、类型、上传时间
- 删除文件
- 注意：实际上传功能需要配置 Supabase Storage

### 团队管理
- 创建团队
- 查看团队成员数量
- 删除团队
- 团队角色：owner、admin、member

### 活动日志
- 查看所有操作记录
- 按时间倒序显示
- 显示操作类型、资源类型、详情

### 系统设置
- 个人资料：头像、邮箱、简介
- 修改密码
- 偏好设置：主题、语言、通知开关

## 注意事项

1. **向量维度问题**
   - 如果使用 `deepseek-coder:1.3b`，向量维度是 2048
   - 必须先执行向量维度更新迁移
   - 如果数据量大，建议使用 `nomic-embed-text`（768维，支持索引）

2. **文件上传**
   - 当前为演示模式，显示文件记录
   - 要启用实际上传，需要：
     - 在 Supabase Dashboard 创建 Storage Bucket
     - 配置 RLS 策略
     - 更新上传代码

3. **实时功能**
   - 通知数量会实时更新
   - 可以添加 Realtime 订阅实现更多实时功能

4. **权限控制**
   - 所有表都启用了 RLS
   - 用户只能访问自己的数据
   - 团队成员可以访问团队数据

## 下一步优化

1. **实时协作**
   - 使用 Supabase Realtime 订阅数据变更
   - 实时显示其他用户的操作

2. **文件上传**
   - 配置 Supabase Storage
   - 实现文件上传、下载、预览

3. **团队协作**
   - 邀请成员加入团队
   - 团队项目共享
   - 权限管理

4. **搜索功能**
   - 全局搜索
   - 高级筛选
   - 搜索建议

5. **数据可视化**
   - 更多图表
   - 趋势分析
   - 导出报告

## 故障排除

### 问题 1: 迁移执行失败
- 检查是否按顺序执行
- 检查是否有语法错误
- 查看 Supabase 日志

### 问题 2: 测试数据创建失败
- 确保已登录
- 检查用户 ID 是否正确
- 查看浏览器控制台错误

### 问题 3: 页面显示空白
- 检查是否执行了迁移
- 检查是否有数据
- 查看浏览器控制台错误

### 问题 4: 通知数量不更新
- 刷新页面
- 检查 RLS 策略
- 查看网络请求

## 技术栈

- **前端**: Next.js 14 + React + TypeScript + Ant Design
- **后端**: Supabase (PostgreSQL + PostgREST + GoTrue)
- **AI**: Ollama (本地) / OpenAI (云端)
- **向量数据库**: pgvector

## 联系支持

如有问题，请查看：
- Supabase 文档: https://supabase.com/docs
- Ant Design 文档: https://ant.design
- Next.js 文档: https://nextjs.org/docs
