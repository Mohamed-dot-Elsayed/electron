// src/utils/axiosInstance.js
import axios from "axios";
import { toast } from "react-toastify";

const baseURL = import.meta.env.VITE_API_BASE_URL;
const isElectron =
  import.meta.env.VITE_IS_ELECTRON === "true" ||
  import.meta.env.MODE === "electron" ||
  (typeof window !== "undefined" &&
    (window.location.protocol === "file:" || Boolean(window.electronAPI)));

const axiosInstance = axios.create({
  baseURL,
});

// ✅ Interceptor يرسل المنطقة الزمنية للمتصفح تلقائياً
axiosInstance.interceptors.request.use((config) => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      config.headers = config.headers || {};
      config.headers["x-timezone"] = tz;
    }
  } catch (e) {
    // Ignore if timezone resolution fails
  }
  return config;
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