import 'dotenv/config';
import jwt from "jsonwebtoken";

import { sendEmailVerification, sendForgetPassword } from '../services/email.service.js';
import { login, signup } from "../services/auth.service.js";
import { generateOtp } from '../services/otp.service.js';
import { verifyMsg91AccessToken } from '../services/msg91.service.js';
import { deleteCache, getCache, setCache } from '../uitils/redis/redis.utils.js';
import { User } from '../models/user.model.js';
import { setAuthAccessCookie, setAuthRefreshCookie } from '../uitils/cookies/cookie.utils.js';
import { generateAccessToken, generateRefreshToken, generateToken } from '../uitils/tokens/jwt.utils.js';
import { attachMobileTokens, extractBearerToken } from '../uitils/tokens/mobileAuth.utils.js';

const normalizeAuthEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const PLACEHOLDER_EMAIL = /@mobile\.wemakeover\.app$/i;

const publicAuthEmail = (email) => {
  const value = normalizeAuthEmail(email);
  if (!value || PLACEHOLDER_EMAIL.test(value)) return null;
  return value;
};

const checkRegisterAvailabilityController = async (req, res) => {
  try {
    const digits = String(req.body?.phoneNumber || "").replace(/\D/g, "");
    const email = normalizeAuthEmail(req.body?.email);

    if (!/^[6-9]\d{9}$/.test(digits)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit mobile number",
      });
    }

    const phoneTaken = await User.findOne({ phoneNumber: digits });
    if (phoneTaken) {
      return res.status(409).json({
        success: false,
        message: "This mobile number is already registered",
      });
    }

    if (email) {
      const emailTaken = await User.findOne({ email });
      if (emailTaken) {
        return res.status(409).json({
          success: false,
          message: "User already exists with this email",
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error checking register availability:", error);
    return res.status(500).json({
      success: false,
      message: "Could not check this number",
    });
  }
};

const signupController = async (req, res) => {
  try {
    const { name, phoneNumber, password } = req.body;
    const accessToken = String(req.body.accessToken || "").trim();
    let email = normalizeAuthEmail(req.body.email);
    const referralCodeRaw = req.body.referralCode ?? req.body.referral_code ?? '';
    const phoneDigits = String(phoneNumber || "").replace(/\D/g, "");

    if (accessToken) {
      if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
        return res.status(400).json({ message: "Enter a valid 10-digit mobile number" });
      }
      const verifiedDigits = await verifyMsg91AccessToken(accessToken);
      if (verifiedDigits !== phoneDigits) {
        return res.status(400).json({ message: "Verified number does not match" });
      }
      if (!email) email = null;
    } else if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // check if user already exists
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }
    }
    // check if phone number already exists
    if (phoneNumber) {
      const existingPhone = await User.findOne({ phoneNumber });
      if (existingPhone) {
        return res.status(400).json({ message: "User already exists with this phone number" });
      }
    }

    // Validate referral code before creating the user (register-only apply)
    let normalizedReferralCode = '';
    if (typeof referralCodeRaw === 'string' && referralCodeRaw.trim()) {
      const { validateReferralCode } = await import('../services/referral.service.js');
      const validation = await validateReferralCode(referralCodeRaw);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message || 'Invalid referral code',
        });
      }
      normalizedReferralCode = validation.referrer.referralCode;
    }

    const verifiedByPhone = Boolean(accessToken);

    if (!verifiedByPhone) {
      const otp = generateOtp();
      await setCache(email, otp, 300);
      const emailContent = {
        username: name,
        appName: process.env.APP_NAME,
        otp: otp,
      };
      await sendEmailVerification(email, 'Email Verification', emailContent);
    }

    const newUser = await signup({
      name,
      email,
      phoneNumber: phoneDigits || phoneNumber,
      password,
      isVerified: verifiedByPhone,
    });

    // Assign own referral code + optionally apply friend's code
    try {
      const {
        ensureUserHasReferralCode,
        applyReferralCode,
      } = await import('../services/referral.service.js');

      const userId = newUser?._id || newUser?.id;
      if (!userId) {
        console.error('Referral setup skipped: signup returned no user id');
      } else {
        await ensureUserHasReferralCode(userId);
        if (normalizedReferralCode) {
          const applied = await applyReferralCode({
            refereeUserId: userId,
            code: normalizedReferralCode,
          });
          if (!applied.success) {
            console.warn('Referral apply after signup failed:', applied.message);
          }
        }
      }
    } catch (referralErr) {
      console.error('Referral setup during signup failed:', referralErr.message);
    }
    
    if (verifiedByPhone) {
      const payload = {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      };
      const jwtAccess = generateAccessToken(payload);
      const jwtRefresh = generateRefreshToken(payload);
      setAuthAccessCookie(res, jwtAccess);
      setAuthRefreshCookie(res, jwtRefresh);
      return res.status(201).json(
        attachMobileTokens(req, {
          success: true,
          message: "Account verified",
          user: {
            name: newUser.name,
            email: publicAuthEmail(newUser.email),
            phoneNumber: newUser.phoneNumber,
          },
        }, jwtAccess, jwtRefresh),
      );
    }

    return res.status(201).json({ message: "Verification email sent successfully. Please check your inbox." });
    

  } catch (error) {
    console.error("Error registering user:", error);
    const status = Number(error.status) || 500;
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "This mobile number or email is already registered",
      });
    }
    if (status >= 400 && status < 500) {
      return res.status(status).json({
        message: error.message || "Could not create account",
      });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

const validateOtpController = async (req, res) => {
  try {
    const email = normalizeAuthEmail(req.body.email);
    const otp = String(req.body.otp ?? '').trim();

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const cachedOtp = await getCache(email);
    
    if (!cachedOtp) {
      return res.status(400).json({ message: "Time limit exceed. Expired OTP" });
    }

    if (String(cachedOtp) !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark user as verified
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { isVerfied: true },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const payload = {
      id: updatedUser._id,
      name : updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      name : updatedUser.name
    };

    // Generate JWT token
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Set cookie
    setAuthAccessCookie(res, accessToken);
    setAuthRefreshCookie(res, refreshToken);

    // Clear the OTP from cache after successful verification
    await deleteCache(email);

    // Respond
    return res.status(200).json(
      attachMobileTokens(req, {
        success: true,
        message: "Email verified successfully",
        user: {
          name: updatedUser.name,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
        },
      }, accessToken, refreshToken),
    );

    
  } catch (error) {
    console.error("Error validating OTP:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

const resendOtpController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const normalizedEmail = normalizeAuthEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register again.',
      });
    }

    if (user.isVerfied) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified. Please login.',
      });
    }

    const otp = generateOtp();
    await setCache(normalizedEmail, otp, 300);

    const emailContent = {
      username: user.name,
      appName: process.env.APP_NAME || 'Wemakeover',
      otp,
    };

    await sendEmailVerification(normalizedEmail, 'Email Verification', emailContent);

    return res.status(200).json({
      success: true,
      message: 'Verification OTP sent successfully. Please check your inbox.',
    });
  } catch (error) {
    console.error('Error resending OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend OTP. Please try again.',
      error: error.message,
    });
  }
};

const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user
    const loginId = String(email || "").trim();
    const loginDigits = loginId.replace(/\D/g, "");
    const user = /^[6-9]\d{9}$/.test(loginDigits) && !loginId.includes("@")
      ? await User.findOne({ phoneNumber: loginDigits }).select("+password")
      : await login(loginId);
    if (!user) {
      return res.status(401).json({ success : false,  message: "Invalid Email, user doesn't exists" });
    }

    // 2. Check if verified
    if (!user.isVerfied) {
      return res.status(403).json({ success : false, message: "Please verify your email before logging in" });
    }

    // 2.5. Check if admin is active (only for admin users)
    if (user.role === 'admin' && user.isActive === false) {
      return res.status(403).json({ 
        success: false, 
        message: "Your admin account has been deactivated. Please contact the system administrator." 
      });
    }

    // 3. Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success : false, message: "Invalid password," });
    }

    // 4. Generate payload for the tokens
    const payload = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      name : user.name
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // 5. Set cookies
    setAuthAccessCookie(res, accessToken);
    setAuthRefreshCookie(res, refreshToken);

    // 6. Response
    return res.status(200).json(
      attachMobileTokens(req, {
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          name: user.name,
          email: publicAuthEmail(user.email),
          phoneNumber: user.phoneNumber,
          role: user.role,
        },
      }, accessToken, refreshToken),
    );

  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


const logoutController = async(req, res) => {
  try {
    const { accessToken, refreshToken } = req.cookies;

    // Optionally: add token to blacklist (if using JWT with blacklist/whitelist logic)
    // if (accessToken) {
      // Example: save it to a Redis blacklist until it expires
      // await redis.set(`bl_${accessToken}`, true, "EX", tokenExpiryTime);
    // }

    // if (refreshToken) {
      // Same for refresh token
      // await redis.set(`bl_${refreshToken}`, true, "EX", refreshExpiryTime);
    // }

    // Clear cookies safely
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // secure only in prod
      sameSite: "strict",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      error : "Error occured during loggin out",
      message: error.message,
    });
  }
}

// const forgotPasswordController = async(req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({
//         success: false,
//         message: "Email is required",
//       });
//     }

//     // 1. Check if user exists
//     const user = await User.findOne({ email });
//     if (!user) {
//       // Do NOT reveal that the email doesn't exist -> security best practice
//       return res.status(200).json({
//         success: true,
//         message: "If the account exists, an OTP has been sent to the registered email.",
//       });
//     }

//     // 2. Generate OTP
//     const otp = generateOtp();

//     // 3. Store OTP in Redis with expiry (5 mins)
//     await setCache(`reset:${email}`, otp, 300);

//     // 4. Send email with OTP
//     const emailContent = {
//       username: user.name,
//       appName: process.env.APP_NAME,
//       token : otp,
//     };

//     await sendForgetPassword(
//       email,
//       "Password Reset Request",
//       emailContent
//     );

//     // 5. Response
//     return res.status(200).json({
//       success: true,
//       message:
//         "If the account exists, an OTP has been sent to the registered email.",
//     });



//   } catch (error) {
//     console.error("Error in forgotPasswordController:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// }


const forgotPasswordController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // 1. Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Do NOT reveal existence
      return res.status(200).json({
        success: true,
        message: "If the account exists, a password reset link has been sent.",
      });
    }

    // 2. Generate short-lived JWT reset token
    const tokenPayload = { id : user._id }
    const resetToken = generateToken(tokenPayload, "15m")

    // 2.5: Store token in Redis (so we can invalidate after use)
    await setCache(`resetToken:${user._id}`, resetToken, 900); // 15 min

    // 3. Construct reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${user._id}/${resetToken}`;

    // 4. Send email
    const emailContent = {
      username: user.name,
      appName: process.env.APP_NAME,
      url: resetUrl,
    };

    await sendForgetPassword(
      email,
      "Password Reset Request",
      emailContent
    );

    // 5. Response
    return res.status(200).json({
      success: true,
      message: "A password reset link has been sent to your email.",
    });

  } catch (error) {
    console.error("Error in forgotPasswordController:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


const resetPasswordController = async (req, res) => {
  try {
   const { id, token } = req.params;
    console.log(token)
    const { password, confirmPassword } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }

    if (!confirmPassword) {
      return res.status(400).json({ success: false, message: "confirmPassword is required" });
    }

    if(confirmPassword !== password) {
      return res.status(400).json({ success: false, message: "password and confirmPassword do not match" });
    }

    // 2. Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      
    } catch (err) {
      return res.status(400).json({
        success: false,
        message:
          err.name === "TokenExpiredError"
            ? "Reset link has expired. Please request a new one."
            : "Invalid reset link",
      });
    }

    const userId = decoded.id;

    // 2. Check Redis for token existence
    const cachedToken = await getCache(`resetToken:${userId}`);
    if (!cachedToken || cachedToken !== token) {
      return res.status(400).json({ success: false, message: "Reset token already used or invalid" });
    }

    // 3. Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 4. Update password (pre-save hook will hash + update passwordChangedAt)
    user.password = password;
    await user.save();

    // 5. Delete reset token from Redis (one-time use)
    await deleteCache(`resetToken:${userId}`);

    // 6. Generate new access & refresh tokens
    const payload = { id: user._id, name : user.name, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // 7. Set cookies
    setAuthAccessCookie(res, accessToken);
    setAuthRefreshCookie(res, refreshToken);
    
    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You are now logged in.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });    

  } catch (error) {
     console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error : error.message
    });
  }
};

// Check authentication status and return full user data
const checkStatusController = async (req, res) => {
  try {
    // req.user comes from checkAuth middleware (contains JWT payload: id, name, email, role)
    const userId = req.user.id;

    // Fetch the complete user data from database to get phoneNumber
    const user = await User.findById(userId).select('-password -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        loggedIn: false,
        message: "User not found"
      });
    }

    // Return full user data including phoneNumber
    const bearerAccess = extractBearerToken(req);
    return res.status(200).json(
      attachMobileTokens(req, {
        success: true,
        loggedIn: true,
        user: {
          id: user._id,
          name: user.name,
          email: publicAuthEmail(user.email),
          phoneNumber: user.phoneNumber,
          role: user.role,
        },
      }, bearerAccess || req.cookies?.accessToken, req.cookies?.refreshToken),
    );
  } catch (error) {
    console.error("Error checking status:", error);
    return res.status(500).json({
      success: false,
      loggedIn: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

const googleLoginController = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ 
        success: false, 
        message: "Authorization code is required" 
      });
    }

    // Import Google OAuth client
    const { OAuth2Client } = await import('google-auth-library');
    
    // Get Google OAuth credentials from environment
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("Google OAuth credentials not configured");
      return res.status(500).json({ 
        success: false, 
        message: "Google OAuth not configured on server" 
      });
    }

    const client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    let ticket;
    try {
      // Exchange authorization code for tokens
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      // Verify the ID token and get user info
      ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      console.error("Google OAuth error:", error);
      return res.status(401).json({ 
        success: false, 
        message: "Invalid or expired authorization code" 
      });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email not provided by Google" 
      });
    }

    // Check if user already exists
    let user = await User.findOne({ 
      $or: [
        { email },
        { googleId }
      ]
    });

    if (user) {
      // User exists - update googleId if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.isVerfied = true; // Mark as verified
        await user.save();
      }
    } else {
      // Omit phoneNumber/password so sparse unique index allows multiple pending Google signups
      const displayName = (name || email.split('@')[0]).slice(0, 50);
      user = await User.create({
        name: displayName,
        email,
        googleId,
        isVerfied: true,
        role: "user",
      });

      try {
        const { ensureUserHasReferralCode } = await import('../services/referral.service.js');
        await ensureUserHasReferralCode(user._id || user.id);
      } catch (referralErr) {
        console.error('Referral code assign on Google signup failed:', referralErr.message);
      }
    }

    // Check if phone number is required
    if (!user.phoneNumber) {
      // Phone number is missing - return flag to collect it
      return res.status(200).json({
        success: true,
        phoneNumberRequired: true,
        message: "Phone number is required to complete signup",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: null,
          role: user.role,
        },
      });
    }

    // Phone number exists - proceed with login
    // Generate JWT tokens
    const tokenPayload = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set cookies
    setAuthAccessCookie(res, accessToken);
    setAuthRefreshCookie(res, refreshToken);

    // Return response (same format as regular login)
    return res.status(200).json({
      success: true,
      phoneNumberRequired: false,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Error in Google login:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error", 
      error: error.message 
    });
  }
};

const completeGoogleSignupController = async (req, res) => {
  try {
    const { userId, phoneNumber, password, confirmPassword } = req.body;

    if (!userId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "User ID and phone number are required",
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password are required",
      });
    }

    // Validate phone number format (10 digits starting with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits starting with 6, 7, 8, or 9",
      });
    }

    // Validate password format (same as regular signup)
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters with uppercase, number, and special character",
      });
    }

    // Check password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has googleId (Google OAuth user)
    if (!user.googleId) {
      return res.status(400).json({
        success: false,
        message: "This endpoint is only for Google OAuth users",
      });
    }

    // Check if phone number already exists (unique constraint)
    const existingPhone = await User.findOne({
      phoneNumber,
      _id: { $ne: userId },
    });

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number already exists",
      });
    }

    // Update user with phone number and password
    user.phoneNumber = phoneNumber;
    user.password = password; // Password will be hashed by the pre-save hook
    await user.save();

    // Generate JWT tokens
    const tokenPayload = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set cookies
    setAuthAccessCookie(res, accessToken);
    setAuthRefreshCookie(res, refreshToken);

    // Return response
    return res.status(200).json({
      success: true,
      message: "Signup completed successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error completing Google signup:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const refreshTokenController = async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const payload = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role,
      email: decoded.email,
    };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    setAuthAccessCookie(res, newAccessToken);
    setAuthRefreshCookie(res, newRefreshToken);
    return res.status(200).json(
      attachMobileTokens(req, { success: true, message: 'Token refreshed' }, newAccessToken, newRefreshToken),
    );
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid refresh token' });
  }
};

function phoneUpdateCacheKey(userId) {
  return `phone-update:${userId}`;
}

async function assertPhoneAvailable(userId, digits) {
  if (!/^[6-9]\d{9}$/.test(digits)) {
    const err = new Error("Enter a valid 10-digit mobile number");
    err.status = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  if (user.phoneNumber && String(user.phoneNumber).replace(/\D/g, "") === digits) {
    const err = new Error("New number must be different from the current number");
    err.status = 400;
    throw err;
  }

  const taken = await User.findOne({
    phoneNumber: digits,
    _id: { $ne: userId },
  });
  if (taken) {
    const err = new Error("This mobile number is already registered");
    err.status = 409;
    throw err;
  }

  return user;
}

const requestPhoneUpdateOtpController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const digits = String(req.body?.phoneNumber || "").replace(/\D/g, "");
    await assertPhoneAvailable(userId, digits);

    await setCache(phoneUpdateCacheKey(userId), { phoneNumber: digits }, 300);

    return res.status(200).json({
      success: true,
      message: "Verification code sent",
      provider: "msg91",
    });
  } catch (error) {
    const status = error.status || 500;
    if (status === 500) {
      console.error("Error sending phone update OTP:", error);
    }
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to send verification code",
    });
  }
};

const addEmailController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const email = normalizeAuthEmail(req.body?.email);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (publicAuthEmail(user.email)) {
      return res.status(400).json({
        success: false,
        message: "Email is already added",
      });
    }

    const taken = await User.findOne({ email });
    if (taken && String(taken._id || taken.id) !== String(userId)) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    user.email = email;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email added",
      user: {
        id: user._id,
        name: user.name,
        email: publicAuthEmail(user.email),
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }
    console.error("Error adding email:", error);
    return res.status(500).json({
      success: false,
      message: "Could not add email",
    });
  }
};

const updatePhoneController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const digits = String(req.body?.phoneNumber || "").replace(/\D/g, "");
    const accessToken = String(req.body?.accessToken || "").trim();

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: "Wrong code entered",
      });
    }

    const verifiedDigits = await verifyMsg91AccessToken(accessToken);
    if (verifiedDigits !== digits) {
      return res.status(400).json({
        success: false,
        message: "Verified number does not match",
      });
    }

    const user = await assertPhoneAvailable(userId, digits);
    const cached = await getCache(phoneUpdateCacheKey(userId));

    if (!cached || cached.phoneNumber !== digits) {
      return res.status(400).json({
        success: false,
        message: "Send a verification code first",
      });
    }

    user.phoneNumber = digits;
    await user.save();
    await deleteCache(phoneUpdateCacheKey(userId));

    return res.status(200).json({
      success: true,
      message: "Mobile number updated",
      user: {
        id: user._id,
        name: user.name,
        email: publicAuthEmail(user.email),
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This mobile number is already registered",
      });
    }
    const status = error.status || 500;
    if (status === 500) {
      console.error("Error updating phone number:", error);
    }
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to update mobile number",
    });
  }
};

const registerFcmTokenController = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'FCM token required' });
    }
    await User.findByIdAndUpdate(req.user.id, { fcmToken });
    return res.status(200).json({ success: true, message: 'FCM token registered' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to register FCM token' });
  }
};

export { signupController, validateOtpController, resendOtpController, loginController, logoutController, forgotPasswordController, resetPasswordController, checkStatusController, googleLoginController, completeGoogleSignupController, refreshTokenController, registerFcmTokenController, updatePhoneController, requestPhoneUpdateOtpController, checkRegisterAvailabilityController, addEmailController };
