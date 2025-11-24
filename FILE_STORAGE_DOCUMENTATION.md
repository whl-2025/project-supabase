# 文件上传存储路径逻辑详解

## 系统概述

文件上传功能使用 Supabase Storage 作为对象存储服务，采用分层目录结构组织文件，确保文件隔离、安全访问和高效管理。

---

## 核心概念

### 1. Supabase Storage 架构

```
Supabase Storage
  └─ Bucket (存储桶)
      └─ Objects (对象/文件)
          └─ 按路径组织
```

**Bucket**: `documents`
- 类似于 AWS S3 的 Bucket
- 需要在 Supabase Dashboard 中手动创建
- 所有用户的文件都存储在这个 Bucket 中

---

## 存储路径结构

### 路径格式

```
{user_id}/{project_id}/{storage_filename}
```

### 路径组成部分

| 部分 | 说明 | 示例 |
|------|------|------|
| **user_id** | 用户唯一标识（UUID） | `977c3858-ff0a-4b08-a34a-c0c567e34292` |
| **project_id** | 项目唯一标识（UUID） | `abc12345-6789-0def-ghij-klmnopqrstuv` |
| **storage_filename** | 存储文件名（时间戳_随机.扩展名） | `1732012345678_a1b2c3.pdf` |

### 完整路径示例

```
977c3858-ff0a-4b08-a34a-c0c567e34292/abc12345-6789-0def-ghij-klmnopqrstuv/1732012345678_a1b2c3.pdf
```

---

## 文件名生成逻辑

### 代码实现（app/files/page.tsx）

```typescript
// ==================== 📁 文件名生成逻辑 ====================

// 步骤1: 获取文件扩展名
const fileExtension = originalFile.name.split('.').pop() || '';
// 示例: "报告.pdf" → "pdf"

// 步骤2: 生成时间戳（毫秒级）
const timestamp = Date.now();
// 示例: 1732012345678

// 步骤3: 生成随机字符串（6位）
const random = Math.random().toString(36).substring(2, 8);
// 示例: "a1b2c3"
// 说明: toString(36) 使用36进制（0-9, a-z）
//       substring(2, 8) 取第2到第8位字符

// 步骤4: 组合生成唯一文件名
const uniqueFileName = `${timestamp}_${random}.${fileExtension}`;
// 示例: "1732012345678_a1b2c3.pdf"

// 步骤5: 构建完整存储路径
const storagePath = `${userId}/${selectedProject}/${uniqueFileName}`;
// 示例: "977c3858-ff0a-4b08-a34a-c0c567e34292/abc12345-6789-0def-ghij-klmnopqrstuv/1732012345678_a1b2c3.pdf"
```

### 为什么使用时间戳 + 随机数？

1. **唯一性保证**
   - 时间戳：确保不同时间上传的文件不冲突
   - 随机数：确保同一毫秒内上传的文件不冲突

2. **可排序性**
   - 时间戳在前，文件按上传时间自然排序

3. **避免中文问题**
   - 原始文件名可能包含中文、空格、特殊字符
   - Storage 文件名使用纯英文数字，避免编码问题

4. **安全性**
   - 隐藏原始文件名，防止信息泄露
   - 难以猜测，提高安全性

---

## 上传流程详解

### 完整代码流程（带注释）

```typescript
const handleUpload = async () => {
  // ==================== 步骤1: 验证 ====================
  if (fileList.length === 0) {
    message.warning('请选择要上传的文件');
    return;
  }

  if (!selectedProject) {
    message.warning('请选择项目');
    return;
  }

  if (!userId) {
    message.error('用户未登录');
    return;
  }

  setUploading(true);

  try {
    // ==================== 步骤2: 遍历文件列表 ====================
    for (const file of fileList) {
      const originalFile = file as any as File;
      
      // ==================== 步骤3: 生成存储文件名 ====================
      // 3.1 获取文件扩展名
      const fileExtension = originalFile.name.split('.').pop() || '';
      
      // 3.2 生成时间戳（毫秒）
      const timestamp = Date.now();
      
      // 3.3 生成6位随机字符串
      const random = Math.random().toString(36).substring(2, 8);
      
      // 3.4 组合生成唯一文件名
      const uniqueFileName = `${timestamp}_${random}.${fileExtension}`;
      
      // 3.5 构建完整存储路径
      // 格式: user_id/project_id/unique_filename
      const storagePath = `${userId}/${selectedProject}/${uniqueFileName}`;
      
      console.log('原始文件名:', originalFile.name);        // "项目报告.pdf"
      console.log('存储文件名:', uniqueFileName);           // "1732012345678_a1b2c3.pdf"
      console.log('存储路径:', storagePath);                // "977c3858.../abc12345.../1732012345678_a1b2c3.pdf"
      
      // ==================== 步骤4: 上传到 Supabase Storage ====================
      // 📤 这是实际的文件上传操作
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')              // Bucket 名称
        .upload(storagePath, originalFile, {
          cacheControl: '3600',         // 缓存控制（1小时）
          upsert: false,                // 不覆盖已存在的文件
        });

      if (uploadError) {
        throw new Error(`上传 ${originalFile.name} 失败: ${uploadError.message}`);
      }

      console.log('上传成功:', uploadData);
      
      // ==================== 步骤5: 获取公共访问 URL ====================
      // 🔗 生成文件的公共访问链接
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      // ==================== 步骤6: 保存文件记录到数据库 ====================
      // 💾 在 files 表中创建记录
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: userId,                      // 用户ID
          project_id: selectedProject,          // 项目ID
          name: originalFile.name,              // ✅ 原始文件名（中文）
          storage_filename: uniqueFileName,     // ✅ Storage 文件名（英文）
          size: originalFile.size,              // 文件大小（字节）
          mime_type: originalFile.type,         // MIME 类型
          storage_path: storagePath,            // ✅ 完整存储路径
          url: urlData.publicUrl,               // 公共访问 URL
        });

      if (dbError) {
        throw new Error(`保存文件记录失败: ${dbError.message}`);
      }
    }

    message.success(`成功上传 ${fileList.length} 个文件`);
    // 清理状态
    setUploadModalVisible(false);
    setFileList([]);
    setSelectedProject(null);
    fetchFiles(userId);
  } catch (err: any) {
    message.error(err.message || '上传失败');
  } finally {
    setUploading(false);
  }
};
```

---

## 数据库表结构

### files 表字段说明

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- 📝 文件名相关字段
  name TEXT NOT NULL,                    -- 原始文件名（用户上传时的名称，可能包含中文）
  storage_filename TEXT,                 -- Storage 中的实际文件名（时间戳_随机.扩展名）
  storage_path TEXT NOT NULL,            -- 完整存储路径（user_id/project_id/storage_filename）
  
  -- 📊 文件元数据
  size BIGINT NOT NULL,                  -- 文件大小（字节）
  mime_type TEXT NOT NULL,               -- MIME 类型（如 application/pdf）
  url TEXT,                              -- 公共访问 URL
  
  -- 🕐 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 字段对比示例

| 字段 | 值 | 说明 |
|------|-----|------|
| `name` | `项目报告.pdf` | 用户看到的文件名 |
| `storage_filename` | `1732012345678_a1b2c3.pdf` | Storage 中的实际文件名 |
| `storage_path` | `977c3858.../abc12345.../1732012345678_a1b2c3.pdf` | 完整路径 |
| `url` | `https://xxx.supabase.co/storage/v1/object/public/documents/977c3858.../abc12345.../1732012345678_a1b2c3.pdf` | 公共访问链接 |

---

## Storage 安全策略（RLS）

### 策略配置（supabase/migrations/20240120000000_setup_storage_policies.sql）

```sql
-- ==================== 🔒 Storage 安全策略 ====================

-- 策略1: 用户只能上传到自己的目录
CREATE POLICY "Users can upload files to their own directory"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  -- 检查路径的第一层是否是用户自己的 ID
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 策略2: 用户只能查看自己的文件
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 策略3: 用户只能更新自己的文件
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 策略4: 用户只能删除自己的文件
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 策略工作原理

```
路径: 977c3858-ff0a-4b08-a34a-c0c567e34292/abc12345.../1732012345678_a1b2c3.pdf
      ↑
      第一层目录（user_id）

storage.foldername(name) 函数:
- 将路径分割成数组
- [1] 表示第一层目录
- 检查是否等于当前用户的 ID

示例:
- 用户A (ID: 977c3858...) 尝试上传到 977c3858.../... ✅ 允许
- 用户A (ID: 977c3858...) 尝试上传到 888c3858.../... ❌ 拒绝
```

---

## 文件操作流程图

### 上传流程

```
用户选择文件
  ↓
选择所属项目
  ↓
点击"开始上传"
  ↓
前端验证（大小、类型）
  ↓
生成唯一文件名
  ├─ 时间戳: Date.now()
  ├─ 随机数: Math.random().toString(36)
  └─ 扩展名: 从原文件名提取
  ↓
构建存储路径
  └─ user_id/project_id/unique_filename
  ↓
上传到 Supabase Storage
  ├─ Bucket: documents
  ├─ Path: 完整存储路径
  └─ RLS 策略验证
  ↓
获取公共 URL
  ↓
保存记录到数据库
  ├─ name: 原始文件名
  ├─ storage_filename: 唯一文件名
  ├─ storage_path: 完整路径
  └─ url: 公共访问链接
  ↓
上传成功
```

### 下载流程

```
用户点击"下载"
  ↓
从数据库获取 storage_path
  ↓
调用 Storage API 下载
  └─ supabase.storage.from('documents').download(storage_path)
  ↓
RLS 策略验证（检查是否是用户自己的文件）
  ↓
返回文件 Blob
  ↓
创建临时 URL
  └─ URL.createObjectURL(blob)
  ↓
触发浏览器下载
  └─ 使用原始文件名（name 字段）
  ↓
清理临时 URL
  └─ URL.revokeObjectURL(url)
```

### 删除流程

```
用户点击"删除"
  ↓
确认对话框
  ↓
从数据库获取 storage_path
  ↓
删除 Storage 中的文件
  └─ supabase.storage.from('documents').remove([storage_path])
  ↓
RLS 策略验证
  ↓
删除数据库记录
  └─ supabase.from('files').delete().eq('id', file_id)
  ↓
刷新文件列表
```

---

## 路径设计优势

### 1. 用户隔离

```
用户A的文件: 977c3858.../project1/file1.pdf
用户B的文件: 888c3858.../project1/file1.pdf
              ↑
              不同的 user_id，完全隔离
```

### 2. 项目分组

```
用户A的项目1: 977c3858.../project1/file1.pdf
用户A的项目2: 977c3858.../project2/file2.pdf
                          ↑
                          按项目组织
```

### 3. 文件唯一性

```
同一项目的多个文件:
977c3858.../project1/1732012345678_a1b2c3.pdf
977c3858.../project1/1732012345679_d4e5f6.pdf
                     ↑
                     时间戳 + 随机数保证唯一
```

### 4. 安全性

- **RLS 策略**: 自动检查路径第一层是否是用户 ID
- **无法猜测**: 随机文件名难以预测
- **权限控制**: 只能访问自己目录下的文件

### 5. 可扩展性

```
当前: user_id/project_id/filename
未来: user_id/project_id/folder/filename
      user_id/project_id/year/month/filename
```

---

## 实际示例

### 示例1: 上传中文文件名

```typescript
// 用户上传: "2024年度财务报告.pdf"

// 生成过程:
const timestamp = 1732012345678;
const random = "a1b2c3";
const extension = "pdf";
const uniqueFileName = "1732012345678_a1b2c3.pdf";

// 存储路径:
const storagePath = "977c3858-ff0a-4b08-a34a-c0c567e34292/abc12345-6789-0def-ghij-klmnopqrstuv/1732012345678_a1b2c3.pdf";

// 数据库记录:
{
  name: "2024年度财务报告.pdf",           // ✅ 保留原始中文名
  storage_filename: "1732012345678_a1b2c3.pdf",  // ✅ 英文存储名
  storage_path: "977c3858.../abc12345.../1732012345678_a1b2c3.pdf"
}

// 用户下载时:
// 浏览器显示: "2024年度财务报告.pdf"  ← 使用 name 字段
```

### 示例2: 同名文件上传

```typescript
// 用户在同一项目上传两个 "报告.pdf"

// 第一次上传:
storage_filename: "1732012345678_a1b2c3.pdf"
storage_path: "977c3858.../project1/1732012345678_a1b2c3.pdf"

// 第二次上传（1秒后）:
storage_filename: "1732012346678_d4e5f6.pdf"  // ← 时间戳不同
storage_path: "977c3858.../project1/1732012346678_d4e5f6.pdf"

// 结果: 两个文件都成功保存，不会冲突
```

### 示例3: 多用户同时上传

```typescript
// 用户A上传 "报告.pdf":
storage_path: "977c3858.../project1/1732012345678_a1b2c3.pdf"

// 用户B同时上传 "报告.pdf":
storage_path: "888c3858.../project1/1732012345678_x9y8z7.pdf"
              ↑                                    ↑
              不同的 user_id                        不同的随机数

// 结果: 完全隔离，互不影响
```

---

## 常见问题

### Q1: 为什么不直接使用原始文件名？

**A**: 原始文件名可能包含：
- 中文字符（编码问题）
- 空格和特殊字符（URL 问题）
- 重复名称（冲突问题）
- 敏感信息（安全问题）

### Q2: 如果两个文件在同一毫秒上传怎么办？

**A**: 使用随机数作为第二层保护：
```typescript
const random = Math.random().toString(36).substring(2, 8);
// 6位36进制随机数，冲突概率极低（约 1/20亿）
```

### Q3: 用户如何看到原始文件名？

**A**: 数据库中保存了两个字段：
- `name`: 原始文件名（显示给用户）
- `storage_filename`: 存储文件名（内部使用）

### Q4: 如何防止用户访问其他用户的文件？

**A**: 通过 RLS 策略自动检查：
```sql
(storage.foldername(name))[1] = auth.uid()::text
-- 路径第一层必须是用户自己的 ID
```

### Q5: 如何迁移到新的路径结构？

**A**: 可以通过数据库迁移脚本批量更新：
```sql
-- 示例: 添加新的路径层级
UPDATE files 
SET storage_path = user_id || '/archive/' || storage_filename
WHERE created_at < '2024-01-01';
```

---

## 总结

### 核心要点

1. **路径格式**: `user_id/project_id/timestamp_random.ext`
2. **文件名生成**: 时间戳 + 随机数 + 扩展名
3. **双重命名**: 保留原始名（显示）+ 生成唯一名（存储）
4. **安全隔离**: RLS 策略自动检查用户权限
5. **可扩展性**: 分层结构便于未来扩展

### 关键代码位置

| 功能 | 文件 | 行数 |
|------|------|------|
| 文件名生成 | `app/files/page.tsx` | ~180-190 |
| 上传逻辑 | `app/files/page.tsx` | ~150-250 |
| Storage 策略 | `supabase/migrations/20240120000000_setup_storage_policies.sql` | 全文 |
| 数据库字段 | `supabase/migrations/20240121000000_add_storage_filename.sql` | 全文 |

这个设计确保了文件存储的安全性、唯一性和可维护性！
