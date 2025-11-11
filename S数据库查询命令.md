# 项目数据库查询命令

## 数据库连接信息

根据你的项目配置，以下是数据库的详细信息：

- **容器名称**：`supabase_db_supabase`
- **主机**：`localhost`
- **端口**：`54322`
- **数据库名**：`postgres`
- **用户名**：`postgres`
- **密码**：`your-super-secret-jwt-token-with-at-least-32-characters-long`

---

## 使用 Docker 查看项目数据

### ⭐ 推荐：查看项目数据（简洁格式，前10条）

```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, name, description, status, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as created_at FROM projects ORDER BY created_at DESC LIMIT 10;"
```

### 1. 查看所有项目数据（完整信息，前10条）

```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT * FROM projects ORDER BY created_at DESC LIMIT 10;"
```

### 2. 查看项目数量

```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT COUNT(*) FROM projects;"
```

### 3. 查看项目详情（包含所有字段，前5条）

```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, name, description, status, owner_id, created_at, updated_at FROM projects ORDER BY created_at DESC LIMIT 5;"
```

### 3.1 查看前 N 条数据（可自定义数量）

```bash
# 查看前 3 条
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, name, status, created_at FROM projects ORDER BY created_at DESC LIMIT 3;"

# 查看前 20 条
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, name, status, created_at FROM projects ORDER BY created_at DESC LIMIT 20;"
```

### 4. 查看特定项目（按名称搜索，前5条）

```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, name, description, status FROM projects WHERE name LIKE '%项目%' LIMIT 5;"
```

### 5. 查看不同状态的项目（前10条）

```bash
# 查看所有进行中的项目（前10条）
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, name, description, created_at FROM projects WHERE status = 'active' LIMIT 10;"

# 查看所有已完成的项目（前10条）
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, name, description, created_at FROM projects WHERE status = 'completed' LIMIT 10;"

# 查看所有已暂停的项目（前10条）
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, name, description, created_at FROM projects WHERE status = 'paused' LIMIT 10;"
```

### 6. 按状态统计项目数量

```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT status, COUNT(*) FROM projects GROUP BY status;"
```

### 7. 查看表结构

```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "\d projects"
```

---

## 交互式查询（进入 psql 命令行）

如果需要执行多条查询，可以进入交互式模式：

```bash
docker exec -it supabase_db_supabase psql -U postgres -d postgres
```

进入后可以执行多个 SQL 命令：

```sql
-- 查看所有表
\dt

-- 查看 projects 表结构
\d projects

-- 查看所有项目
SELECT * FROM projects;

-- 查看项目数量
SELECT COUNT(*) FROM projects;

-- 按状态分组统计
SELECT status, COUNT(*) FROM projects GROUP BY status;

-- 退出
\q
```

---

## 常用查询命令速查（推荐）

### ⭐ 最简洁：只显示关键信息（前5条）
```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT name, status, TO_CHAR(created_at, 'MM-DD HH24:MI') as time FROM projects ORDER BY created_at DESC LIMIT 5;"
```

### 查看所有项目（格式化的，前10条）
```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, name, description, status, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at FROM projects ORDER BY created_at DESC LIMIT 10;"
```

### 查看最近创建的项目（前 5 条）
```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, name, status, created_at FROM projects ORDER BY created_at DESC LIMIT 5;"
```

### 查看项目总数和状态统计（简洁）
```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT '总项目数' as type, COUNT(*)::text as count FROM projects UNION ALL SELECT status, COUNT(*)::text FROM projects GROUP BY status;"
```

### 分页查询（查看第 1-10 条）
```bash
# 查看第 1-10 条（OFFSET 0）
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, name, status FROM projects ORDER BY created_at DESC LIMIT 10 OFFSET 0;"

# 查看第 11-20 条（OFFSET 10）
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, name, status FROM projects ORDER BY created_at DESC LIMIT 10 OFFSET 10;"
```

---

## 使用图形化工具连接

### DBeaver / TablePlus / pgAdmin

连接信息：
- **类型**：PostgreSQL
- **主机**：`localhost`
- **端口**：`54322`
- **数据库**：`postgres`
- **用户名**：`postgres`
- **密码**：`your-super-secret-jwt-token-with-at-least-32-characters-long`

连接后，在左侧导航栏：
- 展开 `Databases` → `postgres` → `Schemas` → `public` → `Tables` → `projects`
- 右键点击 `projects` → 选择 "View Data" 或 "查看数据"

---

## 注意事项

1. **容器必须运行**：确保 Docker 容器 `supabase_db_supabase` 正在运行
   ```bash
   docker ps | findstr supabase_db_supabase
   ```

2. **如果容器未运行**，启动容器：
   ```bash
   docker start supabase_db_supabase
   ```

3. **密码中的特殊字符**：密码中包含特殊字符，在命令行中使用时会被正确转义，无需额外处理。

