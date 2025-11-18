"use client";

import { useState, useEffect } from "react";
import { 
  List, Card, Typography, Space, Tag, Button, Empty, message 
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const { Title, Text } = Typography;

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    checkUser();
    fetchNotifications();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err: any) {
      message.error("加载通知失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
      message.success("已标记为已读");
    } catch (err: any) {
      message.error("操作失败: " + err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      message.success("已全部标记为已读");
    } catch (err: any) {
      message.error("操作失败: " + err.message);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setNotifications(notifications.filter(n => n.id !== id));
      message.success("删除成功");
    } catch (err: any) {
      message.error("删除失败: " + err.message);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      'info': <InfoCircleOutlined style={{ color: '#1890ff' }} />,
      'success': <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      'warning': <WarningOutlined style={{ color: '#faad14' }} />,
      'error': <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
    };
    return icons[type] || icons['info'];
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'info': 'blue',
      'success': 'green',
      'warning': 'orange',
      'error': 'red',
    };
    return colors[type] || 'default';
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <DashboardLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>通知中心</Title>
            <Text type="secondary">
              共 {notifications.length} 条通知，{unreadCount} 条未读
            </Text>
          </div>
          {unreadCount > 0 && (
            <Button 
              type="primary" 
              icon={<CheckOutlined />}
              onClick={markAllAsRead}
            >
              全部标记为已读
            </Button>
          )}
        </div>

        <Card>
          {notifications.length === 0 ? (
            <Empty 
              image={<BellOutlined style={{ fontSize: 80, color: '#d9d9d9' }} />}
              description="暂无通知"
            />
          ) : (
            <List
              dataSource={notifications}
              renderItem={(notification) => (
                <List.Item
                  style={{ 
                    background: notification.is_read ? 'transparent' : '#f0f5ff',
                    padding: '16px',
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                  actions={[
                    !notification.is_read && (
                      <Button 
                        type="link" 
                        icon={<CheckOutlined />}
                        onClick={() => markAsRead(notification.id)}
                      >
                        标记已读
                      </Button>
                    ),
                    <Button 
                      type="link" 
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => deleteNotification(notification.id)}
                    >
                      删除
                    </Button>,
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={getTypeIcon(notification.type)}
                    title={
                      <Space>
                        <span>{notification.title}</span>
                        {!notification.is_read && <Tag color="red">未读</Tag>}
                        <Tag color={getTypeColor(notification.type)}>
                          {notification.type}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text>{notification.content}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(notification.created_at).toLocaleString('zh-CN')}
                        </Text>
                        {notification.link && (
                          <Button 
                            type="link" 
                            size="small"
                            onClick={() => router.push(notification.link!)}
                          >
                            查看详情
                          </Button>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Space>
    </DashboardLayout>
  );
}
