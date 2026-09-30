import { createApp } from "./app";
import { logger } from "./logger";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = createApp();

app.listen(PORT, () => {
  logger.log(`Backend démarré sur le port ${PORT}`);
});