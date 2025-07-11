import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
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

// Hash password with salt for secure storage
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Compare a supplied password with a stored hashed password
async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Use a random secret in production; for demo we're using a fixed string
  // In real applications, this should be stored in environment variables
  const sessionSecret = process.env.SESSION_SECRET || "food-circles-secret-key";

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport to use local authentication strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Authenticating user:", username);
        // Make username comparison case-insensitive
        const normalizedUsername = username.toLowerCase();
        console.log("Normalized username:", normalizedUsername);

        // Basic input validation
        if (!username || !password) {
          return done(null, false, { message: "Please enter both email and password" });
        }

        // Check if email format is valid
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedUsername)) {
          return done(null, false, { message: "Please enter a valid email address" });
        }

        const user = await storage.getUserByUsername(normalizedUsername);
        if (!user) {
          console.log("User not found");
          return done(null, false, { message: "No account found with this email address" });
        }

        console.log("User found, verifying password");
        const isValidPassword = await comparePasswords(password, user.password);
        if (!isValidPassword) {
          console.log("Invalid password");
          return done(null, false, { message: "Incorrect password. Please try again" });
        }

        console.log("Password verified successfully");
        return done(null, user);
      } catch (err) {
        console.log("Authentication error:", err);
        return done(err);
      }
    }),
  );

  // Serialize the user ID to store in the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session ID to user object
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // User registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, name, bio, profilePicture } = req.body;

      if (!username || !password || !name) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        bio,
        profilePicture
      });

      // Log the user in after registration
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // User login endpoint
  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt:", req.body.username);
    passport.authenticate("local", (err: Error, user: Express.User, info: any) => {
      if (err) {
        console.log("Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Login failed:", info?.message || "Authentication failed");
        return res.status(401).json({ error: info?.message || "Authentication failed" });
      }

      console.log("User authenticated, creating session...");
      req.login(user, (err) => {
        if (err) {
          console.log("Session creation error:", err);
          return next(err);
        }
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        console.log("Login successful:", userWithoutPassword);
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // User logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user information endpoint
  app.get("/api/user", (req, res) => {
    console.log("Checking authentication, session id:", req.sessionID);
    console.log("Session:", req.session);
    console.log("Is authenticated:", req.isAuthenticated());

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Return user without password
    const { password, ...userWithoutPassword } = req.user as Express.User;
    console.log("User authenticated:", userWithoutPassword);
    res.json(userWithoutPassword);
  });

  // Also add /api/me endpoint for consistency
  app.get("/api/me", (req, res) => {
    console.log("Auth check - Method:", req.method, "Path:", req.path);
    console.log("Session ID:", req.sessionID);
    console.log("Is authenticated:", req.isAuthenticated());
    console.log("Session user:", req.user?.id);
    console.log("Headers:", req.headers);

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Return user without password
    const { password, ...userWithoutPassword } = req.user as Express.User;
    res.json(userWithoutPassword);
  });
}

// Authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  console.log('Auth check - Method:', req.method, 'Path:', req.path);
  console.log('Session ID:', req.sessionID);
  console.log('Is authenticated:', req.isAuthenticated());
  console.log('Session user:', req.session?.passport?.user);
  console.log('Headers:', req.headers);

  // Set CORS headers for all authenticated requests
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5000');

  if (req.isAuthenticated()) {
    return next();
  }

  console.log('Authentication failed for:', req.method, req.path);
  res.status(401).json({ error: 'Not authenticated' });
};