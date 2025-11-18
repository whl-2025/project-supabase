/**
 * 生成文本嵌入向量 API
 * 
 * 功能：将任意文本转换为向量（embedding）
 * 
 * 与其他 API 的区别：
 * - vectorize-item API：向量化整个数据项（包含分块、存储）
 * - search API：生成查询向量并搜索
 * - embed API：只生成向量，不做其他操作（通用工具）
 * 
 * 使用场景：
 * - 测试向量生成
 * - 自定义向量处理
 * - 调试和开发
 * 
 * 注意：
 * - 目前只支持 OpenAI API
 * - 需要在模型配置页面设置 API Key
 * 
 * 请求参数：
 * - text: 要转换的文本（必填）
 * 
 * 返回数据：
 * - success: 是否成功
 * - embedding: 向量数组
 * - model: 使用的模型名称
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // ========== 步骤 1：用户认证 ==========
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    // ========== 步骤 2：解析和验证参数 ==========
    const body = await request.json();
    const { text } = body;

    // 验证文本参数
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: '缺少文本参数' },
        { status: 400 }
      );
    }

    // ========== 步骤 3：获取 AI 配置 ==========
    const { data: aiSettings, error: settingsError } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // 检查配置是否存在
    if (settingsError || !aiSettings) {
      return NextResponse.json(
        { error: '请先配置AI模型。请前往模型配置页面设置OpenAI API Key。' },
        { status: 400 }
      );
    }

    // 检查是否配置了 API Key
    if (!aiSettings.api_key) {
      return NextResponse.json(
        { error: '请先配置API Key。请前往模型配置页面设置OpenAI API Key。' },
        { status: 400 }
      );
    }

    // ========== 步骤 4：调用 OpenAI API 生成向量 ==========
    // 使用配置的 embedding 模型，如果没有配置则使用默认模型
    const embeddingModel = aiSettings.embedding_model || 'text-embedding-3-small';
    const openaiApiKey = aiSettings.api_key;

    // 调用 OpenAI embeddings API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: embeddingModel,  // 模型名称
        input: text,            // 要转换的文本
      }),
    });

    // 检查 API 调用是否成功
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI embeddings API 调用失败');
    }

    // 解析响应
    const data = await response.json();
    const embedding = data.data[0]?.embedding;

    // 验证向量数据
    if (!embedding) {
      throw new Error('未能获取嵌入向量');
    }

    // ========== 返回向量数据 ==========
    return NextResponse.json({
      success: true,
      embedding: embedding,    // 向量数组
      model: embeddingModel,   // 使用的模型
    });

  } catch (error: any) {
    console.error('生成嵌入向量错误:', error);
    return NextResponse.json(
      { error: error.message || '生成嵌入向量失败' },
      { status: 500 }
    );
  }
}

