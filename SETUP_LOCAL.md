# 本地 Supabase 开发环境配置指南

## 方法一：使用 Supabase CLI（推荐）

这是最简单的方法，Supabase CLI 会自动管理所有服务。

### 1. 安装 Supabase CLI

```bash
npm install -g supabase
```

或者在 Windows 上使用 Scoop:
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2. 初始化 Supabase

```bash
supabase init
```

### 3. 启动本地 Supabase

```bash
supabase start
```

这会启动所有必需的 Supabase 服务，并输出环境变量。

### 4. 复制环境变量

启动后，CLI 会显示类似以下的输出，将其复制到 `.env.local`：

```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. 更新 .env.local

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<上面显示的 anon key>
```

### 6. 执行数据库迁移

```bash
supabase db reset
```

或者手动执行 SQL:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/migrations/20240101000000_init_projects.sql
```

## 方法二：使用 Docker Compose

如果不想安装 Supabase CLI，可以使用我创建的 `docker-compose.yml`。

### 1. 启动服务

```bash
docker-compose up -d
```

### 2. 等待服务启动（约30秒）

### 3. 配置 .env.local

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### 4. 执行数据库迁移

```bash
# 使用 psql 连接到数据库
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/20240101000000_init_projects.sql
```

如果提示输入密码，使用：`your-super-secret-jwt-token-with-at-least-32-characters-long`

### 5. 访问 Supabase Studio

打开浏览器访问：http://localhost:54323

## 方法三：仅使用 PostgreSQL（最简单但不完整）

如果只需要数据库功能，可以使用简化配置：

```bash
docker-compose -f docker-compose.simple.yml up -d
```

然后配置 `.env.local`：
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

注意：这种方法需要手动配置 PostgREST 和 GoTrue，不推荐。

## 推荐方案

**强烈推荐使用方法一（Supabase CLI）**，因为：
- 自动配置所有服务
- 自动管理数据库迁移
- 提供 Studio 界面
- 更容易维护

## 停止服务

### Supabase CLI:
```bash
supabase stop
```

### Docker Compose:
```bash
docker-compose down
```

