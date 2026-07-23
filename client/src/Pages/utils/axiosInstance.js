// src/utils/axiosInstance.js
import axios from "axios";
import { toast } from "react-toastify";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const axiosInstance = axios.create({
  baseURL,
});

// ✅ Interceptor بيراقب كل responses
axiosInstance.interceptors.response.use(
  (response) => response, // لو تمام نرجّع الـ response عادي
  (error) => {
    if (error.response && error.response.status === 401) {
      // Session انتهت أو التوكن invalid
      toast.error("Session expired, please login again.");

      // حذف بيانات الدخول
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      localStorage.setItem("shiftStatus", "close");

      // إعادة التوجيه إلى صفحة اللوجين
      window.location.href = "/point-of-sale/login";
    }

    // نرجع الخطأ للـ hooks عشان يتعاملوا معاه لو محتاجين
    return Promise.reject(error);
  }
);

export default axiosInstance;
