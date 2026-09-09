import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Loading from "@/components/Loading";
import { useSelector } from "react-redux";
import ShiftStatusModal from "@/components/ShiftStatusModal";

export default function MainLayouts() {
  const location = useLocation();
  const navigate = useNavigate();
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

  return (
    <SidebarProvider className="min-h-0 h-full">
      <main className="w-full h-full">
        <div className="flex flex-col h-full md:!ps-2 sm:!p-0 md:max-w-auto sm:w-full">
          {/* تطبيق شرط إخفاء الـ Navbar */}
          {!shouldHideNavbar && <Navbar className="!p-2" />}

          <div className="relative flex-1 min-h-0 overflow-y-auto p-4">
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
        />
      </main>
    </SidebarProvider>
  );
}
