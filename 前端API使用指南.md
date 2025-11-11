# 前端 API 使用指南

本文档详细说明项目中前端如何调用 Supabase API，以及各种查询参数的使用方式。

---

## 📦 API 客户端初始化

### 1. 浏览器端客户端（Client Component）

**文件：`utils/supabase/client.ts`**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,      // API 地址
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // 匿名访问密钥
  );
}
```

**使用方式：**
```typescript
"use client";  // 必须在客户端组件中使用

import { createClient } from "@/utils/supabase/client";

export default function MyComponent() {
  const supabase = createClient();
  
  // 使用 supabase 进行 API 调用
}
```

### 2. 服务器端客户端（Server Component）

**文件：`utils/supabase/server.ts`**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 忽略错误
          }
        },
      },
    }
  );
}
```

**使用方式：**
```typescript
// 服务器组件（默认）
import { createClient } from "@/utils/supabase/server";

export default async function MyServerComponent() {
  const supabase = await createClient();
  
  // 使用 supabase 进行 API 调用
}
```

---

## 🔍 查询操作（SELECT）

### 基础查询

#### 1. 查询所有数据
```typescript
const { data, error } = await supabase
  .from("projects")
  .select("*");

// 返回所有项目的所有字段
```

#### 2. 查询指定字段
```typescript
const { data, error } = await supabase
  .from("projects")
  .select("id, name, status");

// 只返回 id, name, status 三个字段
```

#### 3. 查询单条数据
```typescript
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .eq("id", projectId)
  .single();

// .single() 确保只返回一条数据，而不是数组
```

### 排序（Order）

```typescript
// 按创建时间降序排列（最新的在前）
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .order("created_at", { ascending: false });

// 按名称升序排列
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .order("name", { ascending: true });

// 多字段排序
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .order("status", { ascending: true })
  .order("created_at", { ascending: false });
```

### 过滤条件（Filter）

#### 1. 等于（eq）
```typescript
// 查询状态为 active 的项目
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .eq("status", "active");
```

#### 2. 不等于（neq）
```typescript
// 查询状态不是 completed 的项目
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .neq("status", "completed");
```

#### 3. 大于/小于（gt, gte, lt, lte）
```typescript
// 查询创建时间大于某个日期的项目
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .gt("created_at", "2024-01-01");

// gte: 大于等于
// lt: 小于
// lte: 小于等于
```

#### 4. 模糊搜索（like, ilike）
```typescript
// 查询名称包含 "测试" 的项目（区分大小写）
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .like("name", "%测试%");

// 不区分大小写的模糊搜索
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .ilike("name", "%test%");
```

#### 5. 在列表中（in）
```typescript
// 查询状态为 active 或 paused 的项目
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .in("status", ["active", "paused"]);
```

#### 6. 为空/不为空（is, not.is）
```typescript
// 查询描述为空的项目
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .is("description", null);

// 查询描述不为空的项目
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .not("description", "is", null);
```

### 分页（Pagination）

```typescript
// 每页 10 条，获取第 1 页（0-9）
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .range(0, 9);

// 获取第 2 页（10-19）
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .range(10, 19);

// 或使用 limit 和 offset
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .limit(10)
  .offset(0);
```

### 计数（Count）

```typescript
// 获取总数
const { count, error } = await supabase
  .from("projects")
  .select("*", { count: "exact", head: true });

// 同时获取数据和总数
const { data, count, error } = await supabase
  .from("projects")
  .select("*", { count: "exact" })
  .range(0, 9);
```

---

## ✏️ 插入操作（INSERT）

### 插入单条数据

```typescript
const { data, error } = await supabase
  .from("projects")
  .insert([
    {
      name: "新项目",
      description: "项目描述",
      status: "active",
      owner_id: user.id,
    },
  ]);
```

### 插入多条数据

```typescript
const { data, error } = await supabase
  .from("projects")
  .insert([
    { name: "项目1", status: "active", owner_id: user.id },
    { name: "项目2", status: "paused", owner_id: user.id },
    { name: "项目3", status: "completed", owner_id: user.id },
  ]);
```

### 插入并返回数据

```typescript
const { data, error } = await supabase
  .from("projects")
  .insert([{ name: "新项目", owner_id: user.id }])
  .select();  // 返回插入的数据
```

---

## 🔄 更新操作（UPDATE）

### 更新单条数据

```typescript
const { data, error } = await supabase
  .from("projects")
  .update({ 
    name: "更新后的名称",
    description: "更新后的描述",
    status: "completed"
  })
  .eq("id", projectId);
```

### 更新多条数据

```typescript
// 将所有 active 状态的项目改为 paused
const { data, error } = await supabase
  .from("projects")
  .update({ status: "paused" })
  .eq("status", "active");
```

### 更新并返回数据

```typescript
const { data, error } = await supabase
  .from("projects")
  .update({ status: "completed" })
  .eq("id", projectId)
  .select();  // 返回更新后的数据
```

---

## 🗑️ 删除操作（DELETE）

### 删除单条数据

```typescript
const { error } = await supabase
  .from("projects")
  .delete()
  .eq("id", projectId);
```

### 删除多条数据

```typescript
// 删除所有已完成的项目
const { error } = await supabase
  .from("projects")
  .delete()
  .eq("status", "completed");
```

---

## 🔐 认证相关

### 获取当前用户

```typescript
const {
  data: { user },
  error
} = await supabase.auth.getUser();

if (user) {
  console.log("用户ID:", user.id);
  console.log("用户邮箱:", user.email);
}
```

### 登录

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password123",
});
```

### 注册

```typescript
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password123",
});
```

### 登出

```typescript
const { error } = await supabase.auth.signOut();
```

---

## 📝 实际使用示例

### 示例 1：项目列表页面（带搜索和排序）

```typescript
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClient();

  // 获取项目列表
  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      
      // 如果有搜索词，添加过滤条件
      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [searchTerm]);

  return (
    <div>
      <input
        type="text"
        placeholder="搜索项目..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      {loading ? (
        <p>加载中...</p>
      ) : (
        <ul>
          {projects.map((project) => (
            <li key={project.id}>{project.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 示例 2：创建项目

```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function CreateProject() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 获取当前用户
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登录");

      // 创建项目
      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            name,
            description,
            status: "active",
            owner_id: user.id,
          },
        ])
        .select();

      if (error) throw error;
      
      alert("创建成功！");
      setName("");
      setDescription("");
    } catch (err) {
      alert("创建失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="项目名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <textarea
        placeholder="项目描述"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        {loading ? "创建中..." : "创建项目"}
      </button>
    </form>
  );
}
```

### 示例 3：项目详情页面（服务器组件）

```typescript
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 检查用户是否登录
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 获取项目详情
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    return <div>项目不存在</div>;
  }

  return (
    <div>
      <h1>{project.name}</h1>
      <p>{project.description}</p>
      <p>状态: {project.status}</p>
    </div>
  );
}
```

---

## 🎯 常用查询组合

### 1. 分页 + 排序 + 过滤

```typescript
const { data, count, error } = await supabase
  .from("projects")
  .select("*", { count: "exact" })
  .eq("status", "active")
  .ilike("name", `%${searchTerm}%`)
  .order("created_at", { ascending: false })
  .range(page * pageSize, (page + 1) * pageSize - 1);
```

### 2. 多条件过滤

```typescript
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .eq("status", "active")
  .gte("created_at", "2024-01-01")
  .not("description", "is", null)
  .order("name");
```

### 3. 关联查询（如果有外键关系）

```typescript
// 假设 projects 表有 owner_id 关联到 users 表
const { data, error } = await supabase
  .from("projects")
  .select(`
    *,
    owner:users(id, email, name)
  `)
  .eq("status", "active");
```

---

## ⚠️ 错误处理

### 标准错误处理模式

```typescript
try {
  const { data, error } = await supabase
    .from("projects")
    .select("*");

  if (error) throw error;
  
  // 处理数据
  console.log(data);
} catch (err) {
  console.error("查询失败:", err.message);
  // 显示错误提示
}
```

### 常见错误类型

- `PGRST116`: 查询结果为空（使用 `.single()` 时）
- `23505`: 唯一约束冲突（插入重复数据）
- `23503`: 外键约束冲突
- `42501`: 权限不足（RLS 策略限制）

---

## 💡 最佳实践

1. **始终处理错误**：检查 `error` 对象
2. **使用 TypeScript 类型**：定义接口来约束数据结构
3. **避免过度查询**：只查询需要的字段
4. **使用索引字段排序**：提高查询性能
5. **客户端 vs 服务器端**：
   - 客户端组件：用于交互式 UI
   - 服务器组件：用于初始数据加载，更安全
6. **缓存策略**：使用 Next.js 的缓存机制
7. **分页大数据集**：避免一次性加载所有数据

---

## 📚 相关文档

- [后端配置指南.md](./后端配置指南.md) - 后端服务配置
- [前端配置指南.md](./前端配置指南.md) - 前端环境配置
- [Supabase 官方文档](https://supabase.com/docs)
