import axiosInstance from "@/Pages/utils/axiosInstance";
import { useState } from "react";

export function usePut() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const executeRequest = async (method, endpoint, body, options = {}) => {
    setLoading(true);
    setError(null);

    // معالجة الرابط لتجنب // مكررة
    const url =
      baseUrl.endsWith('/') && endpoint.startsWith('/')
        ? baseUrl + endpoint.slice(1)
        : baseUrl + endpoint;

    try {
      const token = sessionStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const httpMethod = (options.method || method || "put").toLowerCase();
      const response = await axiosInstance[httpMethod](url, body, { headers });
      setData(response.data);

      setLoading(false);

      // إعادة تحميل الصفحة إذا كان الـ endpoint خاص بحالة الطاولة
      if (endpoint.includes('tables_status') && options.reloadPage !== false) {
        setTimeout(() => {
          window.location.reload();
        }, 1000); // انتظار ثانية واحدة لإظهار رسالة النجاح
      }

      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Error occurred";
      setError(message);
      setLoading(false);
      throw err;
    }
  };

  const putData = (endpoint, body, options = {}) => executeRequest("put", endpoint, body, options);
  const patchData = (endpoint, body, options = {}) => executeRequest("patch", endpoint, body, options);

  return { data, loading, error, putData, patchData };
}