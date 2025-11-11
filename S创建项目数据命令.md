# 使用命令创建项目表数据

## ⚠️ 重要提示：中文字符编码问题

**在 Windows PowerShell 中直接执行包含中文的 SQL 命令会导致编码错误，产生乱码数据！**

### 推荐解决方案：

1. **最佳方案：通过应用程序界面创建** - 直接在网页上创建项目，不会有任何编码问题。
2. **使用 SQL 文件** - 创建 UTF-8 编码的 SQL 文件，然后通过文件方式执行（见下方"方法三"）。
3. **使用英文名称** - 在命令行中只使用英文项目名，避免编码问题。
4. **使用图形化工具** - 使用 DBeaver、pgAdmin 等工具直接连接数据库插入数据。

### 为什么会出现乱码？

在 PowerShell 中执行 `docker exec ... psql -c "INSERT ..."` 时，中文字符在传递过程中可能被错误编码，导致数据库存储的是错误的字节序列，显示时就会出现乱码。

---

## 前提说明

项目表 (`projects`) 有行级安全策略 (RLS)，正常情况下只能通过应用程序创建数据。但为了测试和开发，我们可以使用以下方法直接插入数据。

## 方法一：使用 postgres 超级用户直接插入（推荐）

以 `postgres` 超级用户身份插入数据，可以绕过 RLS 策略。

### 1. 先获取用户 ID

```bash
# 查看所有用户
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, email, raw_user_meta_data->>'username' as username FROM auth.users ORDER BY created_at DESC LIMIT 5;"
```

### 2. 创建单个项目

```bash
# 替换 <USER_ID> 为实际的用户 ID
docker exec supabase_db_supabase psql -U postgres -d postgres -c "INSERT INTO projects (name, description, status, owner_id) VALUES ('测试项目1', '这是一个测试项目的描述', 'active', '<USER_ID>');"
```

### 3. 批量创建多个项目

```bash
# 替换 <USER_ID> 为实际的用户 ID
docker exec supabase_db_supabase psql -U postgres -d postgres -c "INSERT INTO projects (name, description, status, owner_id) VALUES 
('网站开发项目', '开发公司官网', 'active', '<USER_ID>'),
('移动应用开发', 'iOS和Android应用开发', 'active', '<USER_ID>'),
('数据分析项目', '客户行为数据分析', 'paused', '<USER_ID>'),
('市场调研', '新产品市场调研', 'completed', '<USER_ID>'),
('系统升级', '服务器系统升级', 'active', '<USER_ID>');"
```

---

## 方法二：使用变量快速插入（推荐）

### 1. 获取第一个用户 ID 并插入

```bash
# 获取第一个用户的 ID 并插入项目（Windows PowerShell）
$USER_ID = docker exec supabase_db_supabase psql -U postgres -d postgres -t -c "SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1;"
$USER_ID = $USER_ID.Trim()
docker exec supabase_db_supabase psql -U postgres -d postgres -c "INSERT INTO projects (name, description, status, owner_id) VALUES ('新项目', '项目描述', 'active', '$USER_ID');"
```

### 2. 批量插入示例数据

```bash
# 获取用户 ID
$USER_ID = docker exec supabase_db_supabase psql -U postgres -d postgres -t -c "SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1;"
$USER_ID = $USER_ID.Trim()

# 批量插入
docker exec supabase_db_supabase psql -U postgres -d postgres -c @"
INSERT INTO projects (name, description, status, owner_id) VALUES 
('网站开发项目', '开发公司官网', 'active', '$USER_ID'),
('移动应用开发', 'iOS和Android应用开发', 'active', '$USER_ID'),
('数据分析项目', '客户行为数据分析', 'paused', '$USER_ID'),
('市场调研', '新产品市场调研', 'completed', '$USER_ID'),
('系统升级', '服务器系统升级', 'active', '$USER_ID');
"@
```

---

## 方法三：使用 SQL 文件插入中文数据（推荐，避免编码问题）⭐

这是插入中文数据的最佳方式，可以完全避免 PowerShell 编码问题。

### 步骤：

1. **创建 SQL 文件**（确保文件是 UTF-8 编码）

创建文件 `insert_project.sql`：
```sql
-- 插入中文项目数据
INSERT INTO projects (name, description, status, owner_id) 
SELECT '数据分析项目', '客户行为数据分析系统', 'paused', id 
FROM auth.users ORDER BY created_at DESC LIMIT 1;
```

2. **执行 SQL 文件**

```bash
docker exec -i supabase_db_supabase psql -U postgres -d postgres < insert_project.sql
```

### 批量插入示例

创建 `insert_projects.sql`：
```sql
-- 批量插入中文项目
INSERT INTO projects (name, description, status, owner_id) 
SELECT '网站开发项目', '开发公司官网系统', 'active', id FROM auth.users ORDER BY created_at DESC LIMIT 1
UNION ALL
SELECT '移动应用开发', 'iOS和Android应用开发项目', 'active', id FROM auth.users ORDER BY created_at DESC LIMIT 1
UNION ALL
SELECT '数据分析项目', '客户行为数据分析系统', 'paused', id FROM auth.users ORDER BY created_at DESC LIMIT 1;
```

然后执行：
```bash
docker exec -i supabase_db_supabase psql -U postgres -d postgres < insert_projects.sql
```

---

## 方法四：使用固定用户 ID（适用于已知用户）

如果你知道用户 ID，可以直接使用：

```bash
# 使用 admin 用户（如果存在）
docker exec supabase_db_supabase psql -U postgres -d postgres -c "INSERT INTO projects (name, description, status, owner_id) VALUES ('我的项目', '项目描述信息', 'active', 'a3ca897f-ef9d-4fad-92a9-60e3631fbd02');"
```

---

## 快速插入测试数据（一行命令）

```bash
# 自动获取第一个用户并插入一个测试项目
docker exec supabase_db_supabase psql -U postgres -d postgres -c "INSERT INTO projects (name, description, status, owner_id) SELECT '测试项目', '这是一个测试项目', 'active', id FROM auth.users ORDER BY created_at DESC LIMIT 1;"
```

---

## 验证插入的数据

```bash
# 查看刚插入的项目
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT id, name, status, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as created_at FROM projects ORDER BY created_at DESC LIMIT 5;"
```

---

## 删除测试数据（可选）

```bash
# 删除所有项目数据
docker exec supabase_db_supabase psql -U postgres -d postgres -c "DELETE FROM projects;"

# 删除特定项目（根据名称）
docker exec supabase_db_supabase psql -U postgres -d postgres -c "DELETE FROM projects WHERE name = '测试项目';"
```

---

## 注意事项

1. **⚠️ 中文编码问题**：在 PowerShell 中直接执行包含中文的 SQL 命令会导致编码错误，产生乱码数据。强烈建议使用 SQL 文件方式（方法三）或通过应用程序界面创建。
2. **RLS 策略**：虽然有 RLS，但使用 `postgres` 超级用户可以直接插入数据。
3. **owner_id**：必须使用有效的用户 ID，否则会违反外键约束。
4. **status**：只能使用 `'active'`, `'completed'`, `'paused'` 三个值之一。
5. **时间戳**：`created_at` 和 `updated_at` 会自动设置，无需手动指定。

---

## 常用命令速查

### 创建单个项目
```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "INSERT INTO projects (name, description, status, owner_id) SELECT '项目名称', '项目描述', 'active', id FROM auth.users ORDER BY created_at DESC LIMIT 1;"
```

### 创建多个项目
```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "INSERT INTO projects (name, description, status, owner_id) SELECT '项目1', '描述1', 'active', id FROM auth.users ORDER BY created_at DESC LIMIT 1 UNION ALL SELECT '项目2', '描述2', 'paused', id FROM auth.users ORDER BY created_at DESC LIMIT 1;"
```

### 查看所有项目
```bash
docker exec supabase_db_supabase psql -U postgres -d postgres -c "SELECT name, status, TO_CHAR(created_at, 'MM-DD HH24:MI') as time FROM projects ORDER BY created_at DESC LIMIT 10;"
```

