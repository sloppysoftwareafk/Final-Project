import app from "./backend/app.js";
import { config } from "./backend/config.js";

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});