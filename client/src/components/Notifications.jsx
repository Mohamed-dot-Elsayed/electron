// src/components/Notifications.jsx
import { useEffect, useState } from "react";
import { messaging } from "../firebase";
import { onMessage } from "firebase/messaging";
import { IoNotificationsOutline } from "react-icons/io5"; // أيقونة
import { useTranslation } from "react-i18next";

export default function Notifications({ className }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // استماع للإشعارات في foreground
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Foreground message:", payload);
      const newNotification = {
        id: Date.now(),
        title: payload.notification?.title || t("New Notification"),
        body: payload.notification?.body || "",
      };
      setNotifications((prev) => [newNotification, ...prev]);
    });

    return () => unsubscribe();
  }, [t]);

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  return (
    <div className={`relative ${className || ""}`}>
      {/* أيقونة الإشعارات */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-600 hover:text-bg-primary"
      >
        <IoNotificationsOutline className="text-2xl" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-purple-600 rounded-full">
            {notifications.length}
          </span>
        )}
      </button>

      {/* قائمة الإشعارات */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white shadow-lg border border-gray-200 rounded-md z-50">
          <div className="p-2 border-b border-gray-100 font-semibold text-gray-700">
            {t("Notifications")}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-3 text-gray-500">{t("NoNotifications")}</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="font-medium text-gray-800">{notif.title}</div>
                  <div className="text-sm text-gray-600">{notif.body}</div>
                </div>
              ))
            )}
          </div>
          <div className="p-2 text-center border-t border-gray-100">
            <button
              onClick={() => setNotifications([])}
              className="text-sm text-purple-600 hover:underline"
            >
              {t("ClearAll")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
