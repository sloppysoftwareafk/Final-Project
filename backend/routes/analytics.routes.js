import express from "express";
import { pool } from "../db.js";
import { auth, allowRoles } from "../middleware/auth.js";

const router = express.Router();

router.get("/analytics/summary", auth, async (req, res) => {
  try {
    const totalQuestionsQuery = await pool.query(
      `SELECT COUNT(*)::INT AS total_questions
       FROM questions
       WHERE status = 'Approved'`
    );

    const avgScoreQuery = await pool.query(
      `SELECT COALESCE(ROUND(AVG(percentage), 2), 0) AS avg_score
       FROM results`
    );

    let activeTests = 0;
    if (req.user.role === "Student") {
      const activeTestsQuery = await pool.query(
        `SELECT COUNT(*)::INT AS active_tests
         FROM tests t
         LEFT JOIN attempts my_done
           ON my_done.test_id = t.id
          AND my_done.user_id = $1
          AND my_done.status IN ('Submitted', 'AutoSubmitted')
         WHERE my_done.id IS NULL
           AND t.status IN ('Live', 'Scheduled')
           AND (t.status = 'Live' OR (t.status = 'Scheduled' AND t.scheduled_at <= NOW()))`,
        [req.user.id]
      );
      activeTests = Number(activeTestsQuery.rows[0]?.active_tests || 0);
    } else {
      const activeTestsQuery = await pool.query(
        `SELECT COUNT(*)::INT AS active_tests
         FROM tests
         WHERE status IN ('Live', 'Scheduled')`
      );
      activeTests = Number(activeTestsQuery.rows[0]?.active_tests || 0);
    }

    const studentsQuery = await pool.query(
      `SELECT COUNT(*)::INT AS students_enrolled
       FROM users
       WHERE role = 'Student'`
    );

    return res.json({
      summary: {
        total_questions: Number(totalQuestionsQuery.rows[0]?.total_questions || 0),
        active_tests: activeTests,
        students_enrolled: Number(studentsQuery.rows[0]?.students_enrolled || 0),
        avg_score: Number(avgScoreQuery.rows[0]?.avg_score || 0),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/analytics/overview", auth, allowRoles("Instructor"), async (_req, res) => {
  try {
    const summaryQuery = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM questions) AS total_questions,
        (SELECT COUNT(*) FROM tests WHERE status IN ('Live','Scheduled')) AS active_tests,
        (SELECT COUNT(*) FROM users WHERE role = 'Student') AS students_enrolled,
        (SELECT COALESCE(ROUND(AVG(percentage),2), 0) FROM results) AS avg_score`
    );

    const topicQuery = await pool.query(
      `WITH topics AS (
        SELECT topic
        FROM (VALUES
          ('Data Structures'),
          ('Algorithms'),
          ('Databases'),
          ('Networking'),
          ('OS')
        ) AS fixed_topics(topic)
      )
      SELECT
        topics.topic,
        COALESCE(ROUND(AVG(r.percentage), 2), 0) AS avg,
        COUNT(DISTINCT r.attempt_id)::INT AS attempts
      FROM topics
      LEFT JOIN tests t ON t.topic = topics.topic
      LEFT JOIN results r ON r.test_id = t.id
      GROUP BY topics.topic
      ORDER BY topics.topic ASC`
    );

    const examQuery = await pool.query(
      `SELECT
        t.id,
        t.title,
        t.topic,
        COALESCE(COUNT(DISTINCT r.id), 0)::INT AS attempts,
        COALESCE(ROUND(AVG(r.percentage), 2), 0) AS avg_score,
        COALESCE(MAX(r.percentage), 0) AS best_score,
        COALESCE(MIN(r.percentage), 0) AS lowest_score
      FROM tests t
      LEFT JOIN results r ON r.test_id = t.id
      WHERE t.status = 'Completed'
      GROUP BY t.id, t.title, t.topic
      ORDER BY t.created_at DESC`
    );

    const scoreBucketsQuery = await pool.query(
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
      GROUP BY 1
      ORDER BY 1`
    );

    const subjectLeaderboardQuery = await pool.query(
      `WITH subject_scores AS (
        SELECT
          t.topic,
          r.user_id,
          u.full_name,
          COUNT(*)::INT AS tests_taken,
          ROUND(AVG(r.percentage), 2) AS avg_percentage,
          MAX(r.percentage) AS best_percentage
        FROM results r
        JOIN tests t ON t.id = r.test_id
        JOIN users u ON u.id = r.user_id
        GROUP BY t.topic, r.user_id, u.full_name
      ), ranked AS (
        SELECT
          topic,
          user_id,
          full_name,
          tests_taken,
          avg_percentage,
          best_percentage,
          RANK() OVER (PARTITION BY topic ORDER BY avg_percentage DESC, best_percentage DESC, full_name ASC) AS rank
        FROM subject_scores
      )
      SELECT
        topic,
        user_id AS "userId",
        full_name AS name,
        tests_taken AS tests,
        avg_percentage AS score,
        rank
      FROM ranked
      WHERE rank <= 5
      ORDER BY topic ASC, rank ASC`
    );

    const subjectLeaderboards = subjectLeaderboardQuery.rows.reduce((acc, row) => {
      const existing = acc.find((item) => item.topic === row.topic);
      const entry = {
        userId: row.userId,
        name: row.name,
        tests: row.tests,
        score: row.score,
        rank: row.rank,
      };
      if (existing) {
        existing.rows.push(entry);
      } else {
        acc.push({ topic: row.topic, rows: [entry] });
      }
      return acc;
    }, []);

    return res.json({
      summary: summaryQuery.rows[0],
      topicData: topicQuery.rows,
      scoreDistribution: scoreBucketsQuery.rows,
      examData: examQuery.rows,
      subjectLeaderboards,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/analytics/leaderboard", auth, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        user_id AS "userId",
        leaderboard_rank AS rank,
        full_name AS name,
        avg_percentage AS score,
        tests_taken AS tests
      FROM leaderboard_view
      ORDER BY leaderboard_rank ASC
      LIMIT 10`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
