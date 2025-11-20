"use client";

import { Typography, Space } from 'antd';
import GlobalChat from '@/components/GlobalChat';
import DashboardLayout from '@/components/DashboardLayout';

const { Title, Text } = Typography;

export default function ChatPage() {
  return (
    <DashboardLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>聊天室</Title>
          <Text type="secondary">与所有在线用户实时交流</Text>
        </div>
        <GlobalChat />
      </Space>
    </DashboardLayout>
  );
}
