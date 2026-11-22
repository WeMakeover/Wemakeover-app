import axios from "axios";
import { BACKEND_URL as backendurl } from "../../config/env";

const servicesApiInstance = axios.create({
  baseURL: `${backendurl}/services`,
  timeout: 15000,
  headers: { "Content-Type": "application/json", "X-Client": "mobile" },
});

servicesApiInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMessage =
      error.response?.data?.message || "An error occurred while fetching services";
    return Promise.reject(new Error(errorMessage));
  }
);

export const servicesApi = {
  getAllServices: (params = {}) => servicesApiInstance.get("/", { params }),
  getPopularServices: (params = {}) => servicesApiInstance.get("/popular", { params }),
  getServicesByCategory: (category) => servicesApiInstance.get(`/category/${category}`),
  getServiceById: (serviceId) => servicesApiInstance.get(`/${serviceId}`),
};
