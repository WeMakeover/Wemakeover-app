import http from "../../lib/http";

const base = "/city-requests";

/**
 * Submit a city request (public; optionalAuth on server).
 * payload: { requestedCity, requestedState?, name, email, phone, message? }
 */
export const submitCityRequest = (payload) => http.post(`${base}/`, payload);

/** Get suggested city/state from IP (for form pre-fill). */
export const getSuggestedCity = () => http.get(`${base}/suggest-city`);
