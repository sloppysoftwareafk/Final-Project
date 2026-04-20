import express from "express";
import { pool } from "../db.js";
import { auth, allowRoles } from "../middleware/auth.js";

const router = express.Router();

router.get("/results/me", auth, allowRoles("Customer"), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        r.id,
        t.title,
        r.score,
        r.correct_answers,
        (r.total_questions - r.correct_answers) AS wrong_answers,
        r.percentage,
        r.rank,
        r.generated_at
      FROM results r
      JOIN tests t ON t.id = r.test_id
      WHERE r.user_id = $1
      ORDER BY r.generated_at DESC`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
