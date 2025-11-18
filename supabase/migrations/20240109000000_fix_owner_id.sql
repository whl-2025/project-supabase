-- 修复统计函数，使用 owner_id 而不是 user_id

DROP FUNCTION IF EXISTS get_dashboard_stats(UUID);

CREATE OR REPLACE FUNCTION get_dashboard_stats(user_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_projects', (SELECT COUNT(*) FROM projects WHERE owner_id = user_id_param),
    'active_projects', (SELECT COUNT(*) FROM projects WHERE owner_id = user_id_param AND status = 'active'),
    'completed_projects', (SELECT COUNT(*) FROM projects WHERE owner_id = user_id_param AND status = 'completed'),
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
