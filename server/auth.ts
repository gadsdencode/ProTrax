// Blueprint: javascript_auth_all_persistance
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import express from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Security: Remove password from user object before sending to client
function sanitizeUser(user: SelectUser): Omit<SelectUser, 'password'> {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized", message: "Authentication required" });
}

// ============= ROLE-BASED ACCESS CONTROL (RBAC) =============

// Valid user roles in order of privilege (highest to lowest)
export type UserRole = 'admin' | 'project_manager' | 'member' | 'viewer';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  project_manager: 3,
  member: 2,
  viewer: 1,
};

/**
 * Middleware factory to check if authenticated user has the required role.
 * Uses role hierarchy: admin > project_manager > member > viewer
 * 
 * @param requiredRole - Minimum role required to access the route
 * @param options - Configuration options
 * @param options.exact - If true, requires exact role match (no hierarchy)
 * @returns Express middleware function
 * 
 * @example
 * router.delete('/projects/:id', isAuthenticated, hasRole('admin'), handler);
 * router.post('/projects', isAuthenticated, hasRole('project_manager'), handler);
 */
export function hasRole(requiredRole: UserRole, options: { exact?: boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Ensure user is authenticated first
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Authentication required" 
      });
    }

    const userRole = (req.user.role || 'member') as UserRole;
    
    // Validate the role exists in hierarchy
    if (!(userRole in ROLE_HIERARCHY)) {
      console.warn(`Invalid user role detected: ${userRole}`);
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "Invalid user role" 
      });
    }

    // Check role permission
    const hasPermission = options.exact
      ? userRole === requiredRole
      : ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];

    if (!hasPermission) {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: `This action requires ${requiredRole} privileges` 
      });
    }

    next();
  };
}

/**
 * Shortcut middleware for admin-only routes.
 * Equivalent to hasRole('admin')
 */
export const isAdmin = hasRole('admin');

/**
 * Shortcut middleware for project manager or higher routes.
 * Equivalent to hasRole('project_manager')
 */
export const isProjectManager = hasRole('project_manager');

/**
 * Middleware to check if user is the project manager OR has admin role.
 * Useful for project-specific operations where the owner should also have access.
 * 
 * @param getProjectId - Function to extract project ID from request
 */
export function isProjectOwnerOrAdmin(getProjectId: (req: Request) => number | string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Authentication required" 
      });
    }

    const userRole = (req.user.role || 'member') as UserRole;
    
    // Admins always have access
    if (userRole === 'admin') {
      return next();
    }

    // Check if user is the project manager
    const projectId = getProjectId(req);
    try {
      const project = await storage.getProject(Number(projectId));
      
      if (!project) {
        return res.status(404).json({ 
          error: "Not Found", 
          message: "Project not found" 
        });
      }

      if (project.managerId === req.user.id) {
        return next();
      }

      // User is neither admin nor project owner
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "Only project managers or admins can perform this action" 
      });
    } catch (error) {
      console.error('Error checking project ownership:', error);
      return res.status(500).json({ 
        error: "Internal Server Error", 
        message: "Failed to verify project ownership" 
      });
    }
  };
}

export function setupAuth(app: express.Application) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  // Adapted for string IDs (UUID)
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      // Validate that id is a string (protect against old OIDC session format)
      if (typeof id !== 'string') {
        console.log('Invalid session format detected, clearing session');
        return done(null, false);
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        // User not found - session is invalid
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error('Error deserializing user:', error);
      done(null, false);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Security: Never send password to client
        res.status(201).json(sanitizeUser(user));
      });
    } catch (error: any) {
      // Handle database errors (e.g., duplicate email)
      if (error.code === '23505') {
        if (error.constraint === 'users_email_unique') {
          return res.status(400).json({ error: "Email already exists" });
        }
        if (error.constraint === 'users_username_unique') {
          return res.status(400).json({ error: "Username already exists" });
        }
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed", message: error.message });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Security: Never send password to client
    res.status(200).json(sanitizeUser(req.user!));
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Security: Never send password to client
    res.json(sanitizeUser(req.user!));
  });
}
