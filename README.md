# 项目信息管理系统 Demo

基于 Next.js 15 + Supabase 的项目信息管理 Demo，展示完整的 CRUD 功能。

## 功能特性

- ✅ 用户认证（注册/登录）
- ✅ 项目列表展示
- ✅ 项目创建
- ✅ 项目编辑
- ✅ 项目删除
- ✅ 项目详情查看
- ✅ 行级安全策略（RLS）保护

## 技术栈

- **前端框架**: Next.js 15 (App Router)
- **UI 库**: React 19
- **样式**: Tailwind CSS
- **后端**: Supabase (PostgreSQL + Auth + REST API)
- **认证**: Supabase Auth

## 快速开始

### 1. 安装依赖

```bash
cd project-manager
npm install
# 或
pnpm install
```

### 2. 配置 Supabase

1. 在 [Supabase Dashboard](https://app.supabase.com) 创建新项目
2. 进入 **SQL Editor**，执行以下 SQL 创建表和权限：

```sql
-- 创建项目表
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用行级安全
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看自己的项目
CREATE POLICY "Users can view own projects"
ON projects FOR SELECT
USING (auth.uid() = owner_id);

-- 创建策略：用户只能创建自己的项目
CREATE POLICY "Users can create own projects"
ON projects FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- 创建策略：用户只能更新自己的项目
CREATE POLICY "Users can update own projects"
ON projects FOR UPDATE
USING (auth.uid() = owner_id);

-- 创建策略：用户只能删除自己的项目
CREATE POLICY "Users can delete own projects"
ON projects FOR DELETE
USING (auth.uid() = owner_id);
```

3. 在 **Authentication** → **Providers** 中启用 Email 认证

### 3. 配置环境变量

复制 `.env.local.example` 为 `.env.local`：

```bash
cp .env.local.example .env.local
```

填入你的 Supabase 配置：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

从 Supabase Dashboard → **Settings** → **API** 获取这些值。

### 4. 启动开发服务器

```bash
npm run dev
# 或
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 项目结构

```
project-manager/
├── app/                    # Next.js App Router 页面
│   ├── page.tsx           # 首页（项目列表）
│   ├── login/             # 登录页
│   ├── signup/            # 注册页
│   ├── projects/          # 项目相关页面
│   │   ├── new/           # 新建项目
│   │   └── [id]/          # 项目详情和编辑
│   └── auth/              # 认证路由
├── components/            # React 组件
│   ├── ProjectList.tsx    # 项目列表组件
│   └── ProjectForm.tsx    # 项目表单组件
├── utils/                 # 工具函数
│   └── supabase/          # Supabase 客户端配置
│       ├── client.ts      # 浏览器端客户端
│       └── server.ts      # 服务端客户端
└── middleware.ts          # Next.js 中间件（路由保护）
```

## 使用说明

1. **注册账户**: 访问 `/signup` 注册新账户
2. **登录**: 访问 `/login` 登录
3. **创建项目**: 登录后点击"新建项目"按钮
4. **查看项目**: 在首页查看所有项目
5. **编辑项目**: 点击项目卡片上的"编辑"按钮
6. **删除项目**: 点击项目卡片上的"删除"按钮

## 部署

### Vercel 部署

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量（`NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
4. 部署完成

## 注意事项

- 确保 Supabase 项目已启用 Email 认证
- 确保已创建 `projects` 表并配置 RLS 策略
- 生产环境建议使用更复杂的密码策略
- 可以根据需求扩展项目字段（如截止日期、优先级等）

## 许可证

MIT

