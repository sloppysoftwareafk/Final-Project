import express from "express";
import { pool } from "../db.js";
import { auth, allowRoles } from "../middleware/auth.js";

const router = express.Router();

router.get("/questions", auth, async (req, res) => {
  const { search = "", topic, difficulty, status } = req.query;
  const values = [];
  const where = [];

  if (search) {
    values.push(`%${search}%`);
    where.push(`q.question_text ILIKE $${values.length}`);
  }
  if (topic && topic !== "All") {
    values.push(topic);
    where.push(`q.topic = $${values.length}`);
  }
  if (difficulty && difficulty !== "All") {
    values.push(difficulty);
    where.push(`q.difficulty = $${values.length}`);
  }
  if (status && status !== "All") {
    values.push(status);
    where.push(`q.status = $${values.length}`);
  } else if (req.user.role === "Student") {
    where.push(`q.status = 'Approved'`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const { rows } = await pool.query(
      `SELECT
        q.id,
        q.topic,
        q.difficulty,
        q.question_text AS text,
        q.status,
        COUNT(o.id) AS option_count,
        MAX(CASE WHEN o.is_correct THEN o.id END) AS answer_option_id
      FROM questions q
      LEFT JOIN options o ON o.question_id = q.id
      ${whereSql}
      GROUP BY q.id
      ORDER BY q.created_at DESC`,
      values
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/questions", auth, allowRoles("Contributor", "Instructor"), async (req, res) => {
  const { topic, difficulty, text, options, correctIndex } = req.body;
  if (!topic || !difficulty || !text || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ message: "Invalid payload" });
  }
  if (correctIndex === undefined || correctIndex < 0 || correctIndex >= options.length) {
    return res.status(400).json({ message: "Invalid correct option index" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const status = req.user.role === "Instructor" ? "Approved" : "Pending";
    const approvedBy = req.user.role === "Instructor" ? req.user.id : null;

    const questionInsert = await client.query(
      `INSERT INTO questions (created_by, approved_by, topic, difficulty, question_text, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, topic, difficulty, question_text AS text, status`,
      [req.user.id, approvedBy, topic, difficulty, text, status]
    );
    const question = questionInsert.rows[0];

    for (let i = 0; i < options.length; i += 1) {
      await client.query(
        "INSERT INTO options (question_id, option_text, is_correct) VALUES ($1, $2, $3)",
        [question.id, options[i], i === Number(correctIndex)]
      );
    }

    await client.query("COMMIT");
    return res.status(201).json(question);
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

router.patch("/questions/:id/status", auth, allowRoles("Instructor"), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["Approved", "Rejected", "Pending"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE questions
       SET status = $1, approved_by = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, topic, difficulty, question_text AS text, status`,
      [status, status === "Approved" ? req.user.id : null, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Question not found" });
    }
    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
