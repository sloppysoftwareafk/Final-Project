import express from "express";
import { pool } from "../../db.js";
import { auth, allowRoles } from "../../middleware/auth.js";

const router = express.Router();

router.get("/tests/:id/question-pool", auth, allowRoles("Instructor"), async (req, res) => {
  const { id } = req.params;
  try {
    const testCheck = await pool.query("SELECT id, topic FROM tests WHERE id = $1", [id]);
    if (testCheck.rows.length === 0) {
      return res.status(404).json({ message: "Test not found" });
    }
    const testTopic = testCheck.rows[0].topic;

    const assignedQuery = await pool.query(
      `SELECT tq.question_id
       FROM test_questions tq
       WHERE tq.test_id = $1
       ORDER BY tq.question_order ASC`,
      [id]
    );

    const questionPoolQuery = await pool.query(
      `SELECT
        q.id,
        q.question_text AS text,
        q.topic,
        q.difficulty
      FROM questions q
      WHERE q.status = 'Approved' AND q.topic = $1
      ORDER BY q.created_at DESC`,
      [testTopic]
    );

    return res.json({
      assignedQuestionIds: assignedQuery.rows.map((row) => Number(row.question_id)),
      questions: questionPoolQuery.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/tests/:id/questions", auth, allowRoles("Instructor"), async (req, res) => {
  const { id } = req.params;
  const { questionIds } = req.body;

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ message: "questionIds must be a non-empty array" });
  }

  const normalizedIds = [...new Set(questionIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];
  if (normalizedIds.length === 0) {
    return res.status(400).json({ message: "No valid question IDs provided" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const testCheck = await client.query("SELECT id, topic FROM tests WHERE id = $1", [id]);
    if (testCheck.rows.length === 0) {
      throw new Error("Test not found");
    }
    const testTopic = testCheck.rows[0].topic;

    const validQuestions = await client.query(
      `SELECT id
       FROM questions
       WHERE status = 'Approved' AND topic = $2 AND id = ANY($1::bigint[])`,
      [normalizedIds, testTopic]
    );

    if (validQuestions.rows.length !== normalizedIds.length) {
      throw new Error("Some question IDs are invalid, not approved, or outside the selected subject");
    }

    await client.query("DELETE FROM test_questions WHERE test_id = $1", [id]);

    for (let index = 0; index < normalizedIds.length; index += 1) {
      await client.query(
        "INSERT INTO test_questions (test_id, question_id, question_order) VALUES ($1, $2, $3)",
        [id, normalizedIds[index], index + 1]
      );
    }

    await client.query("CALL sp_refresh_test_question_count($1)", [id]);
    await client.query("COMMIT");

    return res.json({
      message: "Test questions updated",
      totalQuestions: normalizedIds.length,
      questionIds: normalizedIds,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.message === "Test not found") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

router.post("/tests/:id/generate", auth, allowRoles("Instructor"), async (req, res) => {
  const { id } = req.params;
  const { numQuestions, difficultyDistribution } = req.body;

  if (!numQuestions || !difficultyDistribution) {
    return res.status(400).json({ message: "numQuestions and difficultyDistribution are required" });
  }

  const distributionTotal = Object.values(difficultyDistribution).reduce((acc, value) => acc + Number(value || 0), 0);
  if (distributionTotal !== Number(numQuestions)) {
    return res.status(400).json({ message: "Sum of difficultyDistribution must equal numQuestions" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const testRow = await client.query("SELECT topic FROM tests WHERE id = $1", [id]);
    if (testRow.rows.length === 0) {
      throw new Error("Test not found");
    }
    const testTopic = testRow.rows[0].topic;

    await client.query("DELETE FROM test_questions WHERE test_id = $1", [id]);

    const picked = [];
    for (const [difficulty, count] of Object.entries(difficultyDistribution)) {
      const quantity = Number(count || 0);
      if (quantity <= 0) {
        continue;
      }
      const selected = await client.query(
        `SELECT q.id
         FROM questions q
         WHERE q.status = 'Approved' AND q.topic = $1 AND q.difficulty = $2
         ORDER BY RANDOM()
         LIMIT $3`,
        [testTopic, difficulty, quantity]
      );

      if (selected.rows.length < quantity) {
        throw new Error(`Not enough approved ${difficulty} questions available`);
      }
      picked.push(...selected.rows.map((row) => row.id));
    }

    for (let index = 0; index < picked.length; index += 1) {
      await client.query(
        "INSERT INTO test_questions (test_id, question_id, question_order) VALUES ($1, $2, $3)",
        [id, picked[index], index + 1]
      );
    }

    await client.query("CALL sp_refresh_test_question_count($1)", [id]);
    await client.query("COMMIT");
    return res.json({ message: "Test questions generated", inserted: picked.length });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

export default router;
