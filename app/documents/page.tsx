"use client";

import { useEffect } from "react";
import { Button, Empty, Typography } from 'antd';
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const { Title } = Typography;

export default function DocumentsPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      }
    };
    checkUser();
  }, [router, supabase]);

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>文档管理</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          添加文档
        </Button>
      </div>

      <Empty
        image={<FileTextOutlined style={{ fontSize: 80, color: '#d9d9d9' }} />}
        description={
          <div>
            <Title level={4}>文档管理功能</Title>
            <p>此功能正在开发中，敬请期待</p>
          </div>
        }
        style={{ padding: '60px 0' }}
      />
    </DashboardLayout>
  );
}
