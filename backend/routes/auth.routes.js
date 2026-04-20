import express from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { auth, signToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, full_name, email, role, password_hash FROM users WHERE email = $1",
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/auth/register", async (req, res) => {
  const { fullName, email, password, role = "Customer" } = req.body;
  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "fullName, email, password are required" });
  }
  if (!["Customer", "Agent", "Admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role`,
      [fullName, email, passwordHash, role]
    );
    const user = rows[0];
    const token = signToken(user);
    return res.status(201).json({
      token,
      user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role },
    });
  } catch (error) {
    if (String(error.message).includes("duplicate")) {
      return res.status(409).json({ message: "Email already exists" });
    }
    return res.status(500).json({ message: error.message });
  }
});

router.get("/auth/me", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, full_name, email, role FROM users WHERE id = $1",
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = rows[0];
    return res.json({ id: user.id, fullName: user.full_name, email: user.email, role: user.role });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
