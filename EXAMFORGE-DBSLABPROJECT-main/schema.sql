CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Student', 'Contributor', 'Instructor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id BIGSERIAL PRIMARY KEY,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  topic VARCHAR(80) NOT NULL,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  question_text TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS options (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS tests (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  topic VARCHAR(80),
  total_questions INT NOT NULL CHECK (total_questions >= 0),
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Live', 'Completed')),
  scheduled_at TIMESTAMPTZ,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_questions (
  test_id BIGINT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  question_order INT NOT NULL,
  marks NUMERIC(6,2) NOT NULL DEFAULT 1,
  PRIMARY KEY (test_id, question_id),
  UNIQUE (test_id, question_order)
);

CREATE TABLE IF NOT EXISTS attempts (
  id BIGSERIAL PRIMARY KEY,
  test_id BIGINT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'InProgress' CHECK (status IN ('InProgress', 'Submitted', 'AutoSubmitted')),
  score NUMERIC(8,2) DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  time_spent_seconds INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attempt_answers (
  id BIGSERIAL PRIMARY KEY,
  attempt_id BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  selected_option_id BIGINT REFERENCES options(id) ON DELETE SET NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS results (
  id BIGSERIAL PRIMARY KEY,
  attempt_id BIGINT NOT NULL UNIQUE REFERENCES attempts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_id BIGINT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL,
  score NUMERIC(8,2) NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  rank INT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_questions_set_updated_at ON questions;
CREATE TRIGGER trg_questions_set_updated_at
BEFORE UPDATE ON questions
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE FUNCTION fn_sync_test_total_questions()
RETURNS TRIGGER AS $$
DECLARE
  target_test_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_test_id := OLD.test_id;
  ELSE
    target_test_id := NEW.test_id;
  END IF;

  UPDATE tests
  SET total_questions = (
    SELECT COUNT(*)::INT
    FROM test_questions
    WHERE test_id = target_test_id
  )
  WHERE id = target_test_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_test_total_questions ON test_questions;
CREATE TRIGGER trg_sync_test_total_questions
AFTER INSERT OR UPDATE OR DELETE ON test_questions
FOR EACH ROW
EXECUTE FUNCTION fn_sync_test_total_questions();

CREATE OR REPLACE PROCEDURE sp_refresh_test_question_count(IN p_test_id BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tests
  SET total_questions = (
    SELECT COUNT(*)::INT
    FROM test_questions
    WHERE test_id = p_test_id
  )
  WHERE id = p_test_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_close_test(IN p_test_id BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tests
  SET status = 'Completed'
  WHERE id = p_test_id;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_options_question_id ON options(question_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_topic ON tests(topic);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_results_test_id ON results(test_id);
CREATE INDEX IF NOT EXISTS idx_results_percentage ON results(percentage DESC);

CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
  r.user_id,
  u.full_name,
  COUNT(*) AS tests_taken,
  ROUND(AVG(r.percentage), 2) AS avg_percentage,
  MAX(r.percentage) AS best_percentage,
  RANK() OVER (ORDER BY ROUND(AVG(r.percentage), 2) DESC, MAX(r.percentage) DESC) AS leaderboard_rank
FROM results r
JOIN users u ON u.id = r.user_id
GROUP BY r.user_id, u.full_name;

INSERT INTO users (full_name, email, password_hash, role)
VALUES
  ('Instructor Admin', 'instructor@test.com', '$2b$10$kGGO9s3xHEN5pFqxfwsp.u0mwzManskSI1jwoQgz3mGZ8DWwRZB3y', 'Instructor'),
  ('TA Contributor', 'contributor@test.com', '$2b$10$kGGO9s3xHEN5pFqxfwsp.u0mwzManskSI1jwoQgz3mGZ8DWwRZB3y', 'Contributor'),
  ('Student User', 'student@test.com', '$2b$10$kGGO9s3xHEN5pFqxfwsp.u0mwzManskSI1jwoQgz3mGZ8DWwRZB3y', 'Student'),
  ('Student Two', 'student2@test.com', '$2b$10$kGGO9s3xHEN5pFqxfwsp.u0mwzManskSI1jwoQgz3mGZ8DWwRZB3y', 'Student')
ON CONFLICT (email) DO NOTHING;

WITH q AS (
  INSERT INTO questions (created_by, approved_by, topic, difficulty, question_text, status)
  VALUES
    ((SELECT id FROM users WHERE email = 'instructor@test.com'), (SELECT id FROM users WHERE email = 'instructor@test.com'), 'Data Structures', 'Medium', 'Which data structure uses LIFO order?', 'Approved'),
    ((SELECT id FROM users WHERE email = 'instructor@test.com'), (SELECT id FROM users WHERE email = 'instructor@test.com'), 'Algorithms', 'Hard', 'What is the average complexity of QuickSort?', 'Approved'),
    ((SELECT id FROM users WHERE email = 'contributor@test.com'), NULL, 'Databases', 'Easy', 'Which SQL clause filters grouped rows?', 'Pending'),
    ((SELECT id FROM users WHERE email = 'instructor@test.com'), (SELECT id FROM users WHERE email = 'instructor@test.com'), 'Networking', 'Easy', 'HTTP stands for?', 'Approved'),
    ((SELECT id FROM users WHERE email = 'instructor@test.com'), (SELECT id FROM users WHERE email = 'instructor@test.com'), 'OS', 'Hard', 'Which algorithm can cause starvation?', 'Approved')
  RETURNING id, question_text
)
INSERT INTO options (question_id, option_text, is_correct)
SELECT q.id, x.option_text, x.is_correct
FROM q
JOIN LATERAL (
  SELECT * FROM (
    VALUES
      ('Which data structure uses LIFO order?', 'Queue', FALSE),
      ('Which data structure uses LIFO order?', 'Stack', TRUE),
      ('Which data structure uses LIFO order?', 'Array', FALSE),
      ('Which data structure uses LIFO order?', 'Linked List', FALSE),
      ('What is the average complexity of QuickSort?', 'O(n²)', FALSE),
      ('What is the average complexity of QuickSort?', 'O(n log n)', TRUE),
      ('What is the average complexity of QuickSort?', 'O(n)', FALSE),
      ('What is the average complexity of QuickSort?', 'O(log n)', FALSE),
      ('Which SQL clause filters grouped rows?', 'WHERE', FALSE),
      ('Which SQL clause filters grouped rows?', 'ORDER BY', FALSE),
      ('Which SQL clause filters grouped rows?', 'HAVING', TRUE),
      ('Which SQL clause filters grouped rows?', 'GROUP BY', FALSE),
      ('HTTP stands for?', 'HyperText Transfer Protocol', TRUE),
      ('HTTP stands for?', 'High Transfer Text Protocol', FALSE),
      ('HTTP stands for?', 'Hyper Terminal Transfer Protocol', FALSE),
      ('HTTP stands for?', 'HyperText Transmission Protocol', FALSE),
      ('Which algorithm can cause starvation?', 'Round Robin', FALSE),
      ('Which algorithm can cause starvation?', 'FCFS', FALSE),
      ('Which algorithm can cause starvation?', 'Priority Scheduling', TRUE),
      ('Which algorithm can cause starvation?', 'SJF', FALSE)
  ) AS t(question_text, option_text, is_correct)
) AS x ON x.question_text = q.question_text;

INSERT INTO tests (title, topic, total_questions, duration_minutes, status, scheduled_at, created_by)
VALUES
  ('Data Structures Midterm', 'Data Structures', 5, 45, 'Scheduled', NOW() + INTERVAL '2 day', (SELECT id FROM users WHERE email = 'instructor@test.com')),
  ('Algorithms Final', 'Algorithms', 5, 60, 'Live', NOW(), (SELECT id FROM users WHERE email = 'instructor@test.com')),
  ('Database Management Quiz', 'Databases', 5, 30, 'Completed', NOW() - INTERVAL '5 day', (SELECT id FROM users WHERE email = 'instructor@test.com'))
ON CONFLICT DO NOTHING;

INSERT INTO test_questions (test_id, question_id, question_order)
VALUES
  (
    (SELECT id FROM tests WHERE title = 'Data Structures Midterm' LIMIT 1),
    (SELECT id FROM questions WHERE question_text = 'Which data structure uses LIFO order?' LIMIT 1),
    1
  ),
  (
    (SELECT id FROM tests WHERE title = 'Algorithms Final' LIMIT 1),
    (SELECT id FROM questions WHERE question_text = 'What is the average complexity of QuickSort?' LIMIT 1),
    1
  ),
  (
    (SELECT id FROM tests WHERE title = 'Database Management Quiz' LIMIT 1),
    (SELECT id FROM questions WHERE question_text = 'Which SQL clause filters grouped rows?' LIMIT 1),
    1
  )
ON CONFLICT DO NOTHING;

UPDATE tests t
SET total_questions = sub.cnt
FROM (
  SELECT test_id, COUNT(*)::INT AS cnt
  FROM test_questions
  GROUP BY test_id
) sub
WHERE t.id = sub.test_id;