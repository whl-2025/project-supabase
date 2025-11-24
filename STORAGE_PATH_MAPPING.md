# Storage 路径映射详解

## 前端路径 → Bucket 展示映射

### 1. 代码中的路径定义

```typescript
// ==================== 前端代码 (app/files/page.tsx) ====================

// 用户ID（从认证获取）
const userId = "977c3858-ff0a-4b08-a34a-c0c567e34292";

// 项目ID（用户选择）
const selectedProject = "abc12345-6789-0def-ghij-klmnopqrstuv";

// 生成的唯一文件名
const uniqueFileName = "1732012345678_a1b2c3.pdf";

// 组合成完整路径
const storagePath = `${userId}/${selectedProject}/${uniqueFileName}`;
// 结果: "977c3858-ff0a-4b08-a34a-c0c567e34292/abc12345-6789-0def-ghij-klmnopqrstuv/1732012345678_a1b2c3.pdf"

// 上传到 Storage
await supabase.storage
  .from('documents')        // ← Bucket 名称
  .upload(storagePath, file);
```

### 2. Supabase Storage 中的展示

```
📦 Supabase Storage
  └─ 📁 documents (Bucket)
      └─ 📁 977c3858-ff0a-4b08-a34a-c0c567e34292/    ← 用户A的根目录
          ├─ 📁 abc12345-6789-0def-ghij-klmnopqrstuv/  ← 项目1
          │   ├─ 📄 1732012345678_a1b2c3.pdf
          │   ├─ 📄 1732012345679_d4e5f6.docx
          │   └─ 📄 1732012345680_g7h8i9.xlsx
          │
          └─ 📁 def45678-9012-3ghi-jklm-nopqrstuvwxy/  ← 项目2
              ├─ 📄 1732012345681_j0k1l2.png
              └─ 📄 1732012345682_m3n4o5.zip
```

---

## 路径层级详解

### 层级结构

| 层级 | 名称 | 示例 | 说明 |
|------|------|------|------|
| **Bucket** | documents | `documents` | 存储桶（容器） |
| **第1层** | User ID | `977c3858-ff0a-4b08-a34a-c0c567e34292` | 用户根目录 |
| **第2层** | Project ID | `abc12345-6789-0def-ghij-klmnopqrstuv` | 项目目录 |
| **第3层** | File Name | `1732012345678_a1b2c3.pdf` | 实际文件 |

### 完整路径示例

```
Bucket:  documents
Path:    977c3858-ff0a-4b08-a34a-c0c567e34292/abc12345-6789-0def-ghij-klmnopqrstuv/1732012345678_a1b2c3.pdf
         └─────────────── 第1层 ──────────────┘└─────────────── 第2层 ──────────────┘└────── 第3层 ──────┘
         └────────────────────────────────────────────────────────────────────────────────────────────────┘
                                            完整的 storage_path
```

---

## 在 Supabase Dashboard 中查看

### 步骤1: 进入 Storage

```
Supabase Dashboard
  → 左侧菜单
    → Storage
      → documents (点击)
```

### 步骤2: 浏览文件夹

```
documents/
  ├─ 977c3858-ff0a-4b08-a34a-c0c567e34292/    ← 点击进入用户目录
  │   ├─ abc12345-6789-0def-ghij-klmnopqrstuv/  ← 点击进入项目目录
  │   │   ├─ 1732012345678_a1b2c3.pdf          ← 看到实际文件
  │   │   └─ ...
  │   └─ ...
  │
  └─ 888c3858-ff0a-4b08-a34a-c0c567e34293/    ← 其他用户的目录
      └─ ...
```

### 步骤3: 查看文件详情

点击文件后可以看到：
- **Name**: `1732012345678_a1b2c3.pdf`
- **Path**: `977c3858-ff0a-4b08-a34a-c0c567e34292/abc12345-6789-0def-ghij-klmnopqrstuv/1732012345678_a1b2c3.pdf`
- **Size**: 文件大小
- **Type**: MIME 类型
- **URL**: 公共访问链接

---

## 路径识别逻辑

### 前端如何构建路径

```typescript
// ==================== 路径构建过程 ====================

// 步骤1: 获取用户ID
const { data: { user } } = await supabase.auth.getUser();
const userId = user.id;
// 结果: "977c3858-ff0a-4b08-a34a-c0c567e34292"

// 步骤2: 用户选择项目
const selectedProject = "abc12345-6789-0def-ghij-klmnopqrstuv";

// 步骤3: 生成唯一文件名
const timestamp = Date.now();                              // 1732012345678
const random = Math.random().toString(36).substring(2, 8); // "a1b2c3"
const extension = "pdf";
const uniqueFileName = `${timestamp}_${random}.${extension}`;
// 结果: "1732012345678_a1b2c3.pdf"

// 步骤4: 组合路径（使用斜杠分隔）
const storagePath = `${userId}/${selectedProject}/${uniqueFileName}`;
// 结果: "977c3858-ff0a-4b08-a34a-c0c567e34292/abc12345-6789-0def-ghij-klmnopqrstuv/1732012345678_a1b2c3.pdf"

// 步骤5: 上传时，Supabase 自动创建文件夹结构
await supabase.storage.from('documents').upload(storagePath, file);
```

### Supabase 如何解析路径

```typescript
// ==================== Supabase 内部处理 ====================

// 输入路径
const path = "977c3858-ff0a-4b08-a34a-c0c567e34292/abc12345-6789-0def-ghij-klmnopqrstuv/1732012345678_a1b2c3.pdf";

// Supabase 自动解析
const parts = path.split('/');
// parts[0] = "977c3858-ff0a-4b08-a34a-c0c567e34292"  ← 第1层文件夹
// parts[1] = "abc12345-6789-0def-ghij-klmnopqrstuv"  ← 第2层文件夹
// parts[2] = "1732012345678_a1b2c3.pdf"              ← 文件名

// 自动创建目录结构（如果不存在）
// documents/
//   └─ 977c3858-ff0a-4b08-a34a-c0c567e34292/
//       └─ abc12345-6789-0def-ghij-klmnopqrstuv/
//           └─ 1732012345678_a1b2c3.pdf
```

---

## 实际示例对比

### 示例1: 单个用户，单个项目

**前端代码：**
```typescript
const storagePath = "977c3858.../project1/file1.pdf";
```

**Bucket 展示：**
```
documents/
  └─ 977c3858.../
      └─ project1/
          └─ file1.pdf
```

### 示例2: 单个用户，多个项目

**前端代码：**
```typescript
// 项目1
const path1 = "977c3858.../project1/file1.pdf";
// 项目2
const path2 = "977c3858.../project2/file2.pdf";
```

**Bucket 展示：**
```
documents/
  └─ 977c3858.../
      ├─ project1/
      │   └─ file1.pdf
      └─ project2/
          └─ file2.pdf
```

### 示例3: 多个用户，多个项目

**前端代码：**
```typescript
// 用户A的文件
const pathA = "977c3858.../project1/file1.pdf";
// 用户B的文件
const pathB = "888c3858.../project1/file2.pdf";
```

**Bucket 展示：**
```
documents/
  ├─ 977c3858.../          ← 用户A
  │   └─ project1/
  │       └─ file1.pdf
  │
  └─ 888c3858.../          ← 用户B
      └─ project1/
          └─ file2.pdf
```

---

## 路径操作示例

### 上传文件

```typescript
// 前端定义路径
const storagePath = "977c3858.../project1/report.pdf";

// 上传
const { data, error } = await supabase.storage
  .from('documents')
  .upload(storagePath, file);

// Supabase 自动：
// 1. 检查 documents bucket 是否存在
// 2. 创建 977c3858.../ 文件夹（如果不存在）
// 3. 创建 project1/ 文件夹（如果不存在）
// 4. 保存 report.pdf 文件
```

### 下载文件

```typescript
// 使用相同的路径下载
const storagePath = "977c3858.../project1/report.pdf";

const { data, error } = await supabase.storage
  .from('documents')
  .download(storagePath);

// Supabase 根据路径定位文件：
// documents/977c3858.../project1/report.pdf
```

### 删除文件

```typescript
// 使用相同的路径删除
const storagePath = "977c3858.../project1/report.pdf";

const { data, error } = await supabase.storage
  .from('documents')
  .remove([storagePath]);

// Supabase 删除指定路径的文件
// 注意：空文件夹会自动保留
```

### 获取公共 URL

```typescript
const storagePath = "977c3858.../project1/report.pdf";

const { data } = supabase.storage
  .from('documents')
  .getPublicUrl(storagePath);

// 返回完整 URL:
// https://xxx.supabase.co/storage/v1/object/public/documents/977c3858.../project1/report.pdf
//                                                      └─ bucket ─┘└────── path ──────┘
```

---

## 路径验证（RLS 策略）

### 策略如何识别路径

```sql
-- RLS 策略
CREATE POLICY "Users can upload files to their own directory"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 路径解析示例

```sql
-- 路径: "977c3858-ff0a-4b08-a34a-c0c567e34292/project1/file.pdf"

-- storage.foldername(name) 函数返回:
-- ['977c3858-ff0a-4b08-a34a-c0c567e34292', 'project1']

-- [1] 表示第一个元素（索引从1开始）:
-- '977c3858-ff0a-4b08-a34a-c0c567e34292'

-- 检查是否等于当前用户ID:
-- auth.uid()::text = '977c3858-ff0a-4b08-a34a-c0c567e34292'

-- 如果相等 → 允许操作 ✅
-- 如果不等 → 拒绝操作 ❌
```

---

## 常见问题

### Q1: 路径中的斜杠会自动创建文件夹吗？

**A**: 是的！Supabase Storage 会自动解析路径中的斜杠，创建对应的文件夹结构。

```typescript
// 上传这个路径
"user1/project1/folder1/folder2/file.pdf"

// 自动创建
documents/
  └─ user1/
      └─ project1/
          └─ folder1/
              └─ folder2/
                  └─ file.pdf
```

### Q2: 如何在 Dashboard 中找到我的文件？

**A**: 按照路径层级点击：
1. 进入 `documents` bucket
2. 点击你的 `user_id` 文件夹
3. 点击 `project_id` 文件夹
4. 看到你的文件

### Q3: 路径中可以使用中文吗？

**A**: 技术上可以，但不推荐。建议：
- ❌ 路径中使用中文：`用户1/项目1/文件.pdf`
- ✅ 路径使用英文/UUID：`user1/project1/file.pdf`
- ✅ 文件名可以中文（保存在数据库的 `name` 字段）

### Q4: 如何列出某个文件夹下的所有文件？

```typescript
// 列出用户的所有文件
const { data, error } = await supabase.storage
  .from('documents')
  .list(`${userId}`, {
    limit: 100,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' }
  });

// 列出项目的所有文件
const { data, error } = await supabase.storage
  .from('documents')
  .list(`${userId}/${projectId}`, {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' }
  });
```

### Q5: 路径大小写敏感吗？

**A**: 是的！路径是大小写敏感的：
- `User1/Project1/file.pdf` ≠ `user1/project1/file.pdf`
- 建议统一使用小写或 UUID（自动小写）

---

## 总结

### 路径映射关系

```
前端代码中的路径:
"977c3858.../abc12345.../1732012345678_a1b2c3.pdf"
  ↓
Supabase Storage API:
.from('documents').upload(path, file)
  ↓
Bucket 中的展示:
documents/
  └─ 977c3858.../
      └─ abc12345.../
          └─ 1732012345678_a1b2c3.pdf
```

### 关键点

1. **斜杠分隔**: 使用 `/` 分隔路径层级
2. **自动创建**: Supabase 自动创建文件夹结构
3. **路径唯一**: 完整路径在 bucket 中必须唯一
4. **RLS 验证**: 自动检查路径第一层是否是用户 ID
5. **Dashboard 展示**: 按文件夹层级展示，可以逐层点击浏览

前端定义的路径会**完全对应** Supabase Storage 中的文件夹结构！
