# SDK 说明文档

本文档详细说明项目中安装的 SDK 及其作用。

---

## ✅ 项目已安装的 SDK

根据 `package.json`，项目安装了以下主要 SDK：

### 1. **Supabase SDK** ⭐

项目安装了两个 Supabase 相关的 SDK：

#### `@supabase/supabase-js` (v2.79.0)
**作用：** Supabase 的核心 JavaScript 客户端库

**功能：**
- 🔐 **认证管理**：用户注册、登录、登出、密码重置
- 📊 **数据库操作**：增删改查（CRUD）操作
- 📁 **文件存储**：上传、下载、删除文件
- 🔄 **实时订阅**：监听数据库变化
- 🔑 **权限管理**：处理行级安全（RLS）策略

**使用示例：**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

// 查询数据
const { data } = await supabase.from('projects').select('*')

// 认证
await supabase.auth.signInWithPassword({ email, password })
```

#### `@supabase/ssr` (v0.6.1)
**作用：** Supabase 的服务器端渲染（SSR）支持库

**功能：**
- 🌐 **Next.js 集成**：专为 Next.js App Router 设计
- 🍪 **Cookie 管理**：自动处理认证 Cookie
- 🔒 **安全性**：在服务器端安全地处理用户会话
- ⚡ **性能优化**：支持服务器组件和客户端组件

**使用场景：**
- **服务器组件**：在服务器端获取数据
- **客户端组件**：在浏览器中进行交互
- **中间件**：验证用户身份

**使用示例：**
```typescript
// 服务器组件
import { createServerClient } from '@supabase/ssr'

// 客户端组件
import { createBrowserClient } from '@supabase/ssr'
```

---

## 🛠️ 其他核心依赖

### 2. **Next.js** (v15.4.5)
**作用：** React 全栈框架

**功能：**
- 🎨 **前端框架**：构建用户界面
- 🚀 **服务器端渲染**：提升性能和 SEO
- 📁 **文件路由**：基于文件系统的路由
- 🔄 **API 路由**：创建后端 API 端点

### 3. **React** (v19.1.1) & **React DOM** (v19.1.1)
**作用：** 用户界面库

**功能：**
- 🧩 **组件化开发**：构建可复用的 UI 组件
- ⚡ **虚拟 DOM**：高效更新界面
- 🎣 **Hooks**：状态管理和副作用处理

### 4. **Tailwind CSS** (v4.1.16)
**作用：** CSS 工具类框架

**功能：**
- 🎨 **快速样式开发**：使用预定义的 CSS 类
- 📱 **响应式设计**：轻松实现移动端适配
- 🎯 **定制化**：通过配置文件自定义样式

### 5. **TypeScript** (v5.9.3)
**作用：** JavaScript 的超集，添加类型系统

**功能：**
- ✅ **类型检查**：在编译时发现错误
- 📝 **代码提示**：更好的开发体验
- 🔒 **类型安全**：减少运行时错误

---

## 🔧 开发工具 SDK

### 6. **Supabase CLI** (v2.54.11)
**作用：** Supabase 命令行工具

**功能：**
- 🚀 **本地开发**：启动本地 Supabase 实例
- 📊 **数据库迁移**：管理数据库结构变更
- 🔄 **同步**：与云端项目同步
- 🧪 **测试**：本地测试功能

**常用命令：**
```bash
# 启动本地开发环境
supabase start

# 查看服务状态
supabase status

# 停止服务
supabase stop

# 创建数据库迁移
supabase migration new migration_name

# 重置数据库
supabase db reset
```

---

## 📦 SDK 的作用总结

### 为什么需要 SDK？

SDK（Software Development Kit，软件开发工具包）是一组工具、库和文档的集合，让开发者更容易地使用某个服务或平台。

### Supabase SDK 的具体作用

#### 1. **简化 API 调用**
**没有 SDK：**
```typescript
// 需要手动构建 HTTP 请求
fetch('http://localhost:54321/rest/v1/projects', {
  method: 'GET',
  headers: {
    'apikey': 'your-anon-key',
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
  }
})
```

**使用 SDK：**
```typescript
// 简洁明了
const { data } = await supabase.from('projects').select('*')
```

#### 2. **自动处理认证**
SDK 自动管理：
- 🔑 JWT Token 的存储和刷新
- 🍪 Cookie 的设置和读取
- 🔒 请求头的自动添加

#### 3. **类型安全**
```typescript
// SDK 提供 TypeScript 类型定义
interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'paused';
}

const { data } = await supabase
  .from('projects')
  .select('*')
  .returns<Project[]>()  // 类型提示
```

#### 4. **错误处理**
SDK 统一处理错误格式：
```typescript
const { data, error } = await supabase.from('projects').select('*')

if (error) {
  console.error(error.message)  // 统一的错误格式
}
```

#### 5. **实时功能**
```typescript
// 监听数据库变化
supabase
  .channel('projects')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'projects' },
    (payload) => {
      console.log('数据变化:', payload)
    }
  )
  .subscribe()
```

---

## 🎯 项目中 SDK 的使用位置

### 1. **客户端组件**
**文件：** `utils/supabase/client.ts`
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**使用场景：**
- 用户交互（点击、输入）
- 表单提交
- 实时更新

### 2. **服务器组件**
**文件：** `utils/supabase/server.ts`
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
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) { /* ... */ },
      },
    }
  );
}
```

**使用场景：**
- 页面初始数据加载
- 服务器端认证检查
- SEO 优化

---

## 📊 SDK 版本说明

| SDK | 当前版本 | 最新稳定版 | 说明 |
|-----|---------|-----------|------|
| @supabase/supabase-js | 2.79.0 | 2.x | 核心客户端库 |
| @supabase/ssr | 0.6.1 | 0.x | SSR 支持（较新） |
| supabase CLI | 2.54.11 | 2.x | 命令行工具 |

**版本兼容性：** ✅ 所有版本互相兼容

---

## 🔍 如何查看已安装的 SDK

### 方法 1：查看 package.json
```bash
# 打开 package.json 文件
cat package.json
```

### 方法 2：使用 npm 命令
```bash
# 查看所有依赖
npm list --depth=0

# 查看特定包的版本
npm list @supabase/supabase-js
```

### 方法 3：查看 node_modules
```bash
# 查看已安装的包
ls node_modules/@supabase
```

---

## 🚀 如何更新 SDK

### 更新到最新版本
```bash
# 更新 Supabase SDK
npm update @supabase/supabase-js @supabase/ssr

# 或者指定版本
npm install @supabase/supabase-js@latest
```

### 查看可更新的包
```bash
npm outdated
```

---

## 💡 最佳实践

### 1. **使用正确的客户端**
- ✅ 客户端组件 → `createBrowserClient`
- ✅ 服务器组件 → `createServerClient`
- ❌ 不要混用

### 2. **环境变量配置**
确保 `.env.local` 配置正确：
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. **错误处理**
始终检查 `error` 对象：
```typescript
const { data, error } = await supabase.from('projects').select('*')
if (error) {
  console.error('查询失败:', error.message)
  return
}
```

### 4. **类型定义**
定义数据类型以获得更好的开发体验：
```typescript
interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}
```

---

## 📚 相关文档

- [前端API使用指南.md](./前端API使用指南.md) - API 调用详细说明
- [后端配置指南.md](./后端配置指南.md) - 后端服务配置
- [前端配置指南.md](./前端配置指南.md) - 前端环境配置
- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase JS 文档](https://supabase.com/docs/reference/javascript)

---

## ❓ 常见问题

### Q1: 为什么需要两个 Supabase SDK？
**A:** 
- `@supabase/supabase-js` 是核心库，提供所有功能
- `@supabase/ssr` 是 Next.js 专用的封装，处理 SSR 和 Cookie

### Q2: 可以不用 SDK 直接调用 API 吗？
**A:** 可以，但不推荐。SDK 提供了：
- 更简洁的语法
- 自动认证处理
- 类型安全
- 错误处理
- 实时功能

### Q3: SDK 会增加打包体积吗？
**A:** 会，但影响不大：
- `@supabase/supabase-js` 约 50KB (gzipped)
- Next.js 会自动进行代码分割和优化

### Q4: 如何知道 SDK 是否正常工作？
**A:** 
```typescript
// 测试连接
const { data, error } = await supabase.from('projects').select('count')
console.log('SDK 工作正常:', !error)
```

---

## 🎓 学习资源

- [Supabase 快速入门](https://supabase.com/docs/guides/getting-started)
- [Next.js + Supabase 教程](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase JavaScript 参考](https://supabase.com/docs/reference/javascript)
