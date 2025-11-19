/**
 * 数据项向量化 API
 * 
 * 功能：将数据项的内容转换为向量（embedding），存储到数据库中用于语义搜索
 * 
 * 工作流程：
 * 1. 接收数据项 ID
 * 2. 从数据库读取数据项内容
 * 3. 将内容分块（避免超过模型的 token 限制）
 * 4. 为每个块调用 AI API 生成向量
 * 5. 将向量存储到数据库
 * 
 * 为什么要分块？
 * - AI 模型有 token 限制（如 8192 tokens）
 * - 长文本需要分成多个小块分别处理
 * - 每个块独立存储，搜索时可以匹配到具体段落
 * 
 * 请求参数：
 * - itemId: 数据项 ID（必填）
 * 
 * 返回数据：
 * - success: 是否成功
 * - chunks: 成功生成的向量块数量
 * - total: 总块数
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 解析请求参数
    const { itemId } = await request.json();

    // 验证参数
    if (!itemId) {
      return NextResponse.json(
        { error: '缺少 itemId 参数' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // ========== 步骤 1：用户认证 ==========
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    // ========== 步骤 2：读取数据项 ==========
    // 从 vector_items 表读取要向量化的数据项
    const { data: item, error: itemError } = await supabase
      .from('vector_items')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', user.id)  // 确保只能操作自己的数据
      .single(); // 指定只返回一条记录

    // 检查数据项是否存在
    if (itemError || !item) {
      return NextResponse.json(
        { error: '数据项不存在' },
        { status: 404 }
      );
    }

    // ========== 步骤 3：获取 AI 配置 ==========
    // 读取用户配置的 AI 模型信息
    const { data: settings } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // 检查配置是否存在
    if (!settings || !settings.ollama_url) {
      return NextResponse.json(
        { error: '请先在模型配置页面配置 API 地址' },
        { status: 400 }
      );
    }

    // ========== 步骤 4：文档分块 ==========
    // 将长文本分成多个小块，每块独立向量化
    // 例如：1500 字符的文本，chunk_size=500，会分成 3 块
    const chunkSize = settings.chunk_size || 500;  // 默认 500 字符
    const content = item.content || '';
    const chunks: string[] = [];
    
    // 循环切分文本
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.substring(i, i + chunkSize));
    }

    // ========== 步骤 5：删除旧向量 ==========
    // 如果之前已经向量化过，先删除旧的向量
    // 这样可以避免重复数据，确保向量是最新的
    await supabase
      .from('vector_item_embeddings')
      .delete()
      .eq('item_id', itemId);

    // ========== 步骤 6：为每个块生成向量并存储 ==========
    let successCount = 0;  // 成功处理的块数量
    const errors: string[] = [];  // 错误信息收集
    
    // 遍历每个文本块
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // 判断使用哪种 API 格式
        let embeddingResponse;
        let embedding;

        // 通过 URL 或 API Key 判断是 OpenAI 还是 Ollama
        if (settings.ollama_url.includes('openai.com') || (settings.api_key && settings.api_key !== 'sk')) {
          // ===== OpenAI API 格式 =====
          embeddingResponse = await fetch(`${settings.ollama_url}/embeddings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.api_key}`,
            },
            body: JSON.stringify({
              model: settings.chat_model || 'text-embedding-3-small',
              input: chunk,  // 当前文本块
            }),
          });

          // 检查 API 调用是否成功
          if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text();
            errors.push(`OpenAI API 错误 (块 ${i + 1}): ${errorText}`);
            console.error(`OpenAI API 错误 (块 ${i + 1}):`, errorText);
            continue;  // 跳过这个块，继续处理下一个
          }

          // 解析响应，提取向量
          const embeddingData = await embeddingResponse.json();
          embedding = embeddingData.data?.[0]?.embedding;
        } else {
          // ===== Ollama API 格式 =====
          embeddingResponse = await fetch(`${settings.ollama_url}/api/embeddings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: settings.chat_model || 'nomic-embed-text',
              prompt: chunk,  // Ollama 使用 prompt 字段
            }),
          });

          // 检查 API 调用是否成功
          if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text();
            errors.push(`Ollama API 错误 (块 ${i + 1}): ${errorText}`);
            console.error(`Ollama API 错误 (块 ${i + 1}):`, errorText);
            continue;
          }

          // 解析响应，提取向量
          const embeddingData = await embeddingResponse.json();
          embedding = embeddingData.embedding;
        }

        // 验证向量数据是否有效
        if (!embedding || !Array.isArray(embedding)) {
          errors.push(`无效的向量数据 (块 ${i + 1})`);
          console.error(`无效的向量数据 (块 ${i + 1}):`, embedding);
          continue;
        }

        // ========== 存储向量到数据库 ==========
        // 将生成的向量存储到 vector_item_embeddings 表
        const { error: insertError } = await supabase
          .from('vector_item_embeddings')
          .insert({
            item_id: itemId,           // 关联的数据项 ID
            content: chunk,            // 原始文本块
            embedding: embedding,      // 向量数组
            chunk_index: i,            // 块索引（第几块）
            metadata: {                // 元数据（方便搜索时显示）
              title: item.title,
              category: item.category,
              tags: item.tags,
            },
          });

        // 检查存储是否成功
        if (insertError) {
          errors.push(`存储向量失败 (块 ${i + 1}): ${insertError.message}`);
          console.error(`存储向量失败 (块 ${i + 1}):`, insertError);
          continue;
        }

        // 成功处理一个块
        successCount++;
      } catch (error: any) {
        // 捕获任何异常
        errors.push(`处理块 ${i + 1} 时出错: ${error.message}`);
        console.error(`处理块 ${i + 1} 时出错:`, error);
        continue;
      }
    }

    // ========== 检查处理结果 ==========
    // 如果所有块都失败了，返回错误
    if (successCount === 0) {
      return NextResponse.json(
        { 
          error: '向量化失败，请检查 API 配置和模型是否正确',
          details: errors.slice(0, 3),  // 只返回前 3 个错误（避免响应过大）
          totalErrors: errors.length,
        },
        { status: 500 }
      );
    }

    // ========== 返回成功结果 ==========
    return NextResponse.json({
      success: true,
      chunks: successCount,    // 成功处理的块数
      total: chunks.length,    // 总块数
    });

  } catch (error: any) {
    // 捕获顶层异常
    console.error('向量化错误:', error);
    return NextResponse.json(
      { error: error.message || '向量化失败' },
      { status: 500 }
    );
  }
}
