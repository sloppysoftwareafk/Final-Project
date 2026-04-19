import express from "express";
import testManagementRoutes from "./tests/testManagement.routes.js";
import testQuestionsRoutes from "./tests/testQuestions.routes.js";
import testAttemptsRoutes from "./tests/testAttempts.routes.js";

const router = express.Router();

router.use(testManagementRoutes);
router.use(testQuestionsRoutes);
router.use(testAttemptsRoutes);

export default router;
