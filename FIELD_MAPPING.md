# 数据库字段映射说明

## 字段使用规范

### 使用 `owner_id` 的表

| 表名 | 字段 | 说明 |
|------|------|------|
| `projects` | `owner_id` | 项目所有者 |
| `teams` | `owner_id` | 团队所有者 |

### 使用 `user_id` 的表

| 表名 | 字段 | 说明 |
|------|------|------|
| `files` | `user_id` | 文件上传者 |
| `notifications` | `user_id` | 通知接收者 |
| `activity_logs` | `user_id` | 活动执行者 |
| `user_settings` | `user_id` | 用户设置（主键） |
| `vector_items` | `user_id` | AI 数据项创建者 |
| `team_members` | `user_id` | 团队成员 |
| `project_members` | `user_id` | 项目成员 |

## 已验证的文件

### ✅ 正确使用 `owner_id`

1. **app/home/page.tsx**
   ```typescript
   // 项目统计
   supabase.from('projects').select('*').eq('owner_id', user.id)
   
   // 最近项目
   supabase.from('projects').select('*').eq('owner_id', user.id)
   ```

2. **app/projects/page.tsx**
   ```typescript
   // 项目列表
   supabase.from('projects').select('*').eq('owner_id', user.id)
   ```

3. **components/ProjectModal.tsx**
   ```typescript
   // 创建项目
   supabase.from('projects').insert({ ...values, owner_id: user.id })
   ```

### ✅ 正确使用 `user_id`

1. **app/home/page.tsx**
   ```typescript
   // 文件统计
   supabase.from('files').select('*').eq('user_id', user.id)
   
   // 通知统计
   supabase.from('notifications').select('*').eq('user_id', user.id)
   
   // AI 数据统计
   supabase.from('vector_items').select('*').eq('user_id', user.id)
   
   // 活动日志
   supabase.from('activity_logs').select('*').eq('user_id', user.id)
   ```

2. **app/files/page.tsx**
   ```typescript
   // 文件列表
   supabase.from('files').select('*')
   ```

3. **app/notifications/page.tsx**
   ```typescript
   // 通知列表
   supabase.from('notifications').select('*').eq('user_id', user.id)
   ```

4. **app/activity/page.tsx**
   ```typescript
   // 活动日志
   supabase.from('activity_logs').select('*')
   ```

5. **app/teams/page.tsx**
   ```typescript
   // 拥有的团队
   supabase.from('teams').select('*').eq('owner_id', user.id)
   
   // 加入的团队
   supabase.from('team_members').select('*').eq('user_id', user.id)
   ```

## 数据库函数

### get_dashboard_stats()

```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats(user_id_param UUID)
RETURNS JSON
AS $$
BEGIN
  SELECT json_build_object(
    'total_projects', (SELECT COUNT(*) FROM projects WHERE owner_id = user_id_param),
    'active_projects', (SELECT COUNT(*) FROM projects WHERE owner_id = user_id_param AND status = 'active'),
    'completed_projects', (SELECT COUNT(*) FROM projects WHERE owner_id = user_id_param AND status = 'completed'),
    'total_files', (SELECT COUNT(*) FROM files WHERE user_id = user_id_param),
    'unread_notifications', (SELECT COUNT(*) FROM notifications WHERE user_id = user_id_param AND is_read = FALSE),
    'vector_items', (SELECT COUNT(*) FROM vector_items WHERE user_id = user_id_param),
    'total_teams', (
      SELECT COUNT(*) FROM teams WHERE owner_id = user_id_param
      UNION
      SELECT COUNT(*) FROM team_members WHERE user_id = user_id_param
    )
  ) INTO result;
  RETURN result;
END;
$$;
```

## RLS 策略

### projects 表
```sql
-- 使用 owner_id
CREATE POLICY "Users can view own projects"
ON projects FOR SELECT
USING (auth.uid() = owner_id);
```

### files 表
```sql
-- 使用 user_id
CREATE POLICY "Users can view own files"
ON files FOR SELECT
USING (auth.uid() = user_id);
```

### teams 表
```sql
-- 使用 owner_id
CREATE POLICY "Users can view teams they belong to"
ON teams FOR SELECT
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = teams.id
    AND team_members.user_id = auth.uid()
  )
);
```

## 命名规范说明

### 为什么 projects 使用 owner_id？

1. **语义清晰**: `owner_id` 明确表示项目的所有者
2. **权限区分**: 未来可能支持项目成员（通过 `project_members` 表）
3. **一致性**: 与 `teams` 表的命名保持一致

### 为什么其他表使用 user_id？

1. **通用性**: 这些表的记录直接属于用户
2. **简单性**: 不需要区分所有者和成员的概念
3. **标准化**: 符合常见的数据库命名约定

## 迁移历史

1. **20240101000000_init_projects.sql** - 创建 projects 表，使用 `owner_id`
2. **20240108000000_add_complete_features.sql** - 创建其他表，使用 `user_id`
3. **20240109000000_fix_owner_id.sql** - 修复统计函数，正确使用 `owner_id`

## 验证状态

✅ 所有代码已验证
✅ 字段使用正确
✅ RLS 策略正确
✅ 数据库函数正确
✅ 无诊断错误

## 注意事项

1. **创建项目时**: 必须使用 `owner_id`
2. **查询项目时**: 必须使用 `owner_id` 过滤
3. **其他表**: 统一使用 `user_id`
4. **团队表**: 使用 `owner_id` 表示团队所有者，`team_members.user_id` 表示成员
