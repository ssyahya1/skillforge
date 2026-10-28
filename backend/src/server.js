
import "dotenv/config";
import app from "./app.js";
import { startCoursePurgeJob } from "./jobs/coursePurgeJob.js";

const port = Number(process.env.PORT) || 5000;

app.listen(port, () => {
  console.log(`SkillForge API running on port ${port}`);

  startCoursePurgeJob();
});
