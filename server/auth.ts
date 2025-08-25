import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import crypto from "crypto";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { Request, Response, NextFunction } from "express";
import { sendError } from "./utils/sendError";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Hash password with scrypt for secure storage
async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate a random salt
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Hash the password using scrypt
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

// Compare a supplied password with a stored scrypt-hashed password
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    return new Promise((resolve, reject) => {
      const [hash, salt] = stored.split('.');
      if (!hash || !salt) {
        resolve(false);
        return;
      }
      
      crypto.scrypt(supplied, salt, 64, (err, derivedKey) => {
        if (err) {
          console.error("Password comparison error:", err);
          resolve(false);
        } else {
          resolve(hash === derivedKey.toString('hex'));
        }
      });
    });
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
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
        console.log("Stored password hash:", user.password);
        console.log("Supplied password:", password);
        const isValidPassword = await comparePasswords(password, user.password);
        console.log("Password validation result:", isValidPassword);
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
    } catch (err: any) {
      console.error('User deserialization error:', err);
      // If it's a database connection error, return null instead of error
      if (err.code === '57P01' || err.message?.includes('connection')) {
        console.warn('Database connection issue during auth, continuing without user');
        done(null, null);
      } else {
        done(err);
      }
    }
  });

  // User registration endpoint  
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, name, bio, profilePicture } = req.body;
      
      // Validate required fields
      if (!username || !password || !name) {
        return sendError(res, 400, "Username, password, and name are required");
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(username)) {
        return sendError(res, 400, "Please enter a valid email address");
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username.toLowerCase());
      if (existingUser) {
        return sendError(res, 409, "An account with this email already exists");
      }
      
      // Hash password before storing
      const hashedPassword = await hashPassword(password);
      
      const user = await storage.createUser({
        username: username.toLowerCase(),
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
      sendError(res, 500, "Registration failed");
    }
  });

  // User login endpoint
  app.post("/api/login", (req, res, next) => {
    console.log("=== LOGIN REQUEST DEBUG ===");
    console.log("Request method:", req.method);
    console.log("Request path:", req.path);
    console.log("Request headers:", req.headers);
    console.log("Request body:", req.body);
    console.log("Session ID before login:", req.sessionID);
    console.log("Session data before login:", req.session);
    console.log("Is authenticated before login:", req.isAuthenticated());
    
    passport.authenticate("local", (err: Error, user: Express.User, info: any) => {
      if (err) {
        console.log("Login authentication error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Login failed:", info?.message || "Authentication failed");
        return sendError(res, 401, info?.message || "Authentication failed");
      }

      console.log("User authenticated, creating session...");
      req.login(user, (err) => {
        if (err) {
          console.log("Session creation error:", err);
          return next(err);
        }
        
        // Force session save and ensure cookie is set
        req.session.save((saveErr) => {
          if (saveErr) {
            console.log("Session save error:", saveErr);
            return next(saveErr);
          }
          
          // Return user without password
          const { password, ...userWithoutPassword } = user;
          console.log("=== LOGIN SUCCESS ===");
          console.log("User logged in:", userWithoutPassword.username);
          console.log("Session ID after login:", req.sessionID);
          console.log("Session data after login:", req.session);
          console.log("Response headers will include:", {
            'Content-Type': 'application/json',
            'Set-Cookie': req.session.cookie
          });
          
          // Ensure we're sending JSON response
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).json(userWithoutPassword);
        });
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
      return sendError(res, 401, "Not authenticated");
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
      return sendError(res, 401, "Not authenticated");
    }

    // Return user without password
    const { password, ...userWithoutPassword } = req.user as Express.User;
    res.json(userWithoutPassword);
  });
}

// Enhanced authentication middleware with security hardening
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // Enhanced session validation
  const sessionId = req.sessionID;
  const isAuth = req.isAuthenticated();
  const userId = req.user?.id;

  // Debug logging for POST follow requests
  console.log('AUTH DEBUG - Method:', req.method, 'Path:', req.path);
  console.log('AUTH DEBUG - Session ID:', sessionId);
  console.log('AUTH DEBUG - Is authenticated:', isAuth);
  console.log('AUTH DEBUG - User ID:', userId);
  console.log('AUTH DEBUG - Session exists:', !!req.session);
  console.log('AUTH DEBUG - Cookie:', req.headers.cookie);

  // Validate session integrity
  if (!sessionId || typeof sessionId !== 'string') {
    console.log('AUTH ERROR - Invalid session');
    return sendError(res, 401, "Invalid session");
  }

  // Validate user authentication
  if (!isAuth) {
    console.log('AUTH ERROR - Not authenticated');
    return sendError(res, 401, "Not authenticated");
  }

  // Validate user object and ID
  if (!userId || typeof userId !== 'number' || userId <= 0 || !Number.isInteger(userId)) {
    console.log('AUTH ERROR - Invalid user session');
    return sendError(res, 401, "Invalid user session");
  }

  // Enhanced CORS validation for security
  const allowedOrigins = [
    'http://localhost:5000',
    'https://localhost:5000',
    'https://569b8f5b-fe7d-444a-a966-c78d010fa3fe-00-13fjnyyxri63e.kirk.replit.dev',
    process.env.REPLIT_URL || '',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) {
    console.warn('Rejected request from unauthorized origin:', origin);
    return sendError(res, 403, "Unauthorized origin");
  }

  // Set secure CORS headers
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', origin || 'http://localhost:5000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');

  // Store user agent for logging purposes but don't enforce for API routes
  const userAgent = req.headers['user-agent'];
  if (userAgent && !(req.session as any).userAgent) {
    (req.session as any).userAgent = userAgent;
  }

  next();
};

// Alias for compatibility
export const requireAuth = authenticate;