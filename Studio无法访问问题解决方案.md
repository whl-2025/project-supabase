# Supabase Studio 无法访问问题解决方案

## 🔍 问题诊断

### 问题现象
- `http://localhost:54323` 无法访问
- `npx supabase status` 显示所有服务为 "Stopped"
- 只有数据库容器在运行

### 可能原因
1. **服务启动失败**：容器创建后立即停止
2. **启动过程未完成**：`supabase start` 命令被中断
3. **端口冲突**：端口 54323 被其他服务占用
4. **配置问题**：`supabase/config.toml` 配置错误

---

## ✅ 解决方案

### 方案一：完全重启 Supabase（推荐）

```bash
# 1. 停止所有服务
npx supabase stop

# 2. 等待几秒确保完全停止
Start-Sleep -Seconds 5

# 3. 重新启动所有服务
npx supabase start

# 4. 等待服务启动（约30-60秒）
Start-Sleep -Seconds 30

# 5. 检查状态
npx supabase status
```

### 方案二：检查并修复配置

检查 `supabase/config.toml` 中的 Studio 配置：

```toml
[studio]
enabled = true
port = 54323
api_url = "http://127.0.0.1"
```

确保：
- `enabled = true`
- `port = 54323`（未被占用）

### 方案三：检查端口占用

```powershell
# 检查端口 54323 是否被占用
netstat -ano | findstr :54323

# 如果被占用，找到进程并停止
# 或者修改 config.toml 使用其他端口
```

### 方案四：手动启动服务

如果服务显示为 "Stopped"，尝试手动启动：

```bash
# 1. 查看所有容器
docker ps -a --filter "name=project-manager"

# 2. 手动启动 Studio 容器（如果存在）
docker start supabase_studio_project-manager

# 3. 检查日志
docker logs supabase_studio_project-manager --tail 50
```

---

## 🔧 快速修复命令

### PowerShell 完整修复流程

```powershell
# 1. 停止所有服务
npx supabase stop

# 2. 清理可能的残留容器
docker ps -a --filter "name=project-manager" --format "{{.Names}}" | ForEach-Object { docker rm $_ 2>$null }

# 3. 重新启动
npx supabase start

# 4. 等待启动完成
Start-Sleep -Seconds 45

# 5. 检查状态
npx supabase status

# 6. 检查 Studio 容器
docker ps --filter "name=studio_project-manager" --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"

# 7. 如果 Studio 容器存在但未运行，启动它
docker start supabase_studio_project-manager

# 8. 检查端口
netstat -ano | findstr :54323
```

---

## 📋 检查清单

### ✅ 验证服务是否正常启动

运行以下命令检查：

```bash
# 1. 检查所有服务状态
npx supabase status

# 2. 检查容器状态
docker ps --filter "name=project-manager" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 3. 检查 Studio 容器
docker ps --filter "name=studio_project-manager"

# 4. 检查端口映射
docker ps --filter "publish=54323" --format "{{.Names}}\t{{.Ports}}"
```

### 预期结果

**`npx supabase status` 应该显示：**
```
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**`docker ps` 应该显示：**
```
supabase_studio_project-manager   Up X minutes (healthy)   0.0.0.0:54323->3000/tcp
```

---

## 🐛 常见错误和解决方法

### 错误 1: 服务显示为 "Stopped"

**原因：** 服务启动失败或启动过程被中断

**解决：**
```bash
# 完全重启
npx supabase stop
npx supabase start

# 等待启动完成（约1分钟）
# 然后检查状态
npx supabase status
```

### 错误 2: 端口 54323 被占用

**原因：** 其他服务占用端口

**解决：**
```powershell
# 查找占用端口的进程
netstat -ano | findstr :54323

# 停止占用端口的进程或服务
# 或者修改 config.toml 使用其他端口
```

### 错误 3: 容器不存在

**原因：** `supabase start` 未完成或失败

**解决：**
```bash
# 1. 停止并清理
npx supabase stop

# 2. 重新启动（确保完整执行）
npx supabase start

# 3. 等待启动完成（不要中断）
# 通常需要 30-60 秒
```

### 错误 4: Studio 容器启动后立即停止

**原因：** 依赖服务未启动或配置错误

**解决：**
```bash
# 1. 检查依赖服务状态
docker ps --filter "name=project-manager"

# 2. 确保数据库和其他核心服务已启动
# 3. 检查 Studio 日志
docker logs supabase_studio_project-manager --tail 50

# 4. 根据日志错误信息修复问题
```

---

## 💡 预防措施

1. **不要中断启动过程**：`supabase start` 需要时间，不要提前中断

2. **检查启动日志**：如果启动失败，查看输出日志找出问题

3. **确保端口未被占用**：启动前检查端口是否可用

4. **使用正确的配置**：确保 `supabase/config.toml` 配置正确

---

## 📚 相关文档

- [Supabase启动问题解决方案.md](./Supabase启动问题解决方案.md) - 启动问题解决方案
- [前端配置指南.md](./前端配置指南.md) - 前端配置指南
- [SETUP_LOCAL.md](./SETUP_LOCAL.md) - 本地开发环境配置

---

## 🎯 总结

**问题原因：** 
- 服务启动失败或启动过程未完成
- 容器创建后立即停止
- 端口被占用或配置错误

**解决方案：**
1. 完全停止并重新启动 Supabase
2. 等待启动过程完成（30-60秒）
3. 检查服务状态和端口映射
4. 如果容器存在但停止，手动启动

**当前状态：** 需要重新启动所有服务并等待启动完成

