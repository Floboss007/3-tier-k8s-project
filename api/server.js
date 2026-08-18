// Backend API: Node.js + Express + PostgreSQL (pg)
// Runs on the "api" VM and talks to the "db" VM at $DB_HOST:$DB_PORT.

const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// Connection pool to the database VM.
// All values come from environment variables set by the systemd unit.
const pool = new Pool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'appdb',
  user:     process.env.DB_USER     || 'appuser',
  password: process.env.DB_PASSWORD || 'apppass123',
});

// Simple liveness probe -- great for testing connectivity from other VMs
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', host: require('os').hostname() });
});

// Verifies the API can reach the DB
app.get('/db-check', async (_req, res) => {
  try {
    const r = await pool.query('SELECT NOW() AS now, current_database() AS db');
    res.json({ status: 'ok', db: r.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// CRUD on tasks
app.get('/tasks', async (_req, res) => {
  try {
    const r = await pool.query('SELECT id, title, completed, created_at FROM tasks ORDER BY id');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/tasks', async (req, res) => {
  const { title } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  try {
    const r = await pool.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, completed, created_at',
      [title.trim()]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = Number(process.env.PORT) || 3000;
// IMPORTANT: bind to 0.0.0.0, not 127.0.0.1 -- otherwise other VMs cannot reach us
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on 0.0.0.0:${PORT}`);
});
