"use client";

import { useState, useEffect } from "react";
import { Layout, Dropdown, Avatar, Space, Tabs, Badge, Button } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined, 
  BellOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";

const { Header } = Layout;

interface Tab {
  key: string;
  label: string;
  closable: boolean;
}

const routeLabels: Record<string, string> = {
  "/home": "仪表板",
  "/projects": "项目管理",
  "/ai/items": "知识库管理",
  "/ai/search": "智能问答",
  "/ai/settings": "模型配置",
  "/files": "文件管理",
  "/teams": "团队管理",
  "/activity": "活动日志",
  "/settings": "系统设置",
  "/notifications": "通知中心",
};

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<{ email?: string; user_metadata?: { username?: string } } | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([{ key: "/home", label: "仪表板", closable: false }]);
  const [activeKey, setActiveKey] = useState("/home");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // 获取未读通知数量
      if (user) {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        setUnreadCount(count || 0);
      }
    };
    getUser();
  }, [supabase]);

  useEffect(() => {
    // 从 localStorage 恢复标签页
    const savedTabs = localStorage.getItem("tabs");
    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs);
        setTabs(parsedTabs);
      } catch (e) {
        console.error("Failed to parse saved tabs", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!pathname) return;

    // 更新当前激活的标签
    setActiveKey(pathname);

    // 使用函数式更新来获取最新的 tabs 状态
    setTabs(currentTabs => {
      // 检查当前路径是否已经在标签页中
      const existingTab = currentTabs.find(tab => tab.key === pathname);
      
      if (!existingTab) {
        // 获取路由标签名称
        let label = routeLabels[pathname];
        
        // 如果是动态路由，尝试提取 ID
        if (!label) {
          if (pathname.startsWith("/projects/")) {
            label = "项目详情";
          } else {
            label = pathname;
          }
        }

        // 添加新标签
        const newTabs = [...currentTabs, { key: pathname, label, closable: true }];
        localStorage.setItem("tabs", JSON.stringify(newTabs));
        return newTabs;
      }
      
      return currentTabs;
    });
  }, [pathname]);

  const handleTabChange = (key: string) => {
    setActiveKey(key);
    router.push(key);
  };

  const handleTabEdit = (targetKey: any, action: 'add' | 'remove') => {
    if (action === 'remove') {
      const targetIndex = tabs.findIndex(tab => tab.key === targetKey);
      const newTabs = tabs.filter(tab => tab.key !== targetKey);
      
      if (newTabs.length === 0) {
        // 如果所有标签都被关闭，保留首页
        newTabs.push({ key: "/home", label: "首页", closable: false });
      }

      // 如果关闭的是当前激活的标签，切换到相邻标签
      if (targetKey === activeKey) {
        const newActiveKey = targetIndex > 0 
          ? newTabs[targetIndex - 1].key 
          : newTabs[0].key;
        setActiveKey(newActiveKey);
        router.push(newActiveKey);
      }

      setTabs(newTabs);
      localStorage.setItem("tabs", JSON.stringify(newTabs));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("tabs");
    router.push("/login");
    router.refresh();
  };

  const displayName = user?.email || "用户";

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      onClick: () => router.push('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleSignOut,
    },
  ];

  return (
    <Header style={{ 
      padding: '0 24px', 
      background: '#fff', 
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ flex: 1, marginRight: 24 }}>
        <Tabs
          type="editable-card"
          activeKey={activeKey}
          onChange={handleTabChange}
          onEdit={handleTabEdit}
          hideAdd
          items={tabs.map(tab => ({
            key: tab.key,
            label: tab.label,
            closable: tab.closable,
          }))}
          style={{ marginBottom: 0 }}
        />
      </div>
      <Space size="large">
        <Badge count={unreadCount} offset={[-5, 5]}>
          <Button 
            type="text" 
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            onClick={() => router.push('/notifications')}
          />
        </Badge>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} />
            <span>{displayName}</span>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  );
}
