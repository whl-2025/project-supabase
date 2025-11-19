"use client";

import { useState } from 'react';
import { Layout, Menu } from 'antd';
import { usePathname, useRouter } from "next/navigation";
import {
  HomeOutlined,
  ProjectOutlined,
  RobotOutlined,
  DatabaseOutlined,
  SettingOutlined,
  SearchOutlined,
  FileOutlined,
  TeamOutlined,
  HistoryOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems: MenuItem[] = [
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
      key: 'ai',
      icon: <RobotOutlined />,
      label: 'AI 助手',
      children: [
        {
          key: '/ai/items',
          icon: <DatabaseOutlined />,
          label: '知识库管理',
        },
        {
          key: '/ai/search',
          icon: <SearchOutlined />,
          label: '智能问答',
        },
        {
          key: '/ai/settings',
          icon: <SettingOutlined />,
          label: '模型配置',
        },
        // {
        //   key: '/ai/diagnose',
        //   icon: <ExperimentOutlined />,
        //   label: '模型诊断',
        // },
      ],
    },
    {
      key: '/files',
      icon: <FileOutlined />,
      label: '文件管理',
    },
    // {
    //   key: '/teams',
    //   icon: <TeamOutlined />,
    //   label: '团队管理',
    // },
    // {
    //   key: '/activity',
    //   icon: <HistoryOutlined />,
    //   label: '活动日志',
    // },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  const getSelectedKey = () => {
    // 如果是根路径，选中首页
    if (pathname === '/') return ['/home'];
    
    // AI 子菜单匹配
    if (pathname.startsWith('/ai/')) {
      return [pathname];
    }
    
    // 精确匹配
    if (pathname === '/home' || pathname === '/projects' || pathname === '/files' || 
        pathname === '/teams' || pathname === '/activity') {
      return [pathname];
    }
    
    // 前缀匹配（用于子路由）
    if (pathname.startsWith('/projects/')) return ['/projects'];
    if (pathname.startsWith('/files/')) return ['/files'];
    if (pathname.startsWith('/teams/')) return ['/teams'];
    if (pathname.startsWith('/activity/')) return ['/activity'];
    
    return ['/home'];
  };

  const getOpenKeys = () => {
    if (pathname.startsWith('/ai/')) {
      return ['ai'];
    }
    return [];
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
        defaultOpenKeys={getOpenKeys()}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </Sider>
  );
}
