import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { convertQuerySchema } from "./schema";
import { getExchangeRate } from "./rates";
import { logger } from "./logger";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/convert", limiter);

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", uptimeSeconds: process.uptime() });
  });

  app.get("/convert", async (req: Request, res: Response) => {
    const parsed = convertQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const { from, to, amount } = parsed.data;

    try {
      const result = await getExchangeRate(from, to);
      return res.status(200).json({
        from,
        to,
        amount,
        rate: result.rate,
        converted: Number((amount * result.rate).toFixed(4)),
        source: result.source,
        stale: result.stale,
        fetchedAt: result.fetchedAt,
      });
    } catch (err) {
      logger.error?.((err as Error).message) ?? logger.log((err as Error).message);
      return res.status(503).json({
        error: "Service de taux de change temporairement indisponible. Réessayez plus tard.",
      });
    }
  });

  return app;
}