// App.jsx
import React, { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import "./firebase"; 
import "react-toastify/dist/ReactToastify.css";

function App() {
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
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
