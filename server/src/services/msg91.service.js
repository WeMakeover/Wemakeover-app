const MSG91_VERIFY_URL =
  "https://control.msg91.com/api/v5/widget/verifyAccessToken";

export function digitsFromIdentifier(identifier) {
  const digits = String(identifier || "").replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("91")) {
    return digits.slice(-10);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

export async function verifyMsg91AccessToken(accessToken) {
  const token = String(accessToken || "").trim();
  if (!token) {
    const err = new Error("Verification failed");
    err.status = 400;
    throw err;
  }

  const authkey = String(process.env.MSG91_AUTH_KEY || "").trim();
  if (!authkey) {
    const err = new Error("MSG91 account auth key is missing on the server");
    err.status = 500;
    throw err;
  }

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    authkey,
  };

  const attempt = async (body) => {
    const res = await fetch(MSG91_VERIFY_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { res, data };
  };

  // MSG91 documents authkey + access-token in the body. A second shape
  // (token only) is tried when the first response is an auth rejection.
  let { res, data } = await attempt({
    authkey,
    "access-token": token,
  });
  const firstDetail = String(data?.message || "");
  if (/auth/i.test(firstDetail)) {
    const second = await attempt({ "access-token": token });
    const secondDetail = String(second.data?.message || "");
    if (!/auth/i.test(secondDetail)) {
      res = second.res;
      data = second.data;
    }
  }

  const type = String(data?.type || "").toLowerCase();
  const failed = !res.ok || !data || type === "error" || data?.hasError === true;

  if (failed) {
    const detail = String(data?.message || "").trim();
    const safeDetail =
      /auth/i.test(detail)
        ? "MSG91 rejected the server auth key. In Authkey, whitelist the newest Recent IP for the key selected on this OTP widget, then tap Verify Account. This code is already verified, so Resend will not send a new SMS."
        : detail && detail.length < 140 && detail.split(".").length < 3
          ? detail
          : "Could not confirm the code";
    console.warn("MSG91 verifyAccessToken failed", {
      httpStatus: res.status,
      type: data?.type || null,
      code: data?.code ?? null,
      message: safeDetail,
    });
    const err = new Error(safeDetail);
    err.status = 400;
    throw err;
  }

  const identifier = data.message || data.identifier || "";
  const digits = digitsFromIdentifier(identifier);
  if (!/^[6-9]\d{9}$/.test(digits)) {
    const err = new Error("Verified number is invalid");
    err.status = 400;
    throw err;
  }

  return digits;
}
