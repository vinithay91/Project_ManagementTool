import pool from '../db.js';

export async function isProjectMember(projectId, userId) {
  const [rows] = await pool.execute(
    'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  return rows.length > 0;
}

export async function taskAndMember(taskId, userId) {
  const [rows] = await pool.execute(
    `SELECT t.id, t.project_id FROM tasks t
     JOIN project_members pm ON pm.project_id = t.project_id
     WHERE t.id = ? AND pm.user_id = ?`,
    [taskId, userId]
  );
  return rows[0] || null;
}
