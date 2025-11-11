"use client";

import { useState } from 'react';
import { Layout, Menu } from 'antd';
import { usePathname, useRouter } from "next/navigation";
import {
  HomeOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  BarChartOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: '/home',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: '项目管理',
    },
    {
      key: '/tasks',
      icon: <CheckSquareOutlined />,
      label: '任务管理',
    },
    {
      key: '/documents',
      icon: <FileTextOutlined />,
      label: '文档管理',
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: '报告',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  const getSelectedKey = () => {
    // 如果是根路径，选中首页
    if (pathname === '/') return ['/home'];
    
    // 精确匹配
    const exactMatch = menuItems.find(item => item.key === pathname);
    if (exactMatch) return [exactMatch.key];
    
    // 前缀匹配（用于子路由，如 /projects/123）
    const prefixMatch = menuItems.find(item => 
      item.key !== '/home' && pathname.startsWith(item.key + '/')
    );
    
    return prefixMatch ? [prefixMatch.key] : ['/home'];
  };

  return (
    <Sider 
      collapsible 
      collapsed={collapsed} 
      onCollapse={setCollapsed}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'sticky',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div style={{ 
        height: 64, 
        margin: 16, 
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: collapsed ? 14 : 18,
        fontWeight: 'bold',
      }}>
        {collapsed ? 'PM' : '项目管理系统'}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={getSelectedKey()}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </Sider>
  );
}
