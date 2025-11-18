"use client";

import { useState, useEffect } from "react";
import { 
  Card, Timeline, Typography, Space, Tag, Empty, Spin
} from 'antd';
import {
  ProjectOutlined,
  FileOutlined,
  TeamOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const { Title, Text } = Typography;

interface Activity {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  created_at: string;
}

export default function ActivityPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    checkUser();
    fetchActivities();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(data || []);
    } catch (err: any) {
      console.error("加载活动日志失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, any> = {
      'create': <PlusOutlined style={{ color: '#52c41a' }} />,
      'update': <EditOutlined style={{ color: '#1890ff' }} />,
      'delete': <DeleteOutlined style={{ color: '#ff4d4f' }} />,
      'upload': <FileOutlined style={{ color: '#faad14' }} />,
    };
    return icons[action] || <CheckCircleOutlined />;
  };

  const getResourceIcon = (resourceType: string) => {
    const icons: Record<string, any> = {
      'project': <ProjectOutlined />,
      'file': <FileOutlined />,
      'team': <TeamOutlined />,
      'ai': <RobotOutlined />,
    };
    return icons[resourceType] || <CheckCircleOutlined />;
  };

  const getActionText = (action: string) => {
    const texts: Record<string, string> = {
      'create': '创建',
      'update': '更新',
      'delete': '删除',
      'upload': '上传',
    };
    return texts[action] || action;
  };

  const getResourceText = (resourceType: string) => {
    const texts: Record<string, string> = {
      'project': '项目',
      'file': '文件',
      'team': '团队',
      'ai': 'AI 数据',
    };
    return texts[resourceType] || resourceType;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'create': 'green',
      'update': 'blue',
      'delete': 'red',
      'upload': 'orange',
    };
    return colors[action] || 'default';
  };

  return (
    <DashboardLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>活动日志</Title>
          <Text type="secondary">查看您的操作历史记录</Text>
        </div>

        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : activities.length === 0 ? (
            <Empty
              image={<HistoryOutlined style={{ fontSize: 80, color: '#d9d9d9' }} />}
              description="暂无活动记录"
            />
          ) : (
            <Timeline
              items={activities.map((activity) => ({
                dot: getActionIcon(activity.action),
                children: (
                  <div>
                    <Space>
                      <Tag color={getActionColor(activity.action)}>
                        {getActionText(activity.action)}
                      </Tag>
                      <Space size="small">
                        {getResourceIcon(activity.resource_type)}
                        <Text>{getResourceText(activity.resource_type)}</Text>
                      </Space>
                    </Space>
                    {activity.details && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary">
                          {activity.details.name && `名称: ${activity.details.name}`}
                          {activity.details.status && ` | 状态: ${activity.details.status}`}
                        </Text>
                      </div>
                    )}
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(activity.created_at).toLocaleString('zh-CN')}
                      </Text>
                    </div>
                  </div>
                ),
              }))}
            />
          )}
        </Card>
      </Space>
    </DashboardLayout>
  );
}
