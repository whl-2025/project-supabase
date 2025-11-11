# 快速启动指南

## ✅ 已完成
- ✅ Docker 容器已启动
- ✅ 数据库迁移已执行（projects 表已创建）

## 📝 下一步：配置环境变量

### 1. 更新 `.env.local` 文件

打开 `.env.local` 文件，填入以下配置：

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

**注意**：这是本地 Supabase 的默认 anon key。如果你使用的是 Supabase CLI，CLI 启动时会显示实际的 key，请使用那个。

### 2. 重启 Next.js 开发服务器

如果 `.env.local` 已存在，Next.js 会自动重新加载。如果没有自动加载，请重启开发服务器。

### 3. 访问应用

打开浏览器访问：**http://localhost:3000**

### 4. 测试功能

1. 访问 `/signup` 注册新账户
2. 访问 `/login` 登录
3. 登录后可以创建、查看、编辑和删除项目

## 🔍 服务端口

- **API 网关**: http://localhost:54321
- **PostgreSQL**: localhost:54322
- **Supabase Studio**: http://localhost:54323（如果已启动）
- **Next.js 应用**: http://localhost:3000

## 📚 获取实际的 ANON_KEY

如果你使用的是 Supabase CLI，运行以下命令获取实际的配置：

```bash
supabase status
```

这会显示所有服务的 URL 和密钥。

## 🛠️ 故障排除

### 如果遇到连接错误

1. 确保 Docker 容器都在运行：`docker ps`
2. 检查端口是否被占用：`netstat -ano | findstr :54321`
3. 查看容器日志：`docker logs supabase_kong_supabase`

### 如果数据库迁移失败

可以手动执行：
```bash
docker exec -i supabase_db_supabase psql -U postgres -d postgres < supabase/migrations/20240101000000_init_projects.sql
```

