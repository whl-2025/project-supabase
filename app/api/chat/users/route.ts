import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // 验证用户登录
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 获取 URL 参数
    const { searchParams } = new URL(request.url);
    const userIds = searchParams.get('ids')?.split(',') || [];

    if (userIds.length === 0) {
      return NextResponse.json({ users: {} });
    }

    // 从数据库获取用户信息（这里需要一个存储用户信息的表）
    // 暂时返回用户ID的映射
    const userMap: Record<string, string> = {};
    userIds.forEach(id => {
      userMap[id] = id.substring(0, 8); // 显示前8位
    });

    return NextResponse.json({ users: userMap });
  } catch (error: any) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { error: error.message || '获取用户信息失败' },
      { status: 500 }
    );
  }
}
