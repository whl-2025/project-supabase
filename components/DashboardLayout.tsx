import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* 左侧菜单 */}
      <Sidebar />
      
      {/* 右侧内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <TopBar />
        
        {/* 主内容区域 */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
          <div className="bg-white rounded-lg shadow-sm p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
