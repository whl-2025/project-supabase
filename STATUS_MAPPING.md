# 项目状态映射说明

## 数据库状态值

项目表 (`projects`) 中的 `status` 字段使用以下值：

| 数据库值 | 中文显示 | 颜色标识 |
|---------|---------|---------|
| `active` | 进行中 | 绿色 (green) |
| `completed` | 已完成 | 蓝色 (blue) |
| `paused` | 已暂停 | 默认 (default) |

## 已修改的文件

### 1. 首页 (`app/home/page.tsx`)
- ✅ `getStatusColor()` - 状态颜色映射
- ✅ `getStatusText()` - 状态文本映射
- ✅ 统计查询 - 使用 `'active'` 而不是 `'in_progress'`

### 2. 项目列表 (`app/projects/page.tsx`)
- ✅ `statusMap` - 状态映射对象
- ✅ 已经正确使用 `active`, `completed`, `paused`

### 3. 项目模态框 (`components/ProjectModal.tsx`)
- ✅ Select 选项 - 已经正确使用数据库状态值

### 4. 数据库函数 (`supabase/migrations/20240109000000_fix_owner_id.sql`)
- ✅ `get_dashboard_stats()` - 使用 `'active'` 统计进行中的项目

## 数据库定义

在 `supabase/migrations/20240101000000_init_projects.sql` 中：

```sql
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 使用示例

### 创建项目
```typescript
await supabase.from('projects').insert({
  name: '新项目',
  description: '项目描述',
  status: 'active',  // 使用 'active' 而不是 'in_progress'
  owner_id: user.id,
});
```

### 查询进行中的项目
```typescript
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('status', 'active')  // 使用 'active'
  .eq('owner_id', user.id);
```

### 更新项目状态
```typescript
await supabase
  .from('projects')
  .update({ status: 'completed' })  // 或 'paused'
  .eq('id', projectId);
```

## 注意事项

1. **默认状态**: 新创建的项目默认状态为 `'active'`
2. **状态约束**: 数据库层面限制只能使用这三个值
3. **统一性**: 所有代码都应使用相同的状态值
4. **显示**: 前端显示时使用中文映射

## 迁移说明

如果你的数据库中有旧的状态值（如 `'in_progress'`），需要执行以下 SQL 更新：

```sql
-- 更新旧的状态值
UPDATE projects 
SET status = 'active' 
WHERE status = 'in_progress';

UPDATE projects 
SET status = 'paused' 
WHERE status = 'on_hold';
```

## 完成状态

✅ 所有文件已更新
✅ 状态映射已统一
✅ 数据库函数已修复
✅ 无诊断错误

现在系统中的所有项目状态都使用统一的值：`active`, `completed`, `paused`
