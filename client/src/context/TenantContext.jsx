import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const TenantContext = createContext(null);

export const useTenantInfo = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenantInfo must be used within a TenantProvider");
  }
  return context;
};

export const TenantProvider = ({ children }) => {
  const [features, setFeatures] = useState({
    haveEcommerce: true,
    haveMobileApp: false,
    havePOS: false,
    haveReports: false,
    haveStockTake: false,
  });
  const [packageInfo, setPackageInfo] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTenantInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://bcknd.systego.net/";
      const cleanBase = baseUrl.replace(/\/+$/, "");
      const res = await axios.get(`${cleanBase}/api/admin/tenant-info`, {
        headers,
      });

      const payload = res.data?.data || res.data;

      if (payload) {
        if (payload.features) {
          setFeatures({
            haveEcommerce: Boolean(payload.features.haveEcommerce),
            haveMobileApp: Boolean(payload.features.haveMobileApp),
            havePOS: Boolean(payload.features.havePOS),
            haveReports: Boolean(payload.features.haveReports),
            haveStockTake: Boolean(payload.features.haveStockTake),
          });
        }
        if (payload.package) {
          setPackageInfo(payload.package);
        }
        if (payload.tenant) {
          setTenant(payload.tenant);
        }
      }
    } catch (err) {
      console.error("Failed to fetch tenant info in POS:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTenantInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://bcknd.systego.net/";
      const cleanBase = baseUrl.replace(/\/+$/, "");
      const res = await axios.post(`${cleanBase}/api/admin/tenant-info/refresh`, {}, {
        headers,
      });

      const payload = res.data?.data || res.data;

      if (payload) {
        if (payload.features) {
          setFeatures({
            haveEcommerce: Boolean(payload.features.haveEcommerce),
            haveMobileApp: Boolean(payload.features.haveMobileApp),
            havePOS: Boolean(payload.features.havePOS),
            haveReports: Boolean(payload.features.haveReports),
            haveStockTake: Boolean(payload.features.haveStockTake),
          });
        }
        if (payload.package) {
          setPackageInfo(payload.package);
        }
        if (payload.tenant) {
          setTenant(payload.tenant);
        }
      }
      return payload;
    } catch (err) {
      console.error("Failed to refresh tenant info in POS:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenantInfo();
  }, [fetchTenantInfo]);

  return (
    <TenantContext.Provider
      value={{
        features,
        packageInfo,
        tenant,
        loading,
        error,
        refetch: fetchTenantInfo,
        refresh: refreshTenantInfo,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};
