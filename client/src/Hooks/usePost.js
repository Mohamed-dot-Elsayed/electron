import axiosInstance from "@/Pages/utils/axiosInstance";
import { useState } from "react";

export function usePost() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const token = sessionStorage.getItem("token");
  const postData = async (endpoint, body) => {
    // <-- endpoint هنا
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post(`${baseUrl}${endpoint}`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      setData(response.data);

      setLoading(false);

      return response.data;
    } catch (err) {
      const message =
        err?.response?.data?.faield ||
        err.response?.error?.message ||
        "error occurred ";

      setError(message);
      setLoading(false);
      throw err;
    }
  };

  return { data, loading, error, postData };
}
