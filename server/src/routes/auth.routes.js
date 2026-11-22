import express from "express";

import { forgotPasswordController, googleLoginController, completeGoogleSignupController, loginController, logoutController, resetPasswordController, resendOtpController, signupController, validateOtpController, checkStatusController, refreshTokenController, registerFcmTokenController, updatePhoneController, requestPhoneUpdateOtpController, checkRegisterAvailabilityController, addEmailController } from "../controllers/auth.contoller.js";
import { checkAuth, validateLogin, validateSignup } from "../middlewares/auth.middleware.js";

const authRouter = express.Router();

// Route for user registration
authRouter.post("/register/availability", checkRegisterAvailabilityController);
authRouter.post("/register", validateSignup, signupController );
authRouter.post("/register/verify-otp", validateOtpController );
authRouter.post("/resend-otp", resendOtpController);


// Route for user login
authRouter.post("/login", validateLogin, loginController);

// Route for Google OAuth login
authRouter.post("/google", googleLoginController);

// Route for completing Google signup with phone number
authRouter.post("/google/complete", completeGoogleSignupController);

// Route for user logout
authRouter.post("/logout", logoutController);


// Check Logged-in State
authRouter.get('/status', checkAuth, checkStatusController);

// Mobile token refresh
authRouter.post('/refresh', refreshTokenController);

// Register FCM push token
authRouter.post('/fcm-token', checkAuth, registerFcmTokenController);

authRouter.post("/phone/otp", checkAuth, requestPhoneUpdateOtpController);
authRouter.patch("/phone", checkAuth, updatePhoneController);
authRouter.patch("/email", checkAuth, addEmailController);

// Route for user forget password
authRouter.post("/forget-password", forgotPasswordController);
authRouter.post("/reset-password/:id/:token", resetPasswordController);

// Export the authRouter to be used in the main server file
export default authRouter;