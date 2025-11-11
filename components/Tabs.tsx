"use client";

import { usePathname, useRouter } from "next/navigation";

interface Tab {
  path: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  onClose: (path: string) => void;
}

export default function Tabs({ tabs, onClose }: TabsProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleTabClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        return (
          <div
            key={tab.path}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
              isActive
                ? "bg-white text-blue-500 border border-blue-300"
                : "bg-blue-500 text-blue-50 hover:bg-blue-600"
            }`}
            onClick={() => handleTabClick(tab.path)}
          >
            <span className="text-sm font-medium">{tab.label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.path);
              }}
              className={`ml-1 rounded-full p-0.5 transition-colors ${
                isActive
                  ? "hover:bg-gray-200"
                  : "hover:bg-blue-400"
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
