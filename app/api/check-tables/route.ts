import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
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

    // 检查各个表是否存在
    const tables = [
      'projects',
      'files',
      'notifications',
      'activity_logs',
      'user_settings',
      'teams',
      'team_members',
      'vector_items',
    ];

    const results: Record<string, any> = {};

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        results[table] = {
          exists: !error,
          count: count || 0,
          error: error?.message || null,
        };
      } catch (err: any) {
        results[table] = {
          exists: false,
          count: 0,
          error: err.message,
        };
      }
    }

    return NextResponse.json({
      success: true,
      user_id: user.id,
      tables: results,
    });

  } catch (error: any) {
    console.error('检查表错误:', error);
    return NextResponse.json(
      { error: error.message || '检查失败' },
      { status: 500 }
    );
  }
}
