# AI 功能 API 说明文档

本文档详细说明项目中所有 AI 相关的 API 接口。

## API 概览

| API 路径 | 功能 | 主要用途 |
|---------|------|---------|
| `/api/ai/search` | 语义搜索 | 根据文本查询搜索相似内容 |
| `/api/ai/vectorize-item` | 向量化数据项 | 将数据项内容转换为向量 |
| `/api/ai/recommend` | 推荐相似内容 | 基于数据项推荐相似内容 |
| `/api/ai/embed` | 生成向量 | 将任意文本转换为向量 |
| `/api/ai/test-data` | 创建测试数据 | 快速创建测试数据项 |

---

## 1. 语义搜索 API

**路径：** `POST /api/ai/search`

**功能：** 将用户的搜索查询转换为向量，然后在数据库中搜索相似的内容

### 工作流程

```
用户输入查询文本
    ↓
调用 AI API 生成查询向量
    ↓
在数据库中进行向量相似度搜索
    ↓
返回相似度最高的结果
```

### 请求参数

```typescript
{
  query: string;      // 搜索查询文本（必填）
  threshold?: number; // 相似度阈值，0-1 之间，默认 0.7
  limit?: number;     // 返回结果数量，默认 10
}
```

### 返回数据

```typescript
{
  success: boolean;
  results: Array<{
    id: string;
    item_id: string;
    title: string;
    content: string;
    similarity: number;  // 相似度 0-1
    category: string;
    metadata: object;
  }>;
  count: number;
}
```

### 使用示例

```typescript
const response = await fetch('/api/ai/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'React 组件开发',
    threshold: 0.8,
    limit: 5
  })
});

const data = await response.json();
console.log(data.results); // 搜索结果
```

### 注意事项

1. **模型一致性**：搜索使用的模型必须与向量化时使用的模型相同
2. **阈值设置**：阈值越高，结果越精确但数量可能越少
3. **性能**：向量搜索在大数据量下性能优秀

---

## 2. 向量化数据项 API

**路径：** `POST /api/ai/vectorize-item`

**功能：** 将数据项的内容转换为向量，存储到数据库中用于语义搜索

### 工作流程

```
接收数据项 ID
    ↓
从数据库读取数据项内容
    ↓
将内容分块（避免超过 token 限制）
    ↓
为每个块调用 AI API 生成向量
    ↓
将向量存储到数据库
```

### 为什么要分块？

- AI 模型有 token 限制（如 8192 tokens）
- 长文本需要分成多个小块分别处理
- 每个块独立存储，搜索时可以匹配到具体段落

### 请求参数

```typescript
{
  itemId: string;  // 数据项 ID（必填）
}
```

### 返回数据

```typescript
{
  success: boolean;
  chunks: number;  // 成功生成的向量块数量
  total: number;   // 总块数
}
```

### 使用示例

```typescript
const response = await fetch('/api/ai/vectorize-item', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    itemId: '8cb9cf1c-b51f-4d5f-b127-03f805a642b8'
  })
});

const data = await response.json();
console.log(`成功向量化 ${data.chunks}/${data.total} 个块`);
```

### 注意事项

1. **重复向量化**：会先删除旧向量，再生成新向量
2. **分块大小**：在模型配置中设置，默认 500 字符
3. **错误处理**：部分块失败不影响其他块

---

## 3. 推荐相似内容 API

**路径：** `POST /api/ai/recommend`

**功能：** 基于一个数据项，推荐其他相似的数据项

### 与搜索 API 的区别

| 特性 | 搜索 API | 推荐 API |
|------|---------|---------|
| 输入 | 用户文本 | 数据项 ID |
| 向量来源 | 实时生成 | 已存储的向量 |
| 使用场景 | 主动搜索 | 被动推荐 |

### 工作原理

```
获取指定数据项的向量
    ↓
在数据库中搜索向量相似的其他数据项
    ↓
排除自己
    ↓
返回相似度最高的结果
```

### 请求参数

```typescript
{
  itemId: string;     // 数据项 ID（必填）
  limit?: number;     // 返回结果数量，默认 5
  threshold?: number; // 相似度阈值，默认 0.7
}
```

### 返回数据

```typescript
{
  success: boolean;
  results: Array<{
    id: string;
    item_id: string;
    title: string;
    content: string;
    similarity: number;
    category: string;
  }>;
  count: number;
}
```

### 使用场景

- "相关推荐"功能
- "你可能还喜欢"
- 内容发现

---

## 4. 生成向量 API

**路径：** `POST /api/ai/embed`

**功能：** 将任意文本转换为向量（通用工具）

### 与其他 API 的区别

- `vectorize-item`：向量化整个数据项（包含分块、存储）
- `search`：生成查询向量并搜索
- `embed`：只生成向量，不做其他操作

### 请求参数

```typescript
{
  text: string;  // 要转换的文本（必填）
}
```

### 返回数据

```typescript
{
  success: boolean;
  embedding: number[];  // 向量数组
  model: string;        // 使用的模型名称
}
```

### 使用场景

- 测试向量生成
- 自定义向量处理
- 调试和开发

### 注意事项

- 目前只支持 OpenAI API
- 需要在模型配置页面设置 API Key

---

## 5. 创建测试数据 API

**路径：** `POST /api/ai/test-data`

**功能：** 快速创建一些测试数据项，用于测试向量搜索功能

### 测试数据内容

包含 5 个不同主题的技术文章：
1. Next.js 入门指南
2. TypeScript 最佳实践
3. Supabase 数据库操作
4. React Hooks 使用技巧
5. AI 向量搜索原理

### 返回数据

```typescript
{
  success: boolean;
  count: number;  // 创建的数据项数量
  items: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
  }>;
}
```

### 注意事项

- 创建后需要手动点击"向量化"按钮才能进行搜索
- 测试数据会关联到当前用户

---

## 技术架构

### 支持的 AI 服务

#### 1. OpenAI

```typescript
{
  ollama_url: "https://api.openai.com/v1",
  api_key: "sk-...",
  chat_model: "text-embedding-3-small"
}
```

**特点：**
- 需要 API Key
- 高质量向量
- 按使用量付费

#### 2. Ollama（本地）

```typescript
{
  ollama_url: "http://localhost:11434",
  chat_model: "nomic-embed-text"
}
```

**特点：**
- 无需 API Key
- 完全本地运行
- 免费使用

### 向量维度

当前数据库配置：`VECTOR(2048)`

常见模型维度：
- `nomic-embed-text`: 768 维
- `text-embedding-3-small`: 1536 维
- `text-embedding-3-large`: 3072 维
- `deepseek-coder`: 2048 维

### 相似度计算

使用余弦相似度（Cosine Similarity）：

```sql
similarity = 1 - (embedding1 <=> embedding2)
```

- `<=>` 是 pgvector 的余弦距离操作符
- 相似度范围：0-1
- 1 = 完全相同，0 = 完全不同

---

## 常见问题

### Q1: 为什么搜索结果不准确？

**可能原因：**
1. 向量化和搜索使用了不同的模型
2. 阈值设置不合适
3. 测试数据内容太相似

**解决方案：**
1. 确保使用同一个 embedding 模型
2. 调整相似度阈值（提高到 0.8-0.85）
3. 使用更多样化的测试数据

### Q2: 向量化失败怎么办？

**检查清单：**
1. 模型配置是否正确？
2. API 地址是否可访问？
3. API Key 是否有效？（OpenAI）
4. 模型是否已安装？（Ollama）

### Q3: 如何提高搜索性能？

**优化建议：**
1. 使用向量索引（小于 2000 维）
2. 合理设置相似度阈值
3. 限制返回结果数量
4. 使用分块存储

### Q4: 支持哪些语言？

所有 AI 模型都支持多语言，包括：
- 中文
- 英文
- 其他主流语言

语义搜索会自动理解不同语言的含义。

---

## 调试技巧

### 1. 查看向量维度

```sql
SELECT 
  vi.title,
  array_length(vie.embedding, 1) as vector_dimension
FROM vector_item_embeddings vie
JOIN vector_items vi ON vi.id = vie.item_id
LIMIT 5;
```

### 2. 查看相似度分布

在搜索 API 中已添加调试日志：

```typescript
console.log('相似度范围:', {
  最高: results[0]?.similarity,
  最低: results[results.length - 1]?.similarity,
});
```

### 3. 测试向量生成

使用 embed API 测试：

```typescript
const response = await fetch('/api/ai/embed', {
  method: 'POST',
  body: JSON.stringify({ text: '测试文本' })
});
const data = await response.json();
console.log('向量维度:', data.embedding.length);
```

---

## 最佳实践

### 1. 模型选择

- **开发测试**：使用 Ollama 本地模型（免费）
- **生产环境**：使用 OpenAI（质量更高）

### 2. 分块策略

- **短文本**（< 500 字符）：不分块
- **中等文本**（500-2000 字符）：分 2-4 块
- **长文本**（> 2000 字符）：按段落分块

### 3. 阈值设置

- **宽松搜索**：0.6-0.7（返回更多结果）
- **平衡搜索**：0.7-0.8（推荐）
- **严格搜索**：0.8-0.9（只返回高度相关）

### 4. 错误处理

所有 API 都包含完善的错误处理：
- 参数验证
- 认证检查
- API 调用失败重试
- 详细错误信息

---

## 更新日志

### 2024-01-07
- 更新向量维度到 2048
- 添加详细注释
- 优化错误处理

### 2024-01-02
- 初始版本
- 支持 OpenAI 和 Ollama
- 实现基础搜索功能
