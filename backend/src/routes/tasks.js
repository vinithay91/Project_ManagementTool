import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { taskAndMember, isProjectMember } from '../utils/access.js';

const router = Router();
router.use(requireAuth);

router.patch('/:id', async (req, res, next) => {
  try {
    const task = await taskAndMember(req.params.id, req.user.id);
    if (!task) return res.status(403).json({ message: 'Task not found or access denied.' });
    const allowed = ['title','description','status','priority','assignee_id','due_date'];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        let value = req.body[key];
        if (key === 'title') value = String(value || '').trim();
        if (key === 'assignee_id') value = value ? Number(value) : null;
        if (key === 'status' && !['todo','in_progress','done'].includes(value)) return res.status(400).json({ message: 'Invalid task status.' });
        if (key === 'priority' && !['low','medium','high'].includes(value)) return res.status(400).json({ message: 'Invalid priority.' });
        if (key === 'title' && !value) return res.status(400).json({ message: 'Task title cannot be empty.' });
        if (key === 'assignee_id' && value && !(await isProjectMember(task.project_id, value))) return res.status(400).json({ message: 'Assignee must be a project member.' });
        updates.push(`${key}=?`); values.push(value);
      }
    }
    if (!updates.length) return res.status(400).json({ message: 'No task fields supplied.' });
    values.push(req.params.id);
    await pool.execute(`UPDATE tasks SET ${updates.join(', ')} WHERE id=?`, values);
    const [rows] = await pool.execute(
      `SELECT t.*, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id WHERE t.id=?`,
      [req.params.id]);
    res.json({ task: rows[0] });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const task = await taskAndMember(req.params.id, req.user.id);
    if (!task) return res.status(403).json({ message: 'Task not found or access denied.' });
    await pool.execute('DELETE FROM tasks WHERE id=?', [req.params.id]);
    res.json({ message: 'Task deleted.' });
  } catch (err) { next(err); }
});

router.get('/:id/comments', async (req, res, next) => {
  try {
    if (!(await taskAndMember(req.params.id, req.user.id))) return res.status(403).json({ message: 'Task access denied.' });
    const [comments] = await pool.execute(
      `SELECT c.id,c.task_id,c.body,c.created_at,u.id AS user_id,u.name AS user_name
       FROM comments c JOIN users u ON u.id=c.user_id WHERE c.task_id=? ORDER BY c.created_at ASC`,
      [req.params.id]);
    res.json({ comments });
  } catch (err) { next(err); }
});

router.post('/:id/comments', async (req, res, next) => {
  try {
    if (!(await taskAndMember(req.params.id, req.user.id))) return res.status(403).json({ message: 'Task access denied.' });
    const body = String(req.body.body || '').trim();
    if (!body) return res.status(400).json({ message: 'Comment cannot be empty.' });
    const [result] = await pool.execute('INSERT INTO comments (task_id,user_id,body) VALUES (?,?,?)',
      [req.params.id,req.user.id,body]);
    const [rows] = await pool.execute(
      `SELECT c.id,c.task_id,c.body,c.created_at,u.id AS user_id,u.name AS user_name
       FROM comments c JOIN users u ON u.id=c.user_id WHERE c.id=?`, [result.insertId]);
    res.status(201).json({ comment: rows[0] });
  } catch (err) { next(err); }
});
export default router;
