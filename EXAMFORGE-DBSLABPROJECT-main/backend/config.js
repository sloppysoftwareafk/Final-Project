import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "replace_this_secret",
  db: {
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "test_mgmt_system",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
  },
};
