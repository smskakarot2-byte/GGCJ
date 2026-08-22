import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

// ── Security headers ──────────────────────────────────────────────────────────
// crossOriginEmbedderPolicy disabled so the transcript HTML page can load
// external fonts and be opened as a standalone tab without COOP/COEP errors.
// contentSecurityPolicy configured to allow inline scripts for transcript generation
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
// Set ALLOWED_ORIGINS to a comma-separated list of trusted origins in production.
// In development (NODE_ENV !== "production"), all origins are allowed when
// ALLOWED_ORIGINS is not set, to avoid friction.
const isDev = process.env.NODE_ENV !== "production";
const rawOrigins = process.env.ALLOWED_ORIGINS;
const allowedOrigins = rawOrigins
  ? rawOrigins.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

app.use(
  cors({
    credentials: true,
    origin:
      isDev && allowedOrigins.length === 0
        ? true
        : (origin, cb) => {
            // Requests with no Origin header (curl, same-origin) are allowed.
            if (!origin || allowedOrigins.includes(origin)) {
              cb(null, origin ?? true);
            } else {
              cb(null, false);
            }
          },
  }),
);

// ── General API rate limit: 200 requests per 15 minutes per IP ────────────────
// Enable trust proxy for Render deployment to correctly identify users behind reverse proxy
app.set("trust proxy", true);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

// ── Request logging ───────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", apiLimiter, router);

// ── Global error handler ──────────────────────────────────────────────────────
// Returns a generic message to the client; full detail is logged server-side only.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled application error");
  if (res.headersSent) return;
  const errObj = err as { status?: number; statusCode?: number };
  const status =
    typeof errObj?.status === "number"
      ? errObj.status
      : typeof errObj?.statusCode === "number"
        ? errObj.statusCode
        : 500;
  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: "An internal server error occurred.",
  });
});

export default app;
