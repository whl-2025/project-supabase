/**
 * AI 模型诊断 API
 * 
 * 功能：检查向量化和搜索是否使用了相同的模型
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    // 获取用户的 AI 配置
    const { data: settings } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!settings) {
      return NextResponse.json(
        { error: '请先配置 AI 模型' },
        { status: 400 }
      );
    }

    // 检查已存储的向量
    const { data: embeddings, error: embError } = await supabase
      .from('vector_item_embeddings')
      .select('id, item_id, embedding, created_at')
      .limit(1);

    if (embError) {
      return NextResponse.json(
        { error: '查询向量失败: ' + embError.message },
        { status: 500 }
      );
    }

    let vectorDimension = null;
    if (embeddings && embeddings.length > 0) {
      // 检查向量维度
      const embedding = embeddings[0].embedding;
      vectorDimension = Array.isArray(embedding) ? embedding.length : null;
    }

    // 测试当前配置生成的向量维度
    let currentDimension = null;
    let testError = null;

    try {
      const testText = "测试文本";
      let testEmbedding;

      if (settings.ollama_url.includes('openai.com') || (settings.api_key && settings.api_key !== 'sk')) {
        // OpenAI API
        const response = await fetch(`${settings.ollama_url}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.api_key}`,
          },
          body: JSON.stringify({
            model: settings.chat_model || 'text-embedding-3-small',
            input: testText,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          testEmbedding = data.data?.[0]?.embedding;
        } else {
          testError = await response.text();
        }
      } else {
        // Ollama API
        const response = await fetch(`${settings.ollama_url}/api/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: settings.chat_model || 'nomic-embed-text',
            prompt: testText,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          testEmbedding = data.embedding;
        } else {
          testError = await response.text();
        }
      }

      if (testEmbedding && Array.isArray(testEmbedding)) {
        currentDimension = testEmbedding.length;
      }
    } catch (error: any) {
      testError = error.message;
    }

    // 判断是否一致
    const isConsistent = vectorDimension === currentDimension;

    // 常见模型维度
    const modelDimensions: Record<string, number> = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536,
      'nomic-embed-text': 768,
      'mxbai-embed-large': 1024,
      'deepseek-coder': 2048,
    };

    const expectedDimension = modelDimensions[settings.chat_model] || '未知';

    return NextResponse.json({
      success: true,
      diagnosis: {
        currentConfig: {
          apiUrl: settings.ollama_url,
          model: settings.chat_model,
          hasApiKey: !!settings.api_key,
        },
        storedVectors: {
          count: embeddings?.length || 0,
          dimension: vectorDimension,
        },
        currentModel: {
          dimension: currentDimension,
          testError: testError,
        },
        expectedDimension: expectedDimension,
        isConsistent: isConsistent,
        warning: !isConsistent ? 
          '⚠️ 警告：当前模型生成的向量维度与已存储的向量维度不一致！这会导致搜索结果不准确。' : 
          '✅ 模型配置一致',
        recommendation: !isConsistent ?
          `建议：\n1. 如果要使用当前模型（${settings.chat_model}），请重新向量化所有数据项\n2. 或者切换回原来的模型` :
          '模型配置正确，可以正常使用'
      }
    });

  } catch (error: any) {
    console.error('诊断错误:', error);
    return NextResponse.json(
      { error: error.message || '诊断失败' },
      { status: 500 }
    );
  }
}
