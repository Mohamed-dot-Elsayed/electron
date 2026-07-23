import { Outlet } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full">
      <Outlet />


    </div>
  );
}
