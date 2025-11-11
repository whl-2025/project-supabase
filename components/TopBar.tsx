"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Tabs from "./Tabs";

interface Tab {
  path: string;
  label: string;
}

const menuLabels: Record<string, string> = {
  "/": "首页",
  "/projects": "项目管理",
  "/tasks": "任务管理",
  "/documents": "文档管理",
  "/reports": "报告",
};

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<{ email?: string; user_metadata?: { username?: string } } | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  useEffect(() => {
    // 初始化标签页
    const initialTabs = localStorage.getItem("tabs");
    let currentTabs: Tab[] = [];
    
    if (initialTabs) {
      currentTabs = JSON.parse(initialTabs);
    } else {
      // 默认添加首页标签
      currentTabs = [{ path: "/", label: "首页" }];
      localStorage.setItem("tabs", JSON.stringify(currentTabs));
    }
    
    setTabs(currentTabs);
    
    // 当前路径不在标签页中时，添加新标签
    if (pathname && !currentTabs.find((tab) => tab.path === pathname)) {
      const label = menuLabels[pathname] || pathname;
      const newTabs = [...currentTabs, { path: pathname, label }];
      setTabs(newTabs);
      localStorage.setItem("tabs", JSON.stringify(newTabs));
    }
  }, [pathname]);

  const handleCloseTab = (path: string) => {
    setTabs((prevTabs) => {
      const newTabs = prevTabs.filter((tab) => tab.path !== path);
      localStorage.setItem("tabs", JSON.stringify(newTabs));

      // 如果关闭的是当前标签，跳转到其他标签或首页
      if (path === pathname) {
        if (newTabs.length > 0) {
          router.push(newTabs[newTabs.length - 1].path);
        } else {
          router.push("/");
        }
      }

      return newTabs;
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // 获取显示的用户名（优先使用 metadata 中的 username，否则使用 email 的用户名部分）
  const displayName = user?.user_metadata?.username || 
    (user?.email ? user.email.split("@")[0] : "加载中...");

  return (
    <div className="h-14 bg-blue-400 border-b border-blue-500 flex items-center justify-between px-6 shadow-sm">
      {/* 左侧标签页 */}
      <div className="flex-1">
        <Tabs tabs={tabs} onClose={handleCloseTab} />
      </div>

      {/* 右侧用户信息和退出 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 rounded-lg">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-white">{displayName}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-1.5 text-white hover:bg-blue-500 rounded-lg transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          退出登录
        </button>
      </div>
    </div>
  );
}
