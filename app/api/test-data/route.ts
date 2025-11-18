import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST() {
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

    // 1. 创建用户设置
    await supabase.from('user_settings').upsert({
      user_id: user.id,
      theme: 'light',
      language: 'zh-CN',
      notifications_enabled: true,
      email_notifications: true,
      bio: '这是一个测试用户的个人简介',
    });

    // 2. 创建通知
    const notifications = [
      {
        user_id: user.id,
        title: '欢迎使用项目管理系统',
        content: '感谢您注册使用我们的项目管理系统，祝您使用愉快！',
        type: 'success',
      },
      {
        user_id: user.id,
        title: '系统更新通知',
        content: '系统已更新到最新版本，新增了文件管理和团队协作功能。',
        type: 'info',
      },
      {
        user_id: user.id,
        title: '项目即将到期',
        content: '您有一个项目即将到期，请及时处理。',
        type: 'warning',
        link: '/projects',
      },
    ];

    for (const notification of notifications) {
      await supabase.from('notifications').insert(notification);
    }

    // 3. 创建活动日志
    const activities = [
      {
        user_id: user.id,
        action: 'create',
        resource_type: 'project',
        details: { name: '测试项目' },
      },
      {
        user_id: user.id,
        action: 'upload',
        resource_type: 'file',
        details: { name: '项目文档.pdf' },
      },
      {
        user_id: user.id,
        action: 'create',
        resource_type: 'team',
        details: { name: '开发团队' },
      },
      {
        user_id: user.id,
        action: 'update',
        resource_type: 'project',
        details: { name: '测试项目', status: 'in_progress' },
      },
    ];

    for (const activity of activities) {
      await supabase.from('activity_logs').insert(activity);
    }

    // 4. 创建团队
    const { data: team } = await supabase
      .from('teams')
      .insert({
        name: '开发团队',
        description: '负责系统开发的核心团队',
        owner_id: user.id,
      })
      .select()
      .single();

    if (team) {
      // 添加团队成员（自己）
      await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: user.id,
        role: 'owner',
      });
    }

    // 5. 创建文件记录（模拟）
    const files = [
      {
        user_id: user.id,
        name: '项目需求文档.pdf',
        size: 1024000,
        mime_type: 'application/pdf',
        storage_path: 'documents/requirements.pdf',
        url: null,
      },
      {
        user_id: user.id,
        name: '设计稿.fig',
        size: 2048000,
        mime_type: 'application/octet-stream',
        storage_path: 'designs/mockup.fig',
        url: null,
      },
      {
        user_id: user.id,
        name: '项目截图.png',
        size: 512000,
        mime_type: 'image/png',
        storage_path: 'images/screenshot.png',
        url: null,
      },
    ];

    for (const file of files) {
      await supabase.from('files').insert(file);
    }

    return NextResponse.json({
      success: true,
      message: '测试数据创建成功',
      data: {
        notifications: notifications.length,
        activities: activities.length,
        teams: 1,
        files: files.length,
      },
    });

  } catch (error: any) {
    console.error('创建测试数据错误:', error);
    return NextResponse.json(
      { error: error.message || '创建测试数据失败' },
      { status: 500 }
    );
  }
}
