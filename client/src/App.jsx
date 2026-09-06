import React, { useState, useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import "./firebase";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import TitleBar from "./components/TitleBar";
import InitialSetupOverlay from "./components/InitialSetupOverlay";
import { io } from "socket.io-client";

function App() {
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapData, setBootstrapData] = useState(null);

  useEffect(() => {
    const handleEnter = (e) => {
      if (e.key === "Enter") {
        const defaultBtn = document.querySelector("[data-enter]");
        if (defaultBtn) defaultBtn.click();
      }
    };
    window.addEventListener("keydown", handleEnter);
    return () => window.removeEventListener("keydown", handleEnter);
  }, []);

  useEffect(() => {
    const socket = io("http://localhost:3001");

    socket.on("sync-progress", (data) => {
      if (data.type === "bootstrap") {
        setIsBootstrapping(true);
        setBootstrapData(data);

        if (data.status === "completed") {
          setTimeout(() => {
            setIsBootstrapping(false);
          }, 1200);
        }
      }
    });

    fetch("http://localhost:3001/api/sync/bootstrap-status")
      .then((res) => res.json())
      .then((data) => {
        if (data.needed) {
          setIsBootstrapping(true);
        }
      })
      .catch((err) => console.error("Error checking bootstrap status:", err));

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="app">
      {isBootstrapping && (
        <InitialSetupOverlay
          progressData={bootstrapData}
          onDismiss={() => setIsBootstrapping(false)}
        />
      )}

      <TitleBar />
      <main className="content">
        <RouterProvider router={router} />
      </main>
    </div>
  );
}

export default App;
