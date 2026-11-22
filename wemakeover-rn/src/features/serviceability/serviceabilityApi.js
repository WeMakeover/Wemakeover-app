import { BACKEND_URL as backendurl } from "../../config/env";

const jsonHeaders = { "Content-Type": "application/json", "X-Client": "mobile" };

export const getServiceableCities = async () => {
  const response = await fetch(`${backendurl}/bookings/serviceable-cities`, {
    method: "GET",
    headers: jsonHeaders,
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const checkCityServiceability = async (city) => {
  const response = await fetch(`${backendurl}/bookings/check-serviceability`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ city }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const checkLocationServiceability = async (city, pincode) => {
  const response = await fetch(`${backendurl}/bookings/check-location-serviceability`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ city, pincode }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};
