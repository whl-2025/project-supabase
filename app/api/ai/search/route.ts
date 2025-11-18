/**
 * AI 语义搜索 API
 * 
 * 功能：将用户的搜索查询转换为向量，然后在数据库中搜索相似的内容
 * 
 * 工作流程：
 * 1. 接收用户的搜索查询文本
 * 2. 调用 AI API（OpenAI/Ollama）将查询转换为向量
 * 3. 使用向量在数据库中进行相似度搜索
 * 4. 返回相似度最高的结果
 * 
 * 请求参数：
 * - query: 搜索查询文本（必填）
 * - threshold: 相似度阈值，0-1 之间，默认 0.7（可选）
 * - limit: 返回结果数量，默认 10（可选）
 * 
 * 返回数据：
 * - success: 是否成功
 * - results: 搜索结果数组，包含标题、内容、相似度等
 * - count: 结果数量
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 解析请求参数
    const { query, threshold = 0.7, limit = 10 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: '缺少搜索内容' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // ========== 步骤 1：用户认证 ==========
    // 验证用户身份，确保只有登录用户才能使用搜索功能
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    // ========== 步骤 2：获取 AI 配置 ==========
    // 从数据库读取用户配置的 AI 模型信息（API 地址、模型名称等）
    const { data: settings, error: settingsError } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // 检查配置是否存在
    if (settingsError || !settings) {
      return NextResponse.json(
        { error: '请先在模型配置页面配置 AI 模型' },
        { status: 400 }
      );
    }

    // 检查 API 地址是否配置
    if (!settings.ollama_url) {
      return NextResponse.json(
        { error: '请先在模型配置页面配置 API 地址' },
        { status: 400 }
      );
    }

    // 检查模型名称是否配置
    if (!settings.chat_model) {
      return NextResponse.json(
        { error: '请先在模型配置页面配置模型名称' },
        { status: 400 }
      );
    }

    // ========== 步骤 3：生成查询向量 ==========
    // 将用户的搜索文本转换为向量（embedding）
    let queryEmbedding;
    
    try {
      // 判断使用哪种 API 格式（OpenAI 或 Ollama）
      // 通过 URL 或 API Key 判断
      if (settings.ollama_url.includes('openai.com') || (settings.api_key && settings.api_key !== 'sk')) {
        // ===== OpenAI API 格式 =====
        // OpenAI 的 embedding API 端点：/embeddings
        // 调用 OpenAI API 生成向量
        const embeddingResponse = await fetch(`${settings.ollama_url}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.api_key}`,  // OpenAI 需要 API Key
          },
          body: JSON.stringify({
            model: settings.chat_model || 'text-embedding-3-small',  // 使用配置的模型
            input: query,  // 要转换的文本
          }),
        });

        // 检查 API 调用是否成功
        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          throw new Error(`OpenAI API 错误: ${errorText}`);
        }

        // 解析响应，提取向量数据
        const embeddingData = await embeddingResponse.json();
        queryEmbedding = embeddingData.data?.[0]?.embedding;
      } else {
        // ===== Ollama API 格式 =====
        // Ollama 的 embedding API 端点：/api/embeddings
        const embeddingResponse = await fetch(`${settings.ollama_url}/api/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: settings.chat_model || 'nomic-embed-text',  // 使用配置的模型
            prompt: query,  // Ollama 使用 prompt 字段
          }),
        });

        // 检查 API 调用是否成功
        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          throw new Error(`Ollama API 错误: ${errorText}`);
        }

        // 解析响应，提取向量数据
        const embeddingData = await embeddingResponse.json();
        queryEmbedding = embeddingData.embedding;  // Ollama 直接返回 embedding 字段
      }

      // 验证向量数据是否有效
      // 向量应该是一个数字数组，例如：[0.123, -0.456, 0.789, ...]
      if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
        throw new Error('无效的向量数据');
      }
    } catch (error: any) {
      console.error('生成查询向量失败:', error);
      return NextResponse.json(
        { error: `生成查询向量失败: ${error.message}` },
        { status: 500 }
      );
    }

    // ========== 步骤 4：向量相似度搜索 ==========
    // 调用数据库函数，使用向量进行相似度搜索
    // search_vector_items 是在数据库迁移文件中定义的 PostgreSQL 函数
    const { data: results, error: searchError } = await supabase
      .rpc('search_vector_items', {
        query_embedding: queryEmbedding,    // 查询向量
        match_threshold: threshold,          // 相似度阈值（0-1）
        match_count: limit,                  // 返回结果数量
        filter_user_id: user.id,            // 只搜索当前用户的数据
      });

    // 检查搜索是否成功
    if (searchError) {
      console.error('搜索错误:', searchError);
      return NextResponse.json(
        { error: `搜索失败: ${searchError.message}` },
        { status: 500 }
      );
    }

    // ========== 调试日志 ==========
    // 打印搜索结果的相似度信息，用于调试和优化
    console.log('搜索查询:', query);
    console.log('阈值:', threshold);
    console.log('结果数量:', results?.length || 0);
    if (results && results.length > 0) {
      console.log('相似度范围:', {
        最高: results[0]?.similarity,
        最低: results[results.length - 1]?.similarity,
      });
      // 打印每个结果的标题和相似度
      results.forEach((r: any) => {
        console.log(`- ${r.title}: ${(r.similarity * 100).toFixed(2)}%`);
      });
    }

    // ========== 返回搜索结果 ==========
    return NextResponse.json({
      success: true,
      results: results || [],
      count: results?.length || 0,
    });

  } catch (error: any) {
    console.error('搜索错误:', error);
    return NextResponse.json(
      { error: error.message || '搜索失败' },
      { status: 500 }
    );
  }
}
