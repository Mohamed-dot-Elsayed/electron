import axiosInstance from "@/Pages/utils/axiosInstance";
import { useState } from "react";

export function useDelete() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const deleteData = async (endpoint) => {
    setLoading(true);
    setError(null);

    // معالجة الرابط لتجنب // مكررة
    const url =
      baseUrl.endsWith("/") && endpoint.startsWith("/")
        ? baseUrl + endpoint.slice(1)
        : baseUrl + endpoint;

    try {
      const token = sessionStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axiosInstance.delete(url, { headers });

      setData(response.data);
      setLoading(false);

      return response.data;
    } catch (err) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Error occurred";
      setError(message);
      setLoading(false);
      throw err;
    }
  };

  return { data, loading, error, deleteData };
}
