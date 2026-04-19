import express from "express";
import { pool } from "../../db.js";
import { auth, allowRoles } from "../../middleware/auth.js";

const router = express.Router();

router.post("/tests/:id/start", auth, allowRoles("Customer"), async (req, res) => {
  const { id } = req.params;
  try {
    const testQuery = await pool.query(
      `SELECT id, title, duration_minutes
       FROM tests
       WHERE id = $1
         AND (
           status = 'Live'
           OR (status = 'Scheduled' AND scheduled_at <= NOW())
         )`,
      [id]
    );
    if (testQuery.rows.length === 0) {
      return res.status(404).json({ message: "Test not found or unavailable" });
    }

    const alreadySubmitted = await pool.query(
      `SELECT id
       FROM attempts
       WHERE test_id = $1 AND user_id = $2 AND status IN ('Submitted', 'AutoSubmitted')
       LIMIT 1`,
      [id, req.user.id]
    );
    if (alreadySubmitted.rows.length > 0) {
      return res.status(409).json({ message: "You have already attempted this test" });
    }

    const existingAttempt = await pool.query(
      `SELECT id, started_at
       FROM attempts
       WHERE test_id = $1 AND user_id = $2 AND status = 'InProgress'
       ORDER BY started_at DESC
       LIMIT 1`,
      [id, req.user.id]
    );

    if (existingAttempt.rows.length > 0) {
      const test = testQuery.rows[0];
      const startedAt = new Date(existingAttempt.rows[0].started_at);
      const endsAt = new Date(startedAt.getTime() + Number(test.duration_minutes) * 60000);
      if (Date.now() > endsAt.getTime()) {
        await pool.query(
          `UPDATE attempts
           SET submitted_at = NOW(), status = 'AutoSubmitted', time_spent_seconds = $1
           WHERE id = $2`,
          [Number(test.duration_minutes) * 60, existingAttempt.rows[0].id]
        );
      } else {
        return res.status(200).json({
          attemptId: existingAttempt.rows[0].id,
          startedAt,
          endsAt,
          durationMinutes: test.duration_minutes,
          title: test.title,
          resumed: true,
        });
      }
    }

    const topicCountQuery = await pool.query(
      `SELECT COUNT(*)::INT AS total
       FROM test_questions tq
       JOIN tests t ON t.id = tq.test_id
       JOIN questions q ON q.id = tq.question_id
       WHERE tq.test_id = $1 AND q.topic = t.topic`,
      [id]
    );
    if (Number(topicCountQuery.rows[0].total || 0) === 0) {
      return res.status(400).json({ message: "This test has no valid subject-matched questions configured" });
    }

    const created = await pool.query(
      `INSERT INTO attempts (test_id, user_id, status)
       VALUES ($1, $2, 'InProgress')
       RETURNING id, started_at`,
      [id, req.user.id]
    );

    const test = testQuery.rows[0];
    const startedAt = new Date(created.rows[0].started_at);
    const endsAt = new Date(startedAt.getTime() + Number(test.duration_minutes) * 60000);

    return res.status(201).json({
      attemptId: created.rows[0].id,
      startedAt,
      endsAt,
      durationMinutes: test.duration_minutes,
      title: test.title,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/tests/:id/questions", auth, allowRoles("Customer"), async (req, res) => {
  const { id } = req.params;
  try {
    const activeAttempt = await pool.query(
      `SELECT id
       FROM attempts
       WHERE test_id = $1 AND user_id = $2 AND status = 'InProgress'
       ORDER BY started_at DESC
       LIMIT 1`,
      [id, req.user.id]
    );
    if (activeAttempt.rows.length === 0) {
      return res.status(403).json({ message: "Start or resume the test attempt first" });
    }

    const { rows } = await pool.query(
      `SELECT
        q.id,
        q.topic,
        q.difficulty,
        q.question_text AS text,
        json_agg(json_build_object('id', o.id, 'text', o.option_text) ORDER BY o.id) AS options
      FROM test_questions tq
      JOIN tests t ON t.id = tq.test_id
      JOIN questions q ON q.id = tq.question_id
      JOIN options o ON o.question_id = q.id
      WHERE tq.test_id = $1 AND q.topic = t.topic
      GROUP BY q.id, tq.question_order
      ORDER BY tq.question_order ASC`,
      [id]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/tests/:id/submit", auth, allowRoles("Customer"), async (req, res) => {
  const { id } = req.params;
  const { attemptId, answers = [], timeSpentSeconds = 0 } = req.body;
  if (!attemptId || !Array.isArray(answers)) {
    return res.status(400).json({ message: "attemptId and answers are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const attemptQuery = await client.query(
      "SELECT id, status FROM attempts WHERE id = $1 AND test_id = $2 AND user_id = $3",
      [attemptId, id, req.user.id]
    );
    if (attemptQuery.rows.length === 0) {
      throw new Error("Attempt not found");
    }
    if (attemptQuery.rows[0].status !== "InProgress") {
      throw new Error("Attempt is already submitted");
    }

    const validQuestionSet = await client.query(
      `SELECT COUNT(*)::INT AS total
       FROM test_questions
       WHERE test_id = $1`,
      [id]
    );
    if (Number(validQuestionSet.rows[0].total || 0) === 0) {
      throw new Error("No questions are configured for this test");
    }

    await client.query("DELETE FROM attempt_answers WHERE attempt_id = $1", [attemptId]);

    for (const answer of answers) {
      const correctness = await client.query(
        `SELECT o.is_correct
         FROM options o
         JOIN test_questions tq ON tq.question_id = o.question_id
         WHERE o.id = $1 AND tq.test_id = $2 AND tq.question_id = $3`,
        [answer.optionId, id, answer.questionId]
      );
      if (correctness.rows.length === 0) {
        throw new Error("Invalid answer payload");
      }
      const isCorrect = correctness.rows[0]?.is_correct || false;
      await client.query(
        `INSERT INTO attempt_answers (attempt_id, question_id, selected_option_id, is_correct)
         VALUES ($1, $2, $3, $4)`,
        [attemptId, answer.questionId, answer.optionId, isCorrect]
      );
    }

    const scoreQuery = await client.query(
      `SELECT
        COUNT(*) FILTER (WHERE aa.is_correct) AS correct,
        COUNT(*) AS attempted
      FROM attempt_answers aa
      WHERE aa.attempt_id = $1`,
      [attemptId]
    );

    const testCountQuery = await client.query(
      "SELECT COUNT(*)::INT AS total FROM test_questions WHERE test_id = $1",
      [id]
    );

    const correct = Number(scoreQuery.rows[0].correct || 0);
    const total = Number(testCountQuery.rows[0].total || 0);
    const percentage = total > 0 ? Number(((correct / total) * 100).toFixed(2)) : 0;

    await client.query(
      `UPDATE attempts
       SET submitted_at = NOW(), status = 'Submitted', score = $1, percentage = $2, time_spent_seconds = $3
       WHERE id = $4`,
      [correct, percentage, timeSpentSeconds, attemptId]
    );

    await client.query(
      `INSERT INTO results (attempt_id, user_id, test_id, total_questions, correct_answers, score, percentage)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (attempt_id)
       DO UPDATE SET
         total_questions = EXCLUDED.total_questions,
         correct_answers = EXCLUDED.correct_answers,
         score = EXCLUDED.score,
         percentage = EXCLUDED.percentage,
         generated_at = NOW()`,
      [attemptId, req.user.id, id, total, correct, correct, percentage]
    );

    await client.query(
      `WITH ranked AS (
          SELECT id, RANK() OVER (PARTITION BY test_id ORDER BY percentage DESC, score DESC) AS rk
          FROM results
          WHERE test_id = $1
        )
        UPDATE results r
        SET rank = ranked.rk
        FROM ranked
        WHERE r.id = ranked.id`,
      [id]
    );

    await client.query("COMMIT");
    return res.json({ total, correct, percentage });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

export default router;
