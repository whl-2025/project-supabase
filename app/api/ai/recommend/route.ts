/**
 * 推荐相似数据项 API
 * 
 * 功能：基于一个数据项，推荐其他相似的数据项
 * 
 * 工作原理：
 * 1. 获取指定数据项的向量
 * 2. 在数据库中搜索向量相似的其他数据项
 * 3. 返回相似度最高的结果
 * 
 * 与搜索 API 的区别：
 * - 搜索 API：用户输入文本 → 生成向量 → 搜索
 * - 推荐 API：已有数据项 → 使用其向量 → 搜索
 * 
 * 使用场景：
 * - "相关推荐"功能
 * - "你可能还喜欢"
 * - 内容发现
 * 
 * 请求参数：
 * - itemId: 数据项 ID（必填）
 * - limit: 返回结果数量，默认 5（可选）
 * - threshold: 相似度阈值，默认 0.7（可选）
 * 
 * 返回数据：
 * - success: 是否成功
 * - results: 推荐结果数组
 * - count: 结果数量
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

    // ========== 步骤 2：解析请求参数 ==========
    const body = await request.json();
    const { itemId, limit, threshold } = body;

    // 验证必填参数
    if (!itemId) {
      return NextResponse.json(
        { error: '缺少数据项ID' },
        { status: 400 }
      );
    }

    // 设置默认值
    const matchCount = limit || 5;        // 默认返回 5 个推荐
    const matchThreshold = threshold || 0.7;  // 默认相似度阈值 0.7

    // ========== 步骤 3：调用数据库推荐函数 ==========
    // recommend_similar_items 是在数据库迁移文件中定义的 PostgreSQL 函数
    // 它会：
    // 1. 获取指定数据项的向量
    // 2. 搜索向量相似的其他数据项（排除自己）
    // 3. 返回相似度最高的结果
    const { data: results, error: recommendError } = await supabase.rpc('recommend_similar_items', {
      item_id_param: itemId,           // 基准数据项 ID
      match_count: matchCount,         // 返回数量
      match_threshold: matchThreshold, // 相似度阈值
    });

    // 检查是否成功
    if (recommendError) {
      console.error('推荐错误:', recommendError);
      throw new Error('推荐失败: ' + recommendError.message);
    }

    // ========== 返回推荐结果 ==========
    return NextResponse.json({
      success: true,
      results: results || [],
      count: results?.length || 0,
    });

  } catch (error: any) {
    console.error('推荐错误:', error);
    return NextResponse.json(
      { error: error.message || '推荐失败' },
      { status: 500 }
    );
  }
}

