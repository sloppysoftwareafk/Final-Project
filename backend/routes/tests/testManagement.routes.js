import express from "express";
import { pool } from "../../db.js";
import { auth, allowRoles } from "../../middleware/auth.js";

const router = express.Router();

router.get("/tests", auth, async (req, res) => {
  try {
    const baseSelect = `SELECT
      t.id,
      t.title,
      t.topic,
      COALESCE(COUNT(DISTINCT tq.question_id), 0)::INT AS questions,
      t.duration_minutes AS duration,
      t.status,
      TO_CHAR(t.scheduled_at, 'Mon DD, YYYY') AS date,
      COUNT(DISTINCT a.id)::INT AS attempts
    FROM tests t
    LEFT JOIN test_questions tq ON tq.test_id = t.id
    LEFT JOIN attempts a ON a.test_id = t.id`;

    let query = `${baseSelect}
      GROUP BY t.id
      ORDER BY t.created_at DESC`;
    let params = [];

    if (req.user.role === "Student") {
      query = `${baseSelect}
        LEFT JOIN attempts my_done ON my_done.test_id = t.id AND my_done.user_id = $1 AND my_done.status IN ('Submitted', 'AutoSubmitted')
        WHERE my_done.id IS NULL
          AND t.status IN ('Live', 'Scheduled')
          AND (t.status = 'Live' OR (t.status = 'Scheduled' AND t.scheduled_at <= NOW()))
        GROUP BY t.id
        ORDER BY t.created_at DESC`;
      params = [req.user.id];
    }

    const { rows } = await pool.query(query, params);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/tests", auth, allowRoles("Instructor"), async (req, res) => {
  const { title, topic, durationMinutes, status = "Scheduled", scheduledAt } = req.body;
  if (!title || !topic || !durationMinutes) {
    return res.status(400).json({ message: "title, topic, durationMinutes are required" });
  }

  const effectiveScheduledAt = status === "Scheduled"
    ? (scheduledAt || new Date(Date.now() + 60 * 60 * 1000).toISOString())
    : (scheduledAt || null);

  try {
    const { rows } = await pool.query(
      `INSERT INTO tests (title, topic, total_questions, duration_minutes, status, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, topic, total_questions AS questions, duration_minutes AS duration, status`,
      [title, topic, 0, durationMinutes, status, effectiveScheduledAt, req.user.id]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/tests/:id", auth, allowRoles("Instructor"), async (req, res) => {
  const { id } = req.params;
  const { title, topic, durationMinutes, status, scheduledAt } = req.body;
  if (!title || !topic || !durationMinutes || !status) {
    return res.status(400).json({ message: "title, topic, durationMinutes, status are required" });
  }

  if (!["Scheduled", "Live", "Completed"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const existing = await pool.query("SELECT status, scheduled_at FROM tests WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Test not found" });
    }

    let nextScheduledAt = existing.rows[0].scheduled_at;
    if (scheduledAt !== undefined) {
      nextScheduledAt = scheduledAt;
    } else if (status === "Scheduled" && existing.rows[0].status !== "Scheduled") {
      nextScheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }

    const { rows } = await pool.query(
      `UPDATE tests
       SET title = $1,
           topic = $2,
           duration_minutes = $3,
           status = $4,
           scheduled_at = $5
         WHERE id = $6
       RETURNING id, title, topic, total_questions AS questions, duration_minutes AS duration, status`,
      [title, topic, durationMinutes, status, nextScheduledAt, id]
    );

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/tests/:id/close", auth, allowRoles("Instructor"), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query("SELECT id FROM tests WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Test not found" });
    }

    await pool.query("CALL sp_close_test($1)", [id]);

    const { rows } = await pool.query(
      `SELECT id, title, topic, total_questions AS questions, duration_minutes AS duration, status
       FROM tests
       WHERE id = $1`,
      [id]
    );

    return res.json({ message: "Test closed by instructor", test: rows[0] });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/tests/:id", auth, allowRoles("Instructor"), async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query("DELETE FROM tests WHERE id = $1", [id]);
    if (rowCount === 0) {
      return res.status(404).json({ message: "Test not found" });
    }
    return res.json({ message: "Test removed successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/tests/:id/analytics", auth, allowRoles("Instructor"), async (req, res) => {
  const { id } = req.params;
  try {
    const summaryQuery = await pool.query(
      `SELECT
        t.id,
        t.title,
        t.topic,
        t.status,
        t.total_questions,
        t.duration_minutes,
        COALESCE(COUNT(DISTINCT r.id), 0)::INT AS attempts,
        COALESCE(ROUND(AVG(r.percentage), 2), 0) AS avg_score,
        COALESCE(MAX(r.percentage), 0) AS best_score,
        COALESCE(MIN(r.percentage), 0) AS lowest_score
      FROM tests t
      LEFT JOIN results r ON r.test_id = t.id
      WHERE t.id = $1
      GROUP BY t.id, t.title, t.topic, t.status, t.total_questions, t.duration_minutes`,
      [id]
    );

    if (summaryQuery.rows.length === 0) {
      return res.status(404).json({ message: "Test not found" });
    }

    if (summaryQuery.rows[0].status !== "Completed") {
      return res.status(400).json({ message: "Analytics are available only for completed tests" });
    }

    const topPerformersQuery = await pool.query(
      `SELECT
        u.full_name AS name,
        r.percentage,
        r.rank
      FROM results r
      JOIN users u ON u.id = r.user_id
      WHERE r.test_id = $1
      ORDER BY r.percentage DESC, r.score DESC, r.generated_at ASC
      LIMIT 5`,
      [id]
    );

    const distributionQuery = await pool.query(
      `SELECT
        CASE
          WHEN percentage BETWEEN 0 AND 20 THEN '0–20'
          WHEN percentage BETWEEN 21 AND 40 THEN '21–40'
          WHEN percentage BETWEEN 41 AND 60 THEN '41–60'
          WHEN percentage BETWEEN 61 AND 80 THEN '61–80'
          ELSE '81–100'
        END AS range,
        COUNT(*)::INT AS count
      FROM results
      WHERE test_id = $1
      GROUP BY 1
      ORDER BY 1`,
      [id]
    );

    return res.json({
      summary: summaryQuery.rows[0],
      topPerformers: topPerformersQuery.rows,
      scoreDistribution: distributionQuery.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
