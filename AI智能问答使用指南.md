# AI 智能问答使用指南

## 🎯 方案概述

现在支持两种方式进行AI智能问答：

### 方案一：使用 OpenAI API（推荐）✨

**优势：**
- ✅ 无需配置本地模型
- ✅ 无需上传文档
- ✅ 开箱即用，直接进行智能问答
- ✅ 支持多种模型：gpt-3.5-turbo, gpt-4, gpt-4-turbo等
- ✅ 响应速度快，质量高

**适用场景：**
- 快速开始使用AI问答功能
- 不需要本地部署
- 希望获得最佳的AI回答质量

### 方案二：使用 Ollama（本地）

**优势：**
- ✅ 完全本地运行，数据隐私保护
- ✅ 无需API费用
- ✅ 可以离线使用

**适用场景：**
- 需要数据隐私保护
- 不希望产生API费用
- 有本地GPU资源

---

## 🚀 快速开始 - 使用 OpenAI

### 步骤1：获取 OpenAI API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 登录你的 OpenAI 账户
3. 点击 "Create new secret key"
4. 复制生成的 API Key（注意：只会显示一次，请妥善保存）

### 步骤2：配置模型

1. 打开应用，进入 **AI 助手 → 模型配置**
2. 在 **API 提供商** 中选择 **"OpenAI (推荐)"**
3. 在 **API Key** 中输入你获取的 OpenAI API Key
4. 在 **模型名称** 中选择模型：
   - `gpt-3.5-turbo` - 推荐，性价比高
   - `gpt-4` - 更强大，但更昂贵
   - `gpt-4-turbo-preview` - 最新版本
   - `gpt-4o` - 最新多模态模型
5. 点击 **"测试连接"** 验证配置
6. 点击 **"保存配置"**

### 步骤3：开始使用

1. 进入 **AI 助手 → AI 问答**
2. 点击 **"创建新对话"**
3. 输入你的问题，点击 **"发送"**
4. AI 会自动回复你的问题！

---

## 🔧 配置 Ollama（本地）

### 步骤1：安装 Ollama

1. 访问 [Ollama 官网](https://ollama.ai)
2. 下载并安装 Ollama
3. 启动 Ollama 服务

### 步骤2：拉取模型

```bash
ollama pull llama2
# 或
ollama pull mistral
# 或
ollama pull codellama
```

### 步骤3：配置模型

1. 打开应用，进入 **AI 助手 → 模型配置**
2. 在 **API 提供商** 中选择 **"Ollama (本地)"**
3. 确认 **API 地址** 为 `http://localhost:11434`
4. 在 **模型名称** 中输入你拉取的模型名称（如 `llama2`）
5. 点击 **"测试连接"** 验证配置
6. 点击 **"保存配置"**

---

## 📊 配置参数说明

### Temperature（温度）
- **范围**：0 - 2
- **默认值**：0.7
- **说明**：控制输出的随机性
  - 值越低：回答越确定、一致
  - 值越高：回答越随机、创造性

### Max Tokens（最大Token数）
- **范围**：100 - 4000
- **默认值**：2000
- **说明**：限制生成的最大长度

### 相似度阈值（仅用于向量搜索）
- **范围**：0 - 1
- **默认值**：0.7
- **说明**：用于文档检索时的相似度阈值（使用文档功能时需要）

---

## 💡 使用技巧

### 1. 对话上下文
- AI 会记住最近10条消息的上下文
- 可以在同一个对话中连续提问
- 创建新对话会开始新的上下文

### 2. 问题提问
- 问题越具体，回答越准确
- 可以提供背景信息帮助AI理解
- 可以要求AI以特定格式回答

### 3. 模型选择
- **gpt-3.5-turbo**：适合日常问答，成本低
- **gpt-4**：适合复杂问题，需要更高准确性
- **gpt-4-turbo**：最新功能，支持更长上下文

---

## ❓ 常见问题

### Q1: OpenAI API Key 安全吗？
A: API Key 存储在 Supabase 数据库中，只有你本人可以访问。建议：
- 不要在公共场合分享 API Key
- 定期更换 API Key
- 在 OpenAI 平台设置使用限额

### Q2: 使用 OpenAI 会产生费用吗？
A: 是的，OpenAI API 是按使用量收费的。但：
- gpt-3.5-turbo 价格非常便宜（约 $0.002/1K tokens）
- 可以设置使用限额
- 查看 [OpenAI 定价](https://openai.com/pricing)

### Q3: 可以同时使用 OpenAI 和 Ollama 吗？
A: 可以，但需要切换配置。每次只能使用一种方式。

### Q4: 支持其他AI服务吗？
A: 目前支持 OpenAI 和 Ollama。未来可能会支持：
- Anthropic Claude
- Google Gemini
- 其他开源模型

### Q5: 如何查看使用情况？
A: 可以在 OpenAI 平台的 [Usage](https://platform.openai.com/usage) 页面查看使用量和费用。

---

## 🔒 安全建议

1. **保护 API Key**
   - 不要将 API Key 提交到代码仓库
   - 不要在客户端代码中暴露 API Key
   - 定期更换 API Key

2. **设置使用限额**
   - 在 OpenAI 平台设置月度使用限额
   - 监控 API 使用情况
   - 设置预算警报

3. **数据隐私**
   - 对话数据存储在 Supabase 数据库中
   - 只有你本人可以访问
   - 使用 Ollama 可以完全本地运行，数据不会上传

---

## 📚 相关资源

- [OpenAI API 文档](https://platform.openai.com/docs)
- [Ollama 文档](https://ollama.ai/docs)
- [Supabase 文档](https://supabase.com/docs)
- [项目 GitHub](https://github.com/your-repo)

---

## 🆘 获取帮助

如果遇到问题：
1. 检查 API Key 是否正确
2. 检查网络连接
3. 查看浏览器控制台错误信息
4. 查看服务器日志
5. 联系技术支持

---

**祝您使用愉快！** 🎉

