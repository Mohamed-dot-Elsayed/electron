// Navbar.js - النسخة الكاملة المحدثة والنهائية مع Combobox
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePut } from "@/Hooks/usePut";
import { useShift } from "@/context/ShiftContext";
import { toast } from "react-toastify";
import {
  User,
  Settings,
  ListOrdered,
  Users,
  DollarSign,
  LogOut,
  XCircle,
  Languages,
  Menu,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
// Shadcn UI components for Tabs
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Shadcn UI components for Combobox (Searchable Select)
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils"; // يُفترض وجود هذا الملف لدمج الـ utility classes
import { Check, ChevronsUpDown } from "lucide-react"; // أيقونات
// -------------------------------------------------------------------
import axios from "axios";
import { usePost } from "@/Hooks/usePost";
// المودالز الجديدة
import ExpensesModal from "@/Pages/ExpensesModal";
import PasswordConfirmModal from "@/Pages/PasswordConfirmModal";
import EndShiftReportModal from "@/Pages/ReportsAfterShift";
import Notifications from "@/components/Notifications";
import { useGet } from "@/Hooks/useGet";
import { usePosSelections } from "@/Hooks/usePosSelections";
import AddCustomer from "@/Pages/Customer/AddCustomer";
import logo from "@/assets/logo.png";
import { FaListAlt, FaUsers } from "react-icons/fa";

// ===============================================
// 🚀 المكون الجديد: Combobox للبحث في العملاء (مُخصص)
// ===============================================

function CustomerSearchCombobox({ customers, selectedCustomer, onSelect, t }) {
  const [open, setOpen] = useState(false);

  const selectedCustomerObj = customers.find(
    (customer) => customer._id === selectedCustomer
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full max-w-[130px] sm:max-w-[220px] justify-between h-auto py-1 px-3 text-xs sm:text-sm"
        >
          {selectedCustomerObj
            ? `${selectedCustomerObj.name}${selectedCustomerObj.phone_number
              ? ` (${selectedCustomerObj.phone_number})`
              : ""
            }`
            : t("Select Customer")}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[260px] p-0">
        <Command
          filter={(value, search) => {
            if (!search) return 1;
            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={t("Search by name or phone")} />
          <CommandList>
            <CommandEmpty>{t("No customer found")}</CommandEmpty>

            <CommandGroup className="max-h-[200px] overflow-y-auto">
              {customers.map((customer) => (
                <CommandItem
                  key={customer._id}
                  value={`${customer.name} ${customer.phone_number || ""}`}
                  onSelect={() => {
                    onSelect(customer._id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCustomer === customer._id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{customer.name}</span>
                    {customer.phone_number && (
                      <span className="text-xs text-gray-500">
                        {customer.phone_number}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}



// ===============================================
// 🏠 المكون الرئيسي: Navbar
// ===============================================

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isShiftOpen, shiftStartTime, closeShift } = useShift();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "en"
  );
  const [loading, setLoading] = useState(false);

  // حالات المودالز الجديدة
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [endShiftReport, setEndShiftReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const { postData } = usePost();
  const { putData } = usePut();
  const currentTab = sessionStorage.getItem("tab") || "take_away";
  const isArabic = i18n.language === "ar";

  // ✅ جلب العملاء من الـ endpoint المخصص
  const { customers } = usePosSelections();

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(
    sessionStorage.getItem("selected_customer_id") || ""
  );

  useEffect(() => {
    if (isShiftOpen) {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [isShiftOpen]);

  const toggleLanguage = () => {
    const newLang = language === "en" ? "ar" : "en";
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const formatElapsedTime = () => {
    const start = shiftStartTime || sessionStorage.getItem("shift_start_time");
    if (!start) return "00:00:00";
    const elapsed = Math.floor((currentTime - new Date(start)) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleTabChange = (value) => {
    sessionStorage.setItem("tab", value);
    sessionStorage.setItem("order_type", value);

    if (value === "take_away") {
      sessionStorage.removeItem("table_id");
      sessionStorage.removeItem("delivery_user_id");
      navigate("/", { replace: true });
    } else if (value === "dine_in") {
      sessionStorage.removeItem("delivery_user_id");
      navigate("/", { replace: true });
    } else if (value === "delivery") {
      sessionStorage.removeItem("table_id");
      navigate("/", { replace: true });
    } else if (value === "online-order") {
      navigate("/online-orders", { replace: true });
    } else if (value === "return") {
      navigate("/return-sale", { replace: true }); // الصفحة الجديدة
    }
  };

  const handleDueUsers = () => navigate("/due");
  const handleAllOrders = () => navigate("/all-orders");
  const handleExpenses = () => setShowExpensesModal(true);

  // ===== إغلاق الشيفت بكل الخطوات =====
  const handleCloseShift = () => {
    if (!isShiftOpen) {
      toast.error(t("No active shift found"));
      return;
    }
    setShowPasswordModal(true);
  };

  const handlePasswordConfirmed = async (password) => {
    setShowPasswordModal(false);
    setReportLoading(true);

    try {
      const token = sessionStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      // API واحدة بتعمل كل حاجة: تحقق الباسورد + تجيب التقرير
      const response = await axios.put(
        `${baseUrl}api/cashier-shift/end/report/`,
        { password },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );


      // الـ API دي لازم ترجع التقرير جاهز
      setEndShiftReport(response.data);
      setShowReportModal(true);
    } catch (err) {
      const msg = err.response?.data?.message || t("Invalid password or error occurred");
      toast.error(msg);
    } finally {
      setReportLoading(false);
    }
  };

  const handleClose = async () => {
    try {
      const cashierIdForClose = sessionStorage.getItem("cashier_id");
      const endpoint = `api/cashier-shift/end/${cashierIdForClose}`;
      await putData(endpoint, {});

      closeShift();
      sessionStorage.removeItem("shift_start_time");
      sessionStorage.removeItem("shift_data");
      sessionStorage.clear();

      toast.success(t("ShiftClosedSuccessfully"));
      navigate("/login");
    } catch (err) {
      console.error("Close shift error:", err);
      toast.error(err?.response?.data?.message || t("FailedToCloseShift"));
    }
  };




  const handleLogout = async () => {
    try {
      await postData("api/cashier-shift/logout", {});
      sessionStorage.clear();
      toast.success(t("Logged out successfully"));
      navigate("/login");
    } catch (err) {
      toast.error(err?.message || t("Error while logging out"));
    }
  };

  // 🛑 تم حذف دالة CustomerModal المكررة لأنك تستخدم AddCustomer المستورد

  return (
    <>
      {/* الحاوية الرئيسية للخلفية الرمادية الباهتة */}
      <div className="w-full shadow-md px-2 py-3 sm:px-4 sm:py-5 md:px-6 z-50 border-b border-gray-100">
        <div className="flex items-center justify-between gap-1.5 sm:gap-4 max-w-[1920px] mx-auto">

          {/* --- الجزء الأيسر: الأزرار والعملاء --- */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-400 hover:text-gray-600 transition-all flex-shrink-0"
            >
              <span className="text-2xl">←</span>
            </button>

            {/* --- أزرار التنقل (مخفية في الشاشات الصغيرة جداً وداخل قائمة منسدلة) --- */}
            <div className="hidden sm:flex bg-white p-1.5 rounded-[28px] border border-gray-100 shadow-sm items-center gap-2 overflow-x-auto max-w-[150px] sm:max-w-none no-scrollbar">
              <Tabs value={currentTab} onValueChange={handleTabChange}>
                <TabsList className="bg-transparent h-auto gap-2 p-0">
                  <TabsTrigger
                    value="take_away"
                    className="flex flex-col items-center justify-center w-[110px] py-3 rounded-[22px] border border-transparent data-[state=active]:bg-[#7b61ff] data-[state=active]:text-white text-gray-400 transition-all duration-300"
                  >
                    <div className="w-8 h-8 rounded-full border border-current flex items-center justify-center mb-1 opacity-80">
                      <FaListAlt className="text-sm" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t("POS")}</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="online-order"
                    className="flex flex-col items-center justify-center w-[110px] py-3 rounded-[22px] border border-gray-50 bg-white text-gray-400 data-[state=active]:bg-[#7b61ff] data-[state=active]:text-white transition-all shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-full border border-current flex items-center justify-center mb-1 opacity-80">
                      <FaUsers className="text-sm" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t("OnlineOrders")}</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="return"
                    className="flex flex-col items-center justify-center w-[110px] py-3 rounded-[22px] border border-gray-50 bg-white text-gray-400 data-[state=active]:bg-[#7b61ff] data-[state=active]:text-white transition-all shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-full border border-current flex items-center justify-center mb-1 opacity-80">

                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t("Return")}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* --- Hamburger Menu للموبايل --- */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-600 hover:text-[#7b61ff] transition-all">
                    <Menu size={24} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-white rounded-xl shadow-xl border-gray-100 p-2">
                  <DropdownMenuItem onClick={() => handleTabChange("take_away")} className={`flex px-3 py-3 rounded-lg cursor-pointer ${currentTab === "take_away" ? "bg-[#7b61ff] text-white font-bold" : "hover:bg-gray-50 text-gray-700"}`}>
                    {t("take_away")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTabChange("online-order")} className={`flex px-3 py-3 rounded-lg cursor-pointer ${currentTab === "online-order" ? "bg-[#7b61ff] text-white font-bold" : "hover:bg-gray-50 text-gray-700"}`}>
                    {t("OnlineOrders")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTabChange("return")} className={`flex px-3 py-3 rounded-lg cursor-pointer ${currentTab === "return" ? "bg-[#7b61ff] text-white font-bold" : "hover:bg-gray-50 text-gray-700"}`}>
                    {t("Return")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* --- الجزء الأوسط: اللوجو والفاصل --- */}
          <div className="hidden md:flex items-center gap-6">
            <div className="h-10 w-[1.5px] bg-gray-200 hidden lg:block" />
            <img src={logo} alt="Logo" className="h-14 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-1 sm:gap-2 ml-auto md:ml-2">
            <CustomerSearchCombobox
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelect={(id) => {
                setSelectedCustomer(id);
                sessionStorage.setItem("selected_customer_id", id);
              }}
              t={t}
            />
            <button
              onClick={() => setShowCustomerModal(true)}
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 text-[#7b61ff] shadow-sm hover:bg-gray-50 transition-all flex-shrink-0"
            >
              <span className="text-2xl font-light">+</span>
            </button>
          </div>
          {/* --- الجزء الأيمن: العداد والقائمة المنسدلة للمستخدم --- */}
          <div className="flex items-center gap-2 sm:gap-3">

            <div className="hidden sm:flex bg-white px-5 py-2 rounded-[22px] border border-gray-100 shadow-sm flex-col items-center min-w-[120px]">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-gray-400 text-xs">🕒</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{t("shift")}</span>
              </div>
              <span className="text-[#ff3b3b] font-mono font-bold text-lg leading-none tracking-widest">
                {formatElapsedTime()}
              </span>
            </div>

            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-400 flex-shrink-0">
              <Notifications />
            </div>

            {/* 🚀 القائمة المنسدلة للمستخدم (مطابقة تماماً للصورة) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex flex-col items-center justify-center w-11 h-11 sm:w-14 sm:h-14 bg-white rounded-2xl border border-gray-100 shadow-sm group outline-none hover:border-[#7b61ff] transition-all flex-shrink-0">
                  <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-[#7b61ff] group-hover:border-[#7b61ff] transition-all">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase mt-1 group-hover:text-[#7b61ff]">User</span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-64 bg-white rounded-xl shadow-xl border-gray-100 p-2" align="end">
                <div className="px-3 py-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Authenticated as</p>
                  <p className="text-sm font-extrabold text-[#1a1a1a]">Administrator</p>
                </div>

                <DropdownMenuSeparator className="bg-gray-50" />

                <DropdownMenuItem onClick={() => navigate("/profile")} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-600">Profile</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={toggleLanguage} className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Languages className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-600">تغيير للعربية</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleAllOrders} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50">
                  <ListOrdered className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-600">AllOrders</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleDueUsers} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-600">Due Users</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExpenses} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-600">Expenses</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-gray-50" />

                <DropdownMenuItem onClick={handleCloseShift} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-red-50 group">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-bold text-red-600">Close Shift</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50">
                  <LogOut className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-500">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>
      </div>

      {/* --- المودالز تظل كما هي --- */}
      {showExpensesModal && <ExpensesModal onClose={() => setShowExpensesModal(false)} />}
      {showPasswordModal && (
        <PasswordConfirmModal
          onConfirm={handlePasswordConfirmed}
          onCancel={handleClose}
          loading={reportLoading}
        />
      )}
      {showReportModal && (
        <EndShiftReportModal
          reportData={endShiftReport}
          onClose={() => setShowReportModal(false)}
          onConfirmClose={handleClose}
        />
      )}
      {showCustomerModal && <AddCustomer onClose={() => setShowCustomerModal(false)} />}
    </>
  );
}