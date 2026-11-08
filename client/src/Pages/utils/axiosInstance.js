// src/utils/axiosInstance.js
import axios from "axios";
import { toast } from "react-toastify";

const isElectron =
  import.meta.env.VITE_IS_ELECTRON === "true" ||
  import.meta.env.MODE === "electron" ||
  (typeof window !== "undefined" &&
    (window.location.protocol === "file:" || Boolean(window.electronAPI)));

const baseURL = import.meta.env.VITE_API_BASE_URL;

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
  } catch {
    // Ignore if timezone resolution fails
  }
  return config;
});

// ═══════════════════════════════════════════════════════════════════
// Permission errors are NOT expired sessions.
// The backend now replies 403 + structured details for missing
// permissions. Old deployments still reply 401 with a message such as
// "No permission to Add in POS", so we detect that message too and
// never force a logout for it.
// ═══════════════════════════════════════════════════════════════════

const PERMISSION_MESSAGE_PATTERNS = [
  /^No permission to (.+) in (.+)$/i,
  /^No access to (.+?) module$/i,
];

const parsePermissionFromMessage = (message) => {
  const text = String(message || "").trim();

  for (const pattern of PERMISSION_MESSAGE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        module: match[2].trim(),
        actions: match[1]
          .split(/\s+or\s+/i)
          .map((action) => action.trim())
          .filter(Boolean),
      };
    }
  }

  return null;
};

const getPermissionInfo = (error) => {
  const status = error?.response?.status;
  const data = error?.response?.data || {};
  const details = data?.error?.details;
  const message = data?.error?.message || data?.message || "";

  // New backend: 403 + { code: "PERMISSION_DENIED", module, required_actions }
  if (details?.code === "PERMISSION_DENIED") {
    return {
      module: Array.isArray(details.modules)
        ? details.modules.join(" / ")
        : details.module,
      actions: details.required_actions || [],
      granted: details.granted_actions,
    };
  }

  // Old backend: 401 with the permission message (backward compatibility)
  if (status === 401 || status === 403) {
    const parsed = parsePermissionFromMessage(message);
    if (parsed) return parsed;
  }

  return null;
};

const recentPermissionToasts = new Map();

const showPermissionToast = (info) => {
  const moduleName = info.module || "unknown";
  const actions = (Array.isArray(info.actions) ? info.actions : [info.actions])
    .filter(Boolean)
    .join(" / ") || "unknown";

  let grantedText = "";
  if (Array.isArray(info.granted)) {
    grantedText = ` (currently granted: ${
      info.granted.length ? info.granted.join(", ") : "none"
    })`;
  }

  const message = `Missing permission: "${actions}" on "${moduleName}"${grantedText}. Ask your admin to add it to your role.`;

  // Avoid a wall of identical toasts when several requests fail together
  const now = Date.now();
  const lastShownAt = recentPermissionToasts.get(message) || 0;
  if (now - lastShownAt < 4000) return;
  recentPermissionToasts.set(message, now);
  toast.error(message);
};

// ✅ Interceptor بيراقب كل responses
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const permissionInfo = getPermissionInfo(error);

    if (permissionInfo) {
      // Don't log the user out — just tell him what is missing
      error.isPermissionError = true;
      error.permission = permissionInfo;
      showPermissionToast(permissionInfo);
      return Promise.reject(error);
    }

    const isLoginRequest = String(error?.config?.url || "").includes(
      "/auth/login"
    );

    if (status === 401 && !isLoginRequest) {
      // Session انتهت أو التوكن invalid
      toast.error("Session expired, please login again.");

      // حذف بيانات الدخول
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      localStorage.setItem("shiftStatus", "close");

      // إعادة التوجيه إلى صفحة اللوجين
      if (isElectron) {
        window.location.hash = "#/login";
      } else {
        window.location.href = "/point-of-sale/login";
      }
    }

    // نرجع الخطأ للـ hooks عشان يتعاملوا معاه لو محتاجين
    return Promise.reject(error);
  }
);

export default axiosInstance;