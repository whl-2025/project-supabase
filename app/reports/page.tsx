"use client";

import { useEffect } from "react";
import { Button, Empty, Typography } from 'antd';
import { DownloadOutlined, BarChartOutlined } from '@ant-design/icons';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const { Title } = Typography;

export default function ReportsPage() {
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
        <Title level={2} style={{ margin: 0 }}>报告</Title>
        <Button type="primary" icon={<DownloadOutlined />}>
          导出报告
        </Button>
      </div>

      <Empty
        image={<BarChartOutlined style={{ fontSize: 80, color: '#d9d9d9' }} />}
        description={
          <div>
            <Title level={4}>报告功能</Title>
            <p>此功能正在开发中，敬请期待</p>
          </div>
        }
        style={{ padding: '60px 0' }}
      />
    </DashboardLayout>
  );
}
