// src/utils/axiosInstance.js
import axios from "axios";
import { toast } from "react-toastify";

const baseURL = import.meta.env.VITE_API_BASE_URL;
const isElectron = import.meta.env.VITE_IS_ELECTRON === "true";

const axiosInstance = axios.create({
  baseURL,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      toast.error("Session expired, please login again.");

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      localStorage.setItem("shiftStatus", "close");

      if (isElectron) {
        window.location.hash = "#/login";
      } else {
        window.location.href = "/point-of-sale/login";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;