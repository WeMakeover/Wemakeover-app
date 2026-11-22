import ContactMessage from '../models/contactMessage.model.js';
import { sendContactUsMail, sendEmailVerification } from '../services/email.service.js';
import { generateOtp } from '../services/otp.service.js';
import { deleteCache, getCache, setCache } from '../uitils/redis/redis.utils.js';

const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const getContactOtpCacheKey = (email) => `contact-otp:${normalizeEmail(email)}`;

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

export const requestContactOtp = async (req, res) => {
  try {
    const { name, email } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const trimmedName = typeof name === 'string' ? name.trim() : '';

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    const otp = generateOtp();
    await setCache(getContactOtpCacheKey(normalizedEmail), otp, 300);

    await sendEmailVerification(
      normalizedEmail,
      'Contact Us - Email Verification',
      {
        username: trimmedName,
        appName: process.env.APP_NAME || 'Wemakeover',
        otp,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email. Please check your inbox.',
    });
  } catch (error) {
    console.error('Error sending contact OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send verification code. Please try again later.',
    });
  }
};

export const submitContactMessage = async (req, res) => {
  try {
    const { name, email, phoneNumber, message, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    const trimmedOtp = String(otp ?? '').trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    if (!trimmedMessage) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty',
      });
    }

    if (!trimmedOtp) {
      return res.status(400).json({
        success: false,
        message: 'Email verification code is required',
      });
    }

    const cachedOtp = await getCache(getContactOtpCacheKey(normalizedEmail));

    if (!cachedOtp) {
      return res.status(400).json({
        success: false,
        message: 'Verification code expired. Please request a new code.',
      });
    }

    if (String(cachedOtp) !== trimmedOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code',
      });
    }

    await deleteCache(getContactOtpCacheKey(normalizedEmail));

    await sendContactUsMail({
      name: trimmedName,
      email: normalizedEmail,
      message: trimmedMessage,
    });

    const newMessage = await ContactMessage.create({
      name: trimmedName,
      email: normalizedEmail,
      phoneNumber: phoneNumber?.trim() || undefined,
      message: trimmedMessage,
    });

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent to the admin!',
      data: newMessage,
    });
  } catch (error) {
    console.error('Error saving contact message:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send your message, please try again later.',
    });
  }
};
