"use client";

import { useState, useEffect } from "react";
import { 
  Card, Row, Col, Statistic, List, Typography, Space, Tag, Empty,
  Progress, Timeline, Avatar, Button, message
} from 'antd';
import {
  ProjectOutlined,
  FileOutlined,
  TeamOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const { Title, Text, Paragraph } = Typography;

interface DashboardStats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_files: number;
  unread_notifications: number;
  vector_items: number;
  total_teams: number;
}

interface RecentProject {
  id: string;
  name: string;
  status: string;
  updated_at: string;
}

interface RecentActivity {
  id: string;
  action: string;
  resource_type: string;
  created_at: string;
  details: any;
}

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    total_files: 0,
    unread_notifications: 0,
    vector_items: 0,
    total_teams: 0,
  });
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    checkUser();
    fetchDashboardData();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 获取统计数据 - 直接查询而不是使用 RPC
      const [
        { count: totalProjects },
        { count: activeProjects },
        { count: completedProjects },
        { count: totalFiles },
        { count: unreadNotifications },
        { count: vectorItems },
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('status', 'active'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', user.id).eq('status', 'completed'),
        supabase.from('files').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
        supabase.from('vector_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      // 获取团队数量
      const { data: ownedTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', user.id);
      
      const { data: memberTeams } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);

      const totalTeams = (ownedTeams?.length || 0) + (memberTeams?.length || 0);

      const statsData = {
        total_projects: totalProjects || 0,
        active_projects: activeProjects || 0,
        completed_projects: completedProjects || 0,
        total_files: totalFiles || 0,
        unread_notifications: unreadNotifications || 0,
        vector_items: vectorItems || 0,
        total_teams: totalTeams,
      };
      
      console.log("统计数据:", statsData);
      setStats(statsData);

      // 获取最近项目
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status, updated_at')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);
      
      if (projectsError) {
        console.error("获取项目失败:", projectsError);
      }
      
      if (projects) {
        console.log("获取到的项目:", projects);
        setRecentProjects(projects);
      }

      // 获取最近活动
      const { data: activities, error: activitiesError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (activitiesError) {
        console.error("获取活动失败:", activitiesError);
      }
      
      if (activities) {
        console.log("获取到的活动:", activities);
        setRecentActivities(activities);
      }

    } catch (err: any) {
      console.error("加载仪表板数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'green',
      'completed': 'blue',
      'paused': 'default',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      'active': '进行中',
      'completed': '已完成',
      'paused': '已暂停',
    };
    return texts[status] || status;
  };

  const getActivityIcon = (resourceType: string) => {
    const icons: Record<string, any> = {
      'project': <ProjectOutlined />,
      'file': <FileOutlined />,
      'team': <TeamOutlined />,
      'ai': <RobotOutlined />,
    };
    return icons[resourceType] || <CheckCircleOutlined />;
  };

  const getActivityText = (activity: RecentActivity) => {
    const actions: Record<string, string> = {
      'create': '创建了',
      'update': '更新了',
      'delete': '删除了',
      'upload': '上传了',
    };
    const actionText = actions[activity.action] || activity.action;
    return `${actionText} ${activity.resource_type}`;
  };

  const completionRate = stats.total_projects > 0 
    ? Math.round((stats.completed_projects / stats.total_projects) * 100) 
    : 0;

  return (
    <DashboardLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>仪表板</Title>
          <Text type="secondary">欢迎回来！这是您的工作概览</Text>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <Statistic
                title="总项目数"
                value={stats.total_projects}
                prefix={<ProjectOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <Statistic
                title="进行中"
                value={stats.active_projects}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <Statistic
                title="已完成"
                value={stats.completed_projects}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <Statistic
                title="完成率"
                value={completionRate}
                suffix="%"
                prefix={<RiseOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <Statistic
                title="文件数"
                value={stats.total_files}
                prefix={<FileOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <Statistic
                title="AI 知识库"
                value={stats.vector_items}
                prefix={<RobotOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <Statistic
                title="团队数"
                value={stats.total_teams}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <Statistic
                title="未读通知"
                value={stats.unread_notifications}
                prefix={<BellOutlined />}
                valueStyle={{ color: stats.unread_notifications > 0 ? '#ff4d4f' : undefined }}
              />
            </Card>
          </Col>
        </Row>

        {/* 项目完成进度 */}
        {stats.total_projects > 0 && (
          <Card title="项目完成进度" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text>已完成 {stats.completed_projects} / {stats.total_projects} 个项目</Text>
                <Progress 
                  percent={completionRate} 
                  status={completionRate === 100 ? 'success' : 'active'}
                  style={{ marginTop: 8 }}
                />
              </div>
              <Row gutter={16}>
                <Col span={8}>
                  <Text type="secondary">进行中: </Text>
                  <Text strong>{stats.active_projects}</Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary">已完成: </Text>
                  <Text strong style={{ color: '#52c41a' }}>{stats.completed_projects}</Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary">总计: </Text>
                  <Text strong>{stats.total_projects}</Text>
                </Col>
              </Row>
            </Space>
          </Card>
        )}

        <Row gutter={[16, 16]}>
          {/* 最近项目 */}
          <Col xs={24} lg={12}>
            <Card 
              title="最近项目" 
              loading={loading}
              extra={<a onClick={() => router.push('/projects')}>查看全部</a>}
            >
              {recentProjects.length === 0 ? (
                <Empty description="暂无项目" />
              ) : (
                <List
                  dataSource={recentProjects}
                  renderItem={(project) => (
                    <List.Item
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/projects`)}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<ProjectOutlined />} />}
                        title={project.name}
                        description={
                          <Space>
                            <Tag color={getStatusColor(project.status)}>
                              {getStatusText(project.status)}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {new Date(project.updated_at).toLocaleString('zh-CN')}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>

          {/* 最近活动 */}
          <Col xs={24} lg={12}>
            <Card 
              title="最近活动" 
              loading={loading}
              extra={<a onClick={() => router.push('/activity')}>查看全部</a>}
            >
              {recentActivities.length === 0 ? (
                <Empty description="暂无活动" />
              ) : (
                <Timeline
                  items={recentActivities.map((activity) => ({
                    dot: getActivityIcon(activity.resource_type),
                    children: (
                      <div>
                        <Text>{getActivityText(activity)}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(activity.created_at).toLocaleString('zh-CN')}
                        </Text>
                      </div>
                    ),
                  }))}
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* 快速操作 */}
        <Card title="快速操作">
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Card 
                hoverable 
                onClick={() => router.push('/projects')}
                style={{ textAlign: 'center' }}
              >
                <ProjectOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>创建项目</Paragraph>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card 
                hoverable 
                onClick={() => router.push('/files')}
                style={{ textAlign: 'center' }}
              >
                <FileOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>上传文件</Paragraph>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card 
                hoverable 
                onClick={() => router.push('/teams')}
                style={{ textAlign: 'center' }}
              >
                <TeamOutlined style={{ fontSize: 32, color: '#faad14' }} />
                <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>创建团队</Paragraph>
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card 
                hoverable 
                onClick={() => router.push('/ai/items')}
                style={{ textAlign: 'center' }}
              >
                <RobotOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>AI 助手</Paragraph>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* 测试数据生成 */}
        {stats.total_projects === 0 && (
          <Card title="🎉 首次使用？">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>点击下方按钮生成测试数据，快速体验系统功能：</Text>
              <Button 
                type="primary" 
                size="large"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/test-data', {
                      method: 'POST',
                    });
                    const data = await response.json();
                    if (data.success) {
                      message.success('测试数据生成成功！');
                      fetchDashboardData();
                    } else {
                      message.error(data.error || '生成失败');
                    }
                  } catch (err: any) {
                    message.error('生成失败: ' + err.message);
                  }
                }}
              >
                生成测试数据
              </Button>
              <Text type="secondary" style={{ fontSize: 12 }}>
                将创建：通知、活动日志、团队、文件记录等示例数据
              </Text>
            </Space>
          </Card>
        )}
      </Space>
    </DashboardLayout>
  );
}
