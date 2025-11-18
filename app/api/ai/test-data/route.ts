/**
 * 创建测试数据 API
 * 
 * 功能：快速创建一些测试数据项，用于测试向量搜索功能
 * 
 * 工作流程：
 * 1. 验证用户身份
 * 2. 批量插入预定义的测试数据到 vector_items 表
 * 3. 返回创建的数据项
 * 
 * 注意：
 * - 创建后需要手动点击"向量化"按钮才能进行搜索
 * - 测试数据包含不同类别的技术文章
 * 
 * 返回数据：
 * - success: 是否成功
 * - count: 创建的数据项数量
 * - items: 创建的数据项列表
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// 预定义的测试数据
// 包含不同主题的技术文章，用于测试语义搜索的准确性
const testData = [
  {
    title: "Next.js 入门指南",
    content: "Next.js 是一个基于 React 的全栈框架，提供了服务器端渲染、静态站点生成、API 路由等功能。它简化了 React 应用的开发流程，提供了开箱即用的优化和最佳实践。",
    category: "前端开发",
    tags: ["Next.js", "React", "前端"],
  },
  {
    title: "TypeScript 最佳实践",
    content: "TypeScript 是 JavaScript 的超集，添加了静态类型系统。使用 TypeScript 可以在编译时发现错误，提供更好的代码提示和重构支持。建议使用严格模式，定义清晰的接口和类型。",
    category: "编程语言",
    tags: ["TypeScript", "JavaScript", "类型系统"],
  },
  {
    title: "Supabase 数据库操作",
    content: "Supabase 是一个开源的 Firebase 替代品，基于 PostgreSQL。它提供了实时数据库、认证、存储和边缘函数等功能。使用 Supabase 可以快速构建全栈应用。",
    category: "后端开发",
    tags: ["Supabase", "PostgreSQL", "数据库"],
  },
  {
    title: "React Hooks 使用技巧",
    content: "React Hooks 让函数组件也能使用状态和生命周期。常用的 Hooks 包括 useState、useEffect、useContext 等。使用 Hooks 可以让代码更简洁，逻辑更清晰。",
    category: "前端开发",
    tags: ["React", "Hooks", "前端"],
  },
  {
    title: "AI 向量搜索原理",
    content: "向量搜索是一种基于语义相似度的搜索方法。通过将文本转换为向量，可以计算文本之间的相似度。常用的向量数据库包括 pgvector、Pinecone、Weaviate 等。",
    category: "人工智能",
    tags: ["AI", "向量搜索", "机器学习"],
  },
];

export async function POST() {
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

    // ========== 步骤 2：准备数据 ==========
    // 为每个测试数据项添加 user_id
    const dataToInsert = testData.map(item => ({
      ...item,
      user_id: user.id,  // 关联到当前用户
    }));

    // ========== 步骤 3：批量插入数据 ==========
    const { data, error } = await supabase
      .from('vector_items')
      .insert(dataToInsert)
      .select();  // 返回插入的数据

    if (error) {
      throw error;
    }

    // ========== 返回结果 ==========
    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      items: data,
    });

  } catch (error: any) {
    console.error('创建测试数据错误:', error);
    return NextResponse.json(
      { error: error.message || '创建测试数据失败' },
      { status: 500 }
    );
  }
}
