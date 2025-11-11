# Supabase 启动问题解决方案

## 🔍 问题诊断

### 问题现象
- Supabase 启动不成功
- 多个服务容器处于 `Restarting` 状态
- 端口冲突错误（端口已被占用）

### 根本原因
1. **数据库容器停止**：`supabase_db_supabase` 容器被停止（状态：Exited (137)）
2. **服务依赖问题**：其他服务（storage, auth, realtime, vector）依赖数据库，无法连接时不断重启
3. **端口占用**：旧的容器占用端口，导致新容器无法启动

---

## ✅ 解决方案

### 方案一：重启数据库容器（推荐）

如果数据库容器停止了，只需重启它：

```bash
# 1. 检查数据库容器状态
docker ps -a --filter "name=supabase_db"

# 2. 启动数据库容器
docker start supabase_db_supabase

# 3. 等待数据库完全启动（约10-20秒）
Start-Sleep -Seconds 10

# 4. 重启依赖数据库的服务
docker restart supabase_storage_supabase supabase_realtime_supabase supabase_auth_supabase supabase_vector_supabase

# 5. 检查所有服务状态
docker ps --filter "name=supabase" --format "table {{.Names}}\t{{.Status}}"
```

### 方案二：停止所有容器并重新启动

如果方案一不行，完全清理并重新启动：

```bash
# 1. 停止所有 Supabase 容器
docker ps -a --filter "name=supabase" --format "{{.Names}}" | ForEach-Object { docker stop $_ }

# 2. 启动所有容器（使用 Supabase CLI 或 docker-compose）
# 如果使用 Supabase CLI:
supabase start

# 如果使用 docker-compose:
docker-compose up -d
```

### 方案三：解决端口冲突

如果遇到端口占用错误：

```bash
# 1. 查看占用端口的容器
docker ps --filter "publish=54321" --format "{{.Names}}"
docker ps --filter "publish=54322" --format "{{.Names}}"

# 2. 停止占用端口的容器
docker stop <容器名称>

# 3. 重新启动服务
supabase start
# 或
docker-compose up -d
```

---

## 📋 检查清单

### ✅ 核心服务状态检查

运行以下命令检查所有服务状态：

```bash
docker ps --filter "name=supabase" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**应该看到：**
- ✅ `supabase_db_supabase` - Up (healthy) - 端口 54322
- ✅ `supabase_kong_supabase` - Up (healthy) - 端口 54321
- ✅ `supabase_auth_supabase` - Up (healthy)
- ✅ `supabase_storage_supabase` - Up (healthy)
- ✅ `supabase_rest_supabase` - Up

**如果看到 `Restarting` 状态：**
- 检查该服务的日志：`docker logs <容器名称> --tail 20`
- 通常是因为无法连接到数据库

---

## 🐛 常见错误和解决方法

### 错误 1: `getaddrinfo ENOTFOUND supabase_db_supabase`

**原因：** 数据库容器停止，其他服务无法解析主机名

**解决：**
```bash
docker start supabase_db_supabase
# 等待 10-20 秒
docker restart supabase_storage_supabase supabase_auth_supabase
```

### 错误 2: `port is already allocated`

**原因：** 端口被其他容器占用

**解决：**
```bash
# 查找占用端口的容器
docker ps --filter "publish=54322"

# 停止占用端口的容器
docker stop <容器名称>

# 重新启动
supabase start
```

### 错误 3: `failed to connect to database`

**原因：** 数据库容器未完全启动，或数据库连接配置错误

**解决：**
```bash
# 1. 检查数据库容器状态
docker ps --filter "name=db_supabase"

# 2. 查看数据库日志
docker logs supabase_db_supabase --tail 50

# 3. 确保数据库容器健康
docker ps --filter "name=db_supabase" --filter "health=healthy"
```

---

## 🔧 快速修复命令

如果遇到问题，可以运行以下命令快速修复：

```powershell
# 1. 停止所有 Supabase 容器
docker ps -a --filter "name=supabase" --format "{{.Names}}" | ForEach-Object { docker stop $_ }

# 2. 启动数据库容器
docker start supabase_db_supabase

# 3. 等待数据库启动
Start-Sleep -Seconds 15

# 4. 启动其他服务容器
docker ps -a --filter "name=supabase" --format "{{.Names}}" | ForEach-Object { docker start $_ }

# 5. 等待服务启动
Start-Sleep -Seconds 10

# 6. 检查状态
docker ps --filter "name=supabase" --format "table {{.Names}}\t{{.Status}}"
```

---

## 📊 当前服务状态

运行以下命令查看当前状态：

```bash
docker ps --filter "name=supabase" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 预期状态

```
NAMES                         STATUS                    PORTS
supabase_db_supabase          Up X minutes (healthy)    0.0.0.0:54322->5432/tcp
supabase_kong_supabase        Up X minutes (healthy)    0.0.0.0:54321->8000/tcp
supabase_auth_supabase        Up X minutes (healthy)   9999/tcp
supabase_storage_supabase     Up X minutes (healthy)    5000/tcp
supabase_rest_supabase        Up X minutes              3000/tcp
supabase_realtime_supabase    Up X minutes (healthy)    4000/tcp
supabase_pg_meta_supabase     Up X minutes (healthy)    8080/tcp
supabase_analytics_supabase   Up X minutes (healthy)    0.0.0.0:54327->4000/tcp
supabase_inbucket_supabase    Up X minutes (healthy)    0.0.0.0:54324->8025/tcp
```

---

## 💡 预防措施

1. **不要手动停止数据库容器**：数据库容器是核心服务，停止会导致所有服务失败

2. **使用 Supabase CLI 管理服务**：
   ```bash
   supabase start   # 启动所有服务
   supabase stop    # 停止所有服务
   supabase status  # 查看状态
   ```

3. **定期检查容器状态**：
   ```bash
   docker ps --filter "name=supabase"
   ```

4. **遇到问题先查看日志**：
   ```bash
   docker logs <容器名称> --tail 50
   ```

---

## 📚 相关文档

- [前端配置指南.md](./前端配置指南.md) - 前端 Supabase 客户端配置
- [SETUP_LOCAL.md](./SETUP_LOCAL.md) - 本地开发环境配置
- [QUICK_START.md](./QUICK_START.md) - 快速启动指南

---

## 🎯 总结

**问题原因：** 数据库容器停止 → 其他服务无法连接 → 服务不断重启

**解决方案：** 启动数据库容器 → 等待数据库就绪 → 重启依赖服务

**当前状态：** ✅ 核心服务已启动，可以使用

