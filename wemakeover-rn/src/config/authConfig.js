/**
 * Account phone verification uses MSG91. Register uses the same SMS OTP.
 */
export const SMS_OTP_ENABLED = false;

/** Backend currently issues 6-digit codes (Figma shows a 4-digit example in the input). */
export const OTP_LENGTH = 6;

/** Countdown shown in Figma: "Resend code in 00:59" */
export const OTP_RESEND_SECONDS = 59;

/** Phone-update sheet uses a 4-digit code (Figma). */
export const PHONE_UPDATE_OTP_LENGTH = 4;
