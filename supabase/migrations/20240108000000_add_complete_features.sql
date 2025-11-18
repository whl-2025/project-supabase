-- 添加完整功能的数据库表

-- 1. 文件存储表
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 活动日志表
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 用户配置表
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'zh-CN',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 团队表
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 团队成员表
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 7. 项目成员表（支持团队协作）
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS files_user_id_idx ON files(user_id);
CREATE INDEX IF NOT EXISTS files_project_id_idx ON files(project_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON team_members(team_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON team_members(user_id);
CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON project_members(user_id);

-- 启用行级安全
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 文件策略
CREATE POLICY "Users can view own files"
ON files FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files"
ON files FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
ON files FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
ON files FOR DELETE
USING (auth.uid() = user_id);

-- 通知策略
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

-- 活动日志策略
CREATE POLICY "Users can view own activity logs"
ON activity_logs FOR SELECT
USING (auth.uid() = user_id);

-- 用户配置策略
CREATE POLICY "Users can view own settings"
ON user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
ON user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
ON user_settings FOR UPDATE
USING (auth.uid() = user_id);

-- 团队策略
CREATE POLICY "Users can view teams they belong to"
ON teams FOR SELECT
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = teams.id
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create teams"
ON teams FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update teams"
ON teams FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Team owners can delete teams"
ON teams FOR DELETE
USING (auth.uid() = owner_id);

-- 团队成员策略
CREATE POLICY "Users can view team members of their teams"
ON team_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Team owners and admins can manage members"
ON team_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
    AND teams.owner_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'admin'
  )
);

-- 项目成员策略
CREATE POLICY "Users can view project members"
ON project_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_members.project_id
    AND projects.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can manage members"
ON project_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_members.project_id
    AND projects.user_id = auth.uid()
  )
);

-- 更新时间触发器
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 创建统计函数
CREATE OR REPLACE FUNCTION get_dashboard_stats(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_projects', (SELECT COUNT(*) FROM projects WHERE user_id = user_id_param),
    'active_projects', (SELECT COUNT(*) FROM projects WHERE user_id = user_id_param AND status = 'in_progress'),
    'completed_projects', (SELECT COUNT(*) FROM projects WHERE user_id = user_id_param AND status = 'completed'),
    'total_files', (SELECT COUNT(*) FROM files WHERE user_id = user_id_param),
    'unread_notifications', (SELECT COUNT(*) FROM notifications WHERE user_id = user_id_param AND is_read = FALSE),
    'vector_items', (SELECT COUNT(*) FROM vector_items WHERE user_id = user_id_param),
    'total_teams', (
      SELECT COUNT(*) FROM teams WHERE owner_id = user_id_param
      UNION
      SELECT COUNT(*) FROM team_members WHERE user_id = user_id_param
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 创建活动日志函数
CREATE OR REPLACE FUNCTION log_activity(
  user_id_param UUID,
  action_param TEXT,
  resource_type_param TEXT,
  resource_id_param UUID DEFAULT NULL,
  details_param JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
  VALUES (user_id_param, action_param, resource_type_param, resource_id_param, details_param)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 创建通知函数
CREATE OR REPLACE FUNCTION create_notification(
  user_id_param UUID,
  title_param TEXT,
  content_param TEXT,
  type_param TEXT DEFAULT 'info',
  link_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, content, type, link)
  VALUES (user_id_param, title_param, content_param, type_param, link_param)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;
