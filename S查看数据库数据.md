# 查看 PostgreSQL 数据库数据指南

## 方法一：使用 Supabase Studio（需要 CLI）

**注意**：如果 `supabase` 命令不可用，需要先安装 Supabase CLI。

### 安装 Supabase CLI（Windows）

**注意**：Supabase CLI 不支持通过 `npm install -g` 安装。

**推荐方法：使用 Scoop（最简单）**

1. 首先安装 Scoop（如果还没有）：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
```

2. 安装 Supabase CLI：
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**或者：直接下载二进制文件**

1. 访问：https://github.com/supabase/cli/releases
2. 下载最新版本的 `supabase_windows-amd64.exe`
3. 重命名为 `supabase.exe`
4. 放到 `PATH` 环境变量中的目录（如 `C:\Windows\System32`）或添加到 PATH

### 启动 Studio

```bash
supabase start
```

然后访问：**http://localhost:54323**

### 查看数据

- 在左侧菜单中，点击 **"Table Editor"**
- 选择 `projects` 表
- 即可查看所有项目数据

### 编辑数据

- 可以直接在表格中编辑数据
- 点击 **"Insert"** 按钮添加新记录
- 点击行右侧的 **"..."** 菜单可以删除记录

---

## 方法二：使用 psql 命令行工具

### 1. 直接连接（如果已安装 PostgreSQL）

```bash
psql -h localhost -p 54322 -U postgres -d postgres
```

密码：`your-super-secret-jwt-token-with-at-least-32-characters-long`

### 2. 使用 Docker exec 进入容器

```bash
docker exec -it supabase-postgres psql -U postgres -d postgres
```

### 3. 常用 SQL 查询命令

```sql
-- 查看所有表
\dt

-- 查看 projects 表结构
\d projects

-- 查看所有项目数据
SELECT * FROM projects;

-- 查看特定项目
SELECT * FROM projects WHERE id = 'your-project-id';

-- 查看项目数量
SELECT COUNT(*) FROM projects;

-- 按状态分组统计
SELECT status, COUNT(*) FROM projects GROUP BY status;

-- 退出
\q
```

---

## 方法三：使用图形化工具

### 1. pgAdmin（推荐）

1. 下载安装 pgAdmin：https://www.pgadmin.org/download/
2. 添加新服务器：
   - **名称**：Local Supabase
   - **主机**：localhost
   - **端口**：54322
   - **数据库**：postgres
   - **用户名**：postgres
   - **密码**：your-super-secret-jwt-token-with-at-least-32-characters-long

3. 连接后，在左侧导航栏：
   - 展开 **Databases** → **postgres** → **Schemas** → **public** → **Tables**
   - 右键点击 `projects` 表 → **View/Edit Data** → **All Rows**

### 2. DBeaver（跨平台）

1. 下载安装 DBeaver：https://dbeaver.io/download/
2. 创建新连接：
   - 选择 **PostgreSQL**
   - **主机**：localhost
   - **端口**：54322
   - **数据库**：postgres
   - **用户名**：postgres
   - **密码**：your-super-secret-jwt-token-with-at-least-32-characters-long

3. 连接后，在左侧导航栏：
   - 展开 **Databases** → **postgres** → **Schemas** → **public** → **Tables** → **projects**
   - 右键点击 `projects` → **View Data**

### 3. TablePlus（Mac/Windows）

1. 下载安装 TablePlus：https://tableplus.com/
2. 创建新连接：
   - 选择 **PostgreSQL**
   - **Host**：localhost
   - **Port**：54322
   - **Database**：postgres
   - **User**：postgres
   - **Password**：your-super-secret-jwt-token-with-at-least-32-characters-long

3. 连接后，在左侧导航栏选择 `projects` 表即可查看数据

---

## 方法四：使用 Docker 命令快速查询

### 查看所有项目

```bash
docker exec supabase-postgres psql -U postgres -d postgres -c "SELECT * FROM projects;"
```

### 查看项目数量

```bash
docker exec supabase-postgres psql -U postgres -d postgres -c "SELECT COUNT(*) FROM projects;"
```

### 查看表结构

```bash
docker exec supabase-postgres psql -U postgres -d postgres -c "\d projects"
```

---

## 方法五：在 Next.js 应用中查看（开发调试）

你可以在代码中添加临时的 API 路由来查看数据：

创建 `app/api/debug/projects/route.ts`:

```typescript
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

然后访问：**http://localhost:3000/api/debug/projects**

---

## 推荐方案

**强烈推荐使用方法一（Supabase Studio）**，因为：
- ✅ 图形化界面，操作简单
- ✅ 无需额外安装工具
- ✅ 可以直接编辑数据
- ✅ 支持 SQL 查询编辑器
- ✅ 查看表结构、关系等

---

## 常见问题

### Q: Studio 无法访问？

检查 Docker 容器是否运行：
```bash
docker ps
```

确保 `supabase-studio` 容器正在运行。

### Q: 忘记密码？

默认密码是：`your-super-secret-jwt-token-with-at-least-32-characters-long`

### Q: 端口被占用？

检查端口占用：
```bash
# Windows
netstat -ano | findstr :54322
netstat -ano | findstr :54323

# Linux/Mac
lsof -i :54322
lsof -i :54323
```

### Q: 如何备份数据？

```bash
docker exec supabase-postgres pg_dump -U postgres postgres > backup.sql
```

### Q: 如何恢复数据？

```bash
docker exec -i supabase-postgres psql -U postgres postgres < backup.sql
```

