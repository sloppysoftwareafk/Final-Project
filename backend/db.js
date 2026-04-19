import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool(config.db);
