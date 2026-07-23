import React, { useState, useEffect } from "react";
import { Home, ArrowLeft, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { useNavigate } from "react-router-dom";
const NotFoundPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate(); // 👈 Initialize the hook

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Logo */}
          <div
            className={`transition-opacity duration-1000 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="inline-flex items-center space-x-3 mb-12">
              <img src={logo} alt="logo" />
            </div>
          </div>

          {/* 404 Number */}
          <div
            className={`transition-all duration-1200 delay-200 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            <h1 className="text-6xl font-light text-gray-800 mb-6">404</h1>
          </div>

          {/* Message */}
          <div
            className={`transition-all duration-1000 delay-400 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            <h2 className="text-2xl font-light text-gray-600 mb-4">
              Page not found
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              The page you are looking for doesn't exist or has been moved.
            </p>
          </div>

          {/* Buttons */}
          <div
            className={`transition-all duration-1000 delay-600 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            <div className="space-y-3">
              <button
                onClick={() => navigate("/")}
                className="w-full bg-secondary text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-600 transition-colors duration-200"
              >
                <div className="flex items-center justify-center space-x-2">
                  <Home className="w-4 h-4" />
                  <span>Go Home</span>
                </div>
              </button>

              <button
                onClick={() => navigate(-1)}
                className="w-full bg-white text-gray-600 py-3 px-6 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center justify-center space-x-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Go Back</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
