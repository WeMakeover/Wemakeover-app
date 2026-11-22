import { BACKEND_URL as backendurl } from "../../config/env";
import { apiFetch, readJson } from "../../lib/apiFetch";
import { setTokens, clearTokens } from "../../lib/tokenStorage";

/**
 * Auth API — ported from the web client (client-main/src/features/auth/authApi.js).
 * Changes for mobile:
 *  - `fetch` -> `apiFetch` (adds Bearer token + X-Client header, auto-refresh).
 *  - Cookies replaced by tokens: on success we persist accessToken/refreshToken.
 */

const persistFromResponse = async (data) => {
  if (data?.accessToken) {
    await setTokens(data.accessToken, data.refreshToken);
  }
};

// 1. login
export const loginApi = async ({ email, password }) => {
  const res = await apiFetch(`${backendurl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await readJson(res);
  if (!data.success) {
    throw new Error(data.message);
  }
  await persistFromResponse(data);
  return data;
};

export const checkRegisterAvailabilityApi = async ({ phoneNumber, email }) => {
  const res = await apiFetch(`${backendurl}/auth/register/availability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber, email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Could not check this number");
  }
  return data;
};

// 2. signup
export const signupApi = async ({
  name,
  email,
  phoneNumber,
  password,
  confirmPassword,
  referralCode,
  accessToken,
}) => {
  const body = { name, email, password, confirmPassword, phoneNumber };
  if (accessToken) body.accessToken = accessToken;
  if (typeof referralCode === "string" && referralCode.trim()) {
    body.referralCode = referralCode.trim().toUpperCase();
  }

  let res;
  try {
    res = await apiFetch(`${backendurl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err?.message || "";
    if (msg.includes("fetch failed") || msg.includes("ConnectException") || msg.includes("Network request failed")) {
      throw new Error(
        `Cannot reach the server at ${backendurl}. Start the backend (cd server && npm run dev) and set EXPO_PUBLIC_API_URL in wemakeover-rn/.env to your PC IP.`
      );
    }
    throw err;
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Signup failed");
  }
  await persistFromResponse(data);
  return data;
};

// 3. verify-otp
export const verifyOtpApi = async ({ channel = "email", email, phoneNumber, otp }) => {
  const body =
    channel === "phone"
      ? { phoneNumber, otp }
      : { email, otp };

  const res = await apiFetch(`${backendurl}/auth/register/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "OTP verification failed");
  }
  await persistFromResponse(data);
  return data;
};

// 3b. verify-otp (phone — stub until SMS backend is live)
export const verifyPhoneOtpApi = async () => {
  throw new Error("SMS verification is not configured yet. Please try again later.");
};

// 6. resend-otp
export const resendOtpApi = async ({ channel = "email", email, phoneNumber }) => {
  const body =
    channel === "phone"
      ? { phoneNumber }
      : { email };

  const res = await apiFetch(`${backendurl}/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to resend OTP");
  }
  return data;
};

// 6b. resend-otp (phone — stub until SMS backend is live)
export const resendPhoneOtpApi = async () => {
  throw new Error("SMS resend is not configured yet. Please try again later.");
};

// 4. forget-password
export const forgetPassword = async (email) => {
  const res = await apiFetch(`${backendurl}/auth/forget-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to send reset link");
  }
  return data;
};

// 5. reset-password
export const resetPasswordApi = async ({ id, token, password, confirmPassword }) => {
  const res = await apiFetch(`${backendurl}/auth/reset-password/${id}/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, confirmPassword }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Password reset failed");
  }
  await persistFromResponse(data);
  return data;
};

// 7. check login status
export const checkLoginStatusApi = async () => {
  try {
    const res = await apiFetch(`${backendurl}/auth/status`, { method: "GET" });
    if (!res.ok) {
      return { success: false, status: res.status, user: null };
    }
    const data = await res.json();
    await persistFromResponse(data);
    return { success: true, ...data };
  } catch (error) {
    // Phone cannot reach LAN API (192.168.x.x) — expected until USB reverse or API tunnel.
    console.warn("checkLoginStatusApi:", error?.message || error);
    return { success: false, message: error.message };
  }
};

// 8. logout
export const logoutApi = async () => {
  try {
    await apiFetch(`${backendurl}/auth/logout`, { method: "POST" });
  } finally {
    await clearTokens();
  }
  return { ok: true };
};

// 9. Google OAuth login
export const googleLoginApi = async (code) => {
  const res = await apiFetch(`${backendurl}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Google login failed");
  }
  await persistFromResponse(data);
  return data;
};

// 10. Complete Google signup
export const completeGoogleSignupApi = async ({ userId, phoneNumber, password, confirmPassword }) => {
  const res = await apiFetch(`${backendurl}/auth/google/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, phoneNumber, password, confirmPassword }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to complete signup");
  }
  await persistFromResponse(data);
  return data;
};

export const requestPhoneUpdateOtpApi = async (phoneNumber) => {
  const res = await apiFetch(`${backendurl}/auth/phone/otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Failed to send verification code");
  }
  return data;
};

export const addEmailApi = async (email) => {
  const res = await apiFetch(`${backendurl}/auth/email`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Could not add email");
  }
  return data;
};

export const updatePhoneApi = async ({ phoneNumber, accessToken }) => {
  const res = await apiFetch(`${backendurl}/auth/phone`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber, accessToken }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Failed to update mobile number");
  }
  return data;
};
