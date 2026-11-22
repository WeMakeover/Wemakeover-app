import http from "../../lib/http";

const base = "/addresses";

export const getUserAddresses = () => http.get(`${base}/`);
export const getAddressById = (addressId) => http.get(`${base}/${addressId}`);
export const getDefaultAddress = () => http.get(`${base}/default`);
export const createAddress = (addressData) => http.post(`${base}/`, addressData);
export const updateAddress = (addressId, addressData) => http.put(`${base}/${addressId}`, addressData);
export const deleteAddress = (addressId) => http.delete(`${base}/${addressId}`);
export const setDefaultAddress = (addressId) => http.patch(`${base}/${addressId}/default`);
export const getAddressStats = () => http.get(`${base}/stats`);
export const restoreAddress = (addressId) => http.post(`${base}/${addressId}/restore`);
export const permanentlyDeleteAddress = (addressId) => http.delete(`${base}/${addressId}/permanent`);
export const checkAddressStatus = () => http.get(`${base}/debug`);
