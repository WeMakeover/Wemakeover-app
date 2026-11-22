import axios from "axios";
import { BACKEND_URL as backendurl } from "../../config/env";

const categoriesApiInstance = axios.create({
  baseURL: `${backendurl}/categories`,
  timeout: 15000,
  headers: { "Content-Type": "application/json", "X-Client": "mobile" },
});

categoriesApiInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMessage =
      error.response?.data?.message || "An error occurred while fetching categories";
    return Promise.reject(new Error(errorMessage));
  }
);

export const categoriesApi = {
  getAllCategories: () => categoriesApiInstance.get("/"),
  getCategoryById: (categoryId) => categoriesApiInstance.get(`/${categoryId}`),
  getCategoryServices: (categoryId) => categoriesApiInstance.get(`/${categoryId}/services`),
};
