import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { isProjectMember } from '../utils/access.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.name, p.description, p.owner_id, p.created_at,
       (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id) AS task_count
       FROM projects p JOIN project_members pm ON pm.project_id=p.id
       WHERE pm.user_id=? ORDER BY p.created_at DESC`, [req.user.id]);
    res.json({ projects: rows });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    if (!name) return res.status(400).json({ message: 'Project name is required.' });
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.execute('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)',
        [name, description, req.user.id]);
      await conn.execute('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
        [result.insertId, req.user.id, 'owner']);
      await conn.commit();
      res.status(201).json({ project: { id: result.insertId, name, description, owner_id: req.user.id } });
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!(await isProjectMember(req.params.id, req.user.id))) return res.status(403).json({ message: 'You are not a member of this project.' });
    const [projects] = await pool.execute('SELECT * FROM projects WHERE id=?', [req.params.id]);
    const [members] = await pool.execute(
      `SELECT u.id, u.name, u.email, pm.role FROM users u
       JOIN project_members pm ON pm.user_id=u.id WHERE pm.project_id=? ORDER BY pm.role DESC, u.name`,
      [req.params.id]);
    const [tasks] = await pool.execute(
      `SELECT t.*, u.name AS assignee_name, creator.name AS creator_name
       FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id
       JOIN users creator ON creator.id=t.created_by
       WHERE t.project_id=? ORDER BY t.updated_at DESC`, [req.params.id]);
    res.json({ project: projects[0], members, tasks });
  } catch (err) { next(err); }
});

router.post('/:id/members', async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (!(await isProjectMember(projectId, req.user.id))) return res.status(403).json({ message: 'Project access denied.' });
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Member email is required.' });
    const [users] = await pool.execute('SELECT id, name, email FROM users WHERE email=?', [email]);
    if (!users[0]) return res.status(404).json({ message: 'No registered user found with that email.' });
    await pool.execute('INSERT IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [projectId, users[0].id, 'member']);
    res.status(201).json({ member: users[0] });
  } catch (err) { next(err); }
});

router.get('/:id/tasks', async (req, res, next) => {
  try {
    if (!(await isProjectMember(req.params.id, req.user.id))) return res.status(403).json({ message: 'Project access denied.' });
    const [tasks] = await pool.execute(
      `SELECT t.*, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id
       WHERE t.project_id=? ORDER BY t.updated_at DESC`, [req.params.id]);
    res.json({ tasks });
  } catch (err) { next(err); }
});

router.post('/:id/tasks', async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (!(await isProjectMember(projectId, req.user.id))) return res.status(403).json({ message: 'Project access denied.' });
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const status = ['todo','in_progress','done'].includes(req.body.status) ? req.body.status : 'todo';
    const priority = ['low','medium','high'].includes(req.body.priority) ? req.body.priority : 'medium';
    const assigneeId = req.body.assignee_id ? Number(req.body.assignee_id) : null;
    const dueDate = req.body.due_date || null;
    if (!title) return res.status(400).json({ message: 'Task title is required.' });
    if (assigneeId && !(await isProjectMember(projectId, assigneeId))) return res.status(400).json({ message: 'Assignee must be a project member.' });
    const [result] = await pool.execute(
      `INSERT INTO tasks (project_id,title,description,status,priority,assignee_id,created_by,due_date)
       VALUES (?,?,?,?,?,?,?,?)`,
      [projectId,title,description,status,priority,assigneeId,req.user.id,dueDate]);
    res.status(201).json({ task: { id: result.insertId, project_id: projectId, title, description, status, priority, assignee_id: assigneeId, due_date: dueDate } });
  } catch (err) { next(err); }
});
export default router;
