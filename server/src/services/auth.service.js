import { User } from "../models/user.model.js";

export const signup = async ({ name, email, phoneNumber, password, isVerified }) => {
  try {
    const payload = { name, password, email: email || null };
    if (phoneNumber) {
      payload.phoneNumber = phoneNumber;
    }
    if (isVerified) {
      payload.isVerified = true;
    }
    // Must return the persisted user (with id) so callers can attach referral data.
    const created = await User.create(payload);
    return created;
  } catch (error) {
    console.error("Error during signup:", error);
    throw error; // Propagate the error to be handled by the controller
  }
}


export const login = async (email) => {
  try {
    // Fetch user by email
    const user = await User.findOne({ email }).select("+password"); // include password
    return user;
  } catch (error) {
    console.error("Error during login:", error);
    throw error;
  }
};