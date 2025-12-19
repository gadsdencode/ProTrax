import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { setupRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startRecurringTaskScheduler } from "./scheduler";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Sensitive keys to redact from logs (case-insensitive matching)
const SENSITIVE_KEYS = new Set([
  'password', 'token', 'accesstoken', 'access_token', 'refreshtoken', 'refresh_token',
  'secret', 'apikey', 'api_key', 'authorization', 'auth', 'credential', 'credentials',
  'sessionid', 'session_id', 'sid', 'cookie', 'jwt', 'bearer', 'privatekey', 'private_key',
  'email', 'ssn', 'creditcard', 'credit_card', 'cardnumber', 'card_number', 'cvv', 'pin'
]);

/**
 * Deep redacts sensitive data from objects for safe logging.
 * Recursively traverses objects/arrays and replaces sensitive values with '[REDACTED]'.
 */
function redactSensitiveData(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion and excessive nesting
  if (depth > 10) return '[MAX_DEPTH]';
  
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, depth + 1));
  }
  
  if (typeof obj === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey) || 
          Array.from(SENSITIVE_KEYS).some(sk => lowerKey.includes(sk))) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveData(value, depth + 1);
      }
    }
    return redacted;
  }
  
  return obj;
}

const isProduction = process.env.NODE_ENV === 'production';

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  // Only capture response bodies in development for debugging
  if (!isProduction) {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // In development, append redacted response body for debugging
      if (!isProduction && capturedJsonResponse) {
        const redactedResponse = redactSensitiveData(capturedJsonResponse);
        logLine += ` :: ${JSON.stringify(redactedResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await setupRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start the recurring task scheduler (runs every hour by default)
    startRecurringTaskScheduler(60);
  });
})();
