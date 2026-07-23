// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { Provider } from "react-redux";
import { store } from "./Store/store.js";
import { ShiftProvider } from "./context/ShiftContext.jsx";
import { ToastContainer } from "react-toastify";
import "./i18n";
// === React Query ===
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// إنشاء QueryClient (يمكنك تخصيص الإعدادات هنا)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 دقائق افتراضيًا
      cacheTime: 30 * 60 * 1000, // 30 دقيقة
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

// === Service Worker ===
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}/firebase-messaging-sw.js`)
    .then((registration) => {
      console.log("Service Worker registered with scope:", registration.scope);
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
}


// === Render ===
ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <ShiftProvider>
      <QueryClientProvider client={queryClient}>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <App />
        {/* أداة تطوير React Query (اختيارية - تُظهر في وضع التطوير فقط) */}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ShiftProvider>
  </Provider>
);