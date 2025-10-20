// Replit Auth integration from javascript_log_in_with_replit blueprint
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // In production, use secure cookies. In development, allow non-secure.
  const isProduction = process.env.NODE_ENV === 'production' || 
                       process.env.REPLIT_DEPLOYMENT === '1' ||
                       process.env.REPLIT_DOMAINS?.includes('.replit.app');
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax', // Must be 'lax' to allow OAuth callbacks
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    username: claims["preferred_username"],
    password: "",
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user: any = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user as Express.User);
  };

  // Support both development and production domains
  const domains = process.env.REPLIT_DOMAINS!.split(",");
  
  // Register strategies for all possible domains
  const allDomains = new Set(domains);
  
  // Add .replit.app versions for each .replit.dev domain
  domains.forEach(domain => {
    if (domain.includes('.replit.dev')) {
      allDomains.add(domain.replace('.replit.dev', '.replit.app'));
    }
  });
  
  // Register a strategy for each domain
  for (const domain of Array.from(allDomains)) {
    const protocol = domain.includes('localhost') ? 'http' : 'https';
    
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `${protocol}://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
    
    console.log(`[AUTH SETUP] Registered strategy for domain: ${domain}`);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Try to find a matching strategy, or use the first available one
    let strategyName = `replitauth:${req.hostname}`;
    
    // List of possible strategy names to try
    const possibleStrategies = [
      `replitauth:${req.hostname}`,
      `replitauth:${req.hostname.replace('.replit.app', '.replit.dev')}`,
      `replitauth:${req.hostname.replace('.replit.dev', '.replit.app')}`,
      ...domains.map(d => `replitauth:${d}`)
    ];
    
    // Find the first strategy that exists
    const availableStrategy = possibleStrategies.find(name => 
      (passport as any)._strategies[name] !== undefined
    );
    
    if (availableStrategy) {
      strategyName = availableStrategy;
    }
    
    console.log(`[AUTH] Login attempt with hostname: ${req.hostname}, using strategy: ${strategyName}`);
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Try to find a matching strategy, or use the first available one
    let strategyName = `replitauth:${req.hostname}`;
    
    // List of possible strategy names to try
    const possibleStrategies = [
      `replitauth:${req.hostname}`,
      `replitauth:${req.hostname.replace('.replit.app', '.replit.dev')}`,
      `replitauth:${req.hostname.replace('.replit.dev', '.replit.app')}`,
      ...domains.map(d => `replitauth:${d}`)
    ];
    
    // Find the first strategy that exists
    const availableStrategy = possibleStrategies.find(name => 
      (passport as any)._strategies[name] !== undefined
    );
    
    if (availableStrategy) {
      strategyName = availableStrategy;
    }
    
    console.log(`[AUTH] Callback attempt with hostname: ${req.hostname}, using strategy: ${strategyName}`);
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
      failureMessage: true,
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
