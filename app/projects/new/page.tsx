import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import ProjectForm from "@/components/ProjectForm";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">新建项目</h1>
          <p className="text-gray-600">创建一个新项目来开始管理你的工作</p>
        </div>
        <ProjectForm />
      </div>
    </DashboardLayout>
  );
}

