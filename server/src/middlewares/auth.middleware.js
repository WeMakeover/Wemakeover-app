import jwt from "jsonwebtoken";
import 'dotenv/config'
import { generateAccessToken } from "../uitils/tokens/jwt.utils.js";
import { setAuthAccessCookie } from "../uitils/cookies/cookie.utils.js";
import { extractBearerToken, isMobileClient } from "../uitils/tokens/mobileAuth.utils.js";

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const phoneNumberRegex = /^[6-9]\d{9}$/;

const validateSignup = (req, res, next) => {
  const { name, email, phoneNumber, password, confirmPassword } = req.body;
  const mobile = isMobileClient(req);

  if (!name || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const trimmedEmail = typeof email === "string" ? email.trim() : "";
  const trimmedPhone =
    typeof phoneNumber === "string" ? phoneNumber.replace(/\D/g, "") : "";
  const hasEmail = trimmedEmail.length > 0;
  const hasPhone = trimmedPhone.length > 0;

  if (mobile) {
    if (!hasEmail && !hasPhone) {
      return res.status(400).json({ message: "Email or phone number is required" });
    }
    if (hasEmail && !emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (hasPhone && !phoneNumberRegex.test(trimmedPhone)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }
  } else {
    if (!hasEmail || !hasPhone) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (!phoneNumberRegex.test(trimmedPhone)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: "Password must be at least 8 characters long, contain at least one uppercase letter, one number, and one special character." });
  }

  req.body.email = hasEmail ? trimmedEmail.toLowerCase() : "";
  if (hasPhone) {
    req.body.phoneNumber = trimmedPhone;
  } else if (mobile) {
    delete req.body.phoneNumber;
  }

  next();
}

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email && !password) {
    return res.status(400).json({ success : false, message: "Email and password are required" });
  }
  if (!email) {
    return res.status(400).json({ success : false, message: "Email is required" });
  }
  if (!password) {
    return res.status(400).json({ success : false, message: "Password is required" });
  }

  const loginId = String(email).trim();
  const loginDigits = loginId.replace(/\D/g, "");
  const loginIsPhone = phoneNumberRegex.test(loginDigits) && !loginId.includes("@");
  if (!loginIsPhone && !emailRegex.test(loginId)) {
    return res.status(400).json({ success : false, message: "Invalid email format" });
  }
  if (loginIsPhone) {
    req.body.email = loginDigits;
  }
  
  next();
};

const checkAuth = async (req, res, next) => {
  try {
    let accessToken = extractBearerToken(req) || req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    // CASE 1: No access token
    if (!accessToken) {
      if (!refreshToken) {
        return res.status(200).json({ success : false, loggedIn: false, message: "No access & refresh token" });
      }

      // verify refresh token and issue new access token
      try {
        const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const newAccessToken = generateAccessToken(
          { id: decodedRefresh.id,  name : decodedRefresh.name,  role: decodedRefresh.role, email: decodedRefresh.email },
          "15m"
        );

        setAuthAccessCookie(res, newAccessToken);
        req.user = decodedRefresh;
        
        return next();
      } catch (refreshErr) {
        return res.status(403).json({ success : false, loggedIn: false, message: "Invalid refresh token" });
      }
    }

    // CASE 2: Access token exists, verify it
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
      req.user = decoded;
      return next();

    } catch (err) {
      if (err.name === "TokenExpiredError") {
        if (!refreshToken) {
          return res.status(401).json({ success : false, loggedIn: false, message: "No refresh token" });
        }

        try {
          const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

          const newAccessToken = generateAccessToken(
            { id: decodedRefresh.id, name : decodedRefresh.name, role: decodedRefresh.role, email: decodedRefresh.email },
            "15m"
          );

          setAuthAccessCookie(res, newAccessToken);
          req.user = decodedRefresh;

          return next();
        } catch (refreshErr) {
          return res.status(403).json({ success : false, loggedIn: false, message: "Invalid refresh token" });
        }
      }

      return res.status(403).json({ success : false, loggedIn: false, message: "Invalid access token" });
    }
  } catch (err) {
    return res.status(500).json({ success : false, loggedIn: false, message: "Auth check failed" });
  }
};



// Alias for checkAuth to match the expected name
const authenticateToken = checkAuth;

/**
 * Optional authentication middleware
 * Attaches user info if available but doesn't fail if not authenticated
 * Useful for routes that work both for authenticated and unauthenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const accessToken = extractBearerToken(req) || req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    // No tokens, continue without user
    if (!accessToken && !refreshToken) {
      req.user = null;
      return next();
    }

    // Try to verify access token
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
        req.user = decoded;
        return next();
      } catch (err) {
        if (err.name !== "TokenExpiredError") {
          // Invalid token, continue without user
          req.user = null;
          return next();
        }
      }
    }

    // Try refresh token if access token missing or expired
    if (refreshToken) {
      try {
        const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        
        const newAccessToken = generateAccessToken(
          { id: decodedRefresh.id, name: decodedRefresh.name, role: decodedRefresh.role, email: decodedRefresh.email },
          "15m"
        );
        
        setAuthAccessCookie(res, newAccessToken);
        req.user = decodedRefresh;
        return next();
      } catch (refreshErr) {
        // Invalid refresh token, continue without user
        req.user = null;
        return next();
      }
    }

    // Default: no user
    req.user = null;
    next();
  } catch (err) {
    // On any error, continue without user
    req.user = null;
    next();
  }
};

// Admin role middleware
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  
  // Check if admin is active
  // Import User model dynamically to avoid circular dependencies
  const { User } = await import('../models/user.model.js');
  const admin = await User.findById(req.user.id || req.user._id).select('isActive').lean();
  
  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Admin account not found'
    });
  }
  
  // Check if admin is inactive (explicitly false, not just undefined)
  if (admin.isActive === false) {
    return res.status(403).json({
      success: false,
      message: 'Your admin account has been deactivated. Please contact the system administrator.'
    });
  }
  
  next();
};

export { validateSignup, validateLogin, checkAuth, authenticateToken, requireAdmin, optionalAuth };