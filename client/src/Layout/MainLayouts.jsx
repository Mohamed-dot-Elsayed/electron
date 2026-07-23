import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Loading from "@/components/Loading";
import { useSelector } from "react-redux";

export default function MainLayouts() {
  const location = useLocation();
  const isLoading = useSelector((state) => state.loader.isLoading);

  // 1. استخدام URLSearchParams لقراءة الـ query params (مثل ?action=open)
  const queryParams = new URLSearchParams(location.search);
  const action = queryParams.get("action");

  // 2. تحديد الشروط لإخفاء الـ Navbar
  const isLoginPage = location.pathname === "/login";
  const isCashierPage = location.pathname === "/cashier";
  const isShiftOpenPage = location.pathname === "/shift" && action === "open";

  // تجميع الشروط: إذا تحقق أي شرط منها سيتم إخفاء الـ Navbar
  const shouldHideNavbar = isLoginPage || isCashierPage || isShiftOpenPage;

  return (
    <SidebarProvider>
      <main className="w-full">
        <div className="flex flex-col min-h-screen md:!ps-2 sm:!p-0 md:max-w-auto sm:w-full">

          {/* 3. تطبيق الشرط هنا */}
          {!shouldHideNavbar && <Navbar className="!p-2" />}

          <div className="relative flex-1 p-4">
            {isLoading && <Loading />}
            <Outlet />
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}
