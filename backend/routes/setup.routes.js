import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, service: "insurance-policy-api" });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.post("/setup/init-db", async (_req, res) => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, "../../schema.sql"), "utf8");
    await pool.query(sql);
    res.json({ message: "Database initialized successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/setup/reset-db", async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("COMMIT");

    const sql = fs.readFileSync(path.join(__dirname, "../../schema.sql"), "utf8");
    await pool.query(sql);
    res.json({ message: "Database reset and seeded successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

export default router;
