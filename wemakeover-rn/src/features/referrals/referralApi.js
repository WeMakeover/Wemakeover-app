import http from "../../lib/http";

/**
 * Referral endpoints (Register + Refer & Earn).
 */

export const validateReferralCodeApi = async (code) => {
  const trimmed = typeof code === "string" ? code.trim() : "";
  if (!trimmed) {
    return { valid: false, message: "Referral code is required" };
  }

  try {
    const data = await http.get("/referrals/validate", {
      params: { code: trimmed },
    });
    return {
      valid: true,
      message: data?.message || "Referral code applied successfully",
      referrerName: data?.data?.referrerName || null,
      referralCode: data?.data?.referralCode || trimmed.toUpperCase(),
    };
  } catch (error) {
    return {
      valid: false,
      message: error?.message || "Invalid referral code",
    };
  }
};

export const getMyReferralApi = async () => {
  const data = await http.get("/referrals/me");
  if (!data?.success) {
    throw new Error(data?.message || "Failed to load referral profile");
  }
  return data.data;
};

export const claimMilestoneBonusApi = async () => {
  const data = await http.post("/referrals/milestones/bonus/claim");
  return data;
};

export const claimMilestoneFacialApi = async () => {
  const data = await http.post("/referrals/milestones/facial/claim");
  return data;
};

export default {
  validateReferralCodeApi,
  getMyReferralApi,
  claimMilestoneBonusApi,
  claimMilestoneFacialApi,
};
