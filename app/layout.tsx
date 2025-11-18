import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AntdAppProvider from '@/components/AntdAppProvider';
import "./globals.css";

export const metadata: Metadata = {
  title: "项目信息管理系统",
  description: "基于 Supabase 的项目信息管理 Demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <ConfigProvider
            locale={zhCN}
            theme={{
              token: {
                colorPrimary: '#1890ff',
                borderRadius: 6,
              },
            }}
          >
            <AntdAppProvider>
              {children}
            </AntdAppProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}

