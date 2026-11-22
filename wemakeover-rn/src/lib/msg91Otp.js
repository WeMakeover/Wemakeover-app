import {
  MSG91_AUTH_TOKEN,
  MSG91_PHONE_OTP_ENABLED,
  MSG91_WIDGET_ID,
} from "../config/msg91";

const MSG91_WIDGET = "https://control.msg91.com/api/v5/widget";

export function indiaPhoneIdentifier(tenDigits) {
  return `91${String(tenDigits || "").replace(/\D/g, "").slice(-10)}`;
}

function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function looksLikeReqId(value) {
  return /^[a-zA-Z0-9]{16,}$/.test(asText(value));
}

function looksLikeJwt(value) {
  const text = asText(value);
  return text.split(".").length === 3 && text.length > 20;
}

function isSuccess(res) {
  const type = String(res?.type || res?.status || "").toLowerCase();
  return type === "success";
}

function pickReqId(res) {
  const candidates = [res?.reqId, res?.requestId, res?.request_id, res?.message];
  for (const candidate of candidates) {
    if (looksLikeReqId(candidate)) return asText(candidate);
  }
  const message = asText(res?.message);
  if (message && !/\s/.test(message) && !looksLikeJwt(message)) return message;
  return "";
}

function pickAccessToken(res) {
  const candidates = [
    res?.["access-token"],
    res?.accessToken,
    res?.access_token,
    res?.token,
    res?.data?.["access-token"],
    res?.data?.accessToken,
    res?.data?.message,
    res?.message,
  ];
  for (const candidate of candidates) {
    if (looksLikeJwt(candidate)) return asText(candidate);
  }
  return "";
}

function friendlyMessage(res, fallback) {
  const message = asText(res?.message);
  if (!message || looksLikeJwt(message) || looksLikeReqId(message)) return fallback;
  if (/already verified/i.test(message)) {
    return "This code is already verified. Tap Verify Account. Resend will not send a new SMS.";
  }
  if (/auth/i.test(message)) {
    return "MSG91 rejected the widget token. Check the token in the app .env.";
  }
  return message;
}

async function msg91Post(path, body) {
  if (!MSG91_PHONE_OTP_ENABLED) {
    throw new Error("Add EXPO_PUBLIC_MSG91_AUTH_TOKEN to wemakeover-rn/.env, then restart Metro.");
  }

  let res;
  try {
    res = await fetch(`${MSG91_WIDGET}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        widgetId: MSG91_WIDGET_ID,
        tokenAuth: MSG91_AUTH_TOKEN,
        ...body,
      }),
    });
  } catch (err) {
    throw new Error(String(err?.message || "Could not reach MSG91"));
  }

  const data = await res.json().catch(() => null);
  if (!data) {
    throw new Error(`MSG91 returned HTTP ${res.status} with no JSON`);
  }
  return data;
}

export async function msg91SendOtp(tenDigits) {
  const res = await msg91Post("/sendOtpMobile", {
    identifier: indiaPhoneIdentifier(tenDigits),
  });

  const accessToken = pickAccessToken(res);
  if (accessToken && (res?.invisibleVerified === true || isSuccess(res))) {
    return { ok: true, alreadyVerified: true, accessToken };
  }

  const reqId = pickReqId(res);
  if (isSuccess(res) && reqId) {
    return { ok: true, reqId };
  }

  return { ok: false, message: friendlyMessage(res, "Failed to send code") };
}

export async function msg91VerifyOtp(reqId, otp) {
  const res = await msg91Post("/verifyOtp", {
    reqId,
    otp: String(otp || "").trim(),
  });
  const accessToken = pickAccessToken(res);
  if (accessToken) {
    return { ok: true, accessToken };
  }
  return { ok: false, message: friendlyMessage(res, "Wrong code entered") };
}

export async function msg91RetryOtp(reqId) {
  const res = await msg91Post("/retryOtp", { reqId });
  const nextReqId = pickReqId(res);
  if (isSuccess(res)) {
    return { ok: true, reqId: nextReqId || reqId };
  }
  if (/already verified/i.test(asText(res?.message))) {
    return {
      ok: false,
      message: "This code is already verified. Tap Verify Account. Resend will not send a new SMS.",
    };
  }
  return { ok: false, message: friendlyMessage(res, "Failed to resend code") };
}
