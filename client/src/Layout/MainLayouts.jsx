import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Loading from "@/components/Loading";
import { useSelector } from "react-redux";
import ShiftStatusModal from "@/components/ShiftStatusModal";
import { useTenantInfo } from "@/context/TenantContext";
import PosLockedScreen from "@/components/PosLockedScreen";

export default function MainLayouts() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoading = useSelector((state) => state.loader.isLoading);
  const { features, loading: tenantLoading } = useTenantInfo();

  // إذا لم يكن مسجل دخول، يتم توجيهه إلى /login مباشرة
  const user = sessionStorage.getItem("user");
  const token = sessionStorage.getItem("token");
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // 1. استخدام URLSearchParams لقراءة الـ query params (مثل ?action=open)
  const queryParams = new URLSearchParams(location.search);
  const action = queryParams.get("action");

  // 2. تحديد الشروط لإخفاء الـ Navbar
  const isLoginPage = location.pathname === "/login";
  const isCashierPage = location.pathname === "/cashier";
  const isShiftOpenPage = location.pathname === "/shift" && action === "open";

  // تجميع الشروط: إذا تحقق أي شرط منها سيتم إخفاء الـ Navbar
  const shouldHideNavbar = isLoginPage || isCashierPage || isShiftOpenPage;

  // 3. قراءة حالة المودال من location.state
  const modalState = location.state;
  const showStarted = !!modalState?.showShiftStartedModal;
  const showWelcome = !!modalState?.showWelcomeBackModal;
  const isModalOpen = showStarted || showWelcome;
  const modalMode = showWelcome ? "welcome_back" : "started";
  const cashierName =
    modalState?.cashierName || sessionStorage.getItem("cashier_name") || "";
  const shiftStartTime =
    modalState?.shiftStartTime || sessionStorage.getItem("shift_start_time");

  const handleModalClose = () => {
    // مسح الـ state حتى لا يظهر المودال مجدداً عند عمل Refresh
    navigate(location.pathname, { replace: true, state: {} });
  };

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loading />
      </div>
    );
  }

  if (!tenantLoading && !features?.havePOS) {
    return <PosLockedScreen />;
  }

  return (
    <SidebarProvider>
      <main className="w-full">
        <div className="flex flex-col min-h-screen md:!ps-2 sm:!p-0 md:max-w-auto sm:w-full">
          {/* تطبيق شرط إخفاء الـ Navbar */}
          {!shouldHideNavbar && <Navbar className="!p-2" />}

          <div className="relative flex-1 p-4">
            {isLoading && <Loading />}
            <Outlet />
          </div>
        </div>

        {/* Modal for Shift Started or Welcome Back */}
        <ShiftStatusModal
          isOpen={isModalOpen}
          mode={modalMode}
          cashierName={cashierName}
          startTime={shiftStartTime}
          onConfirm={handleModalClose}
          autoCloseSeconds={3}
        />
      </main>
    </SidebarProvider>
  );
}
