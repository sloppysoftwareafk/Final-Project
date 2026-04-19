import express from "express";
import cors from "cors";
import setupRoutes from "./routes/setup.routes.js";
import authRoutes from "./routes/auth.routes.js";
import questionsRoutes from "./routes/questions.routes.js";
import testsRoutes from "./routes/tests.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import resultsRoutes from "./routes/results.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", setupRoutes);
app.use("/api", authRoutes);
app.use("/api", questionsRoutes);
app.use("/api", testsRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", resultsRoutes);

app.use((error, _req, res, _next) => {
    res.status(500).json({ message: error.message });
});

app.get("/api/test", (req, res) => {
  res.send("API working");
});

export default app;
