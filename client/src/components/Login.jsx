import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import logo from "../assets/logo.png";
import { usePost } from "@/Hooks/usePost";
import { useShift } from "@/context/ShiftContext";
import { useTenantInfo } from "@/context/TenantContext";
import PosUpgradeRequiredModal from "@/components/PosUpgradeRequiredModal";
import { useTranslation } from "react-i18next";
import { Lock, RefreshCw, PhoneCall } from "lucide-react";
import axios from "axios";

// ✅ validation schema
const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const { openShift } = useShift();
  const { features: contextFeatures, packageInfo: contextPackage } = useTenantInfo();
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [isRechecking, setIsRechecking] = useState(false);
  const [havePOS, setHavePOS] = useState(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradePackage, setUpgradePackage] = useState(null);
  const { t, i18n } = useTranslation();
  const isArabic = i18n?.language === "ar";

  // دالة إعادة فحص الاشتراك عبر POST /api/admin/tenant-info/refresh
  const handleRecheckSubscription = async () => {
    try {
      setIsRechecking(true);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://bcknd.systego.net/";
      const cleanBase = baseUrl.replace(/\/+$/, "");
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const headers = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await axios.post(`${cleanBase}/api/admin/tenant-info/refresh`, {}, {
        headers,
      });

      const payload = res?.data?.data || res?.data;
      const fetchedFeatures = payload?.features;
      const pkg = payload?.package;
      setUpgradePackage(pkg);

      const isPosDisabled =
        fetchedFeatures &&
        (fetchedFeatures.havePOS === false ||
          fetchedFeatures.havePOS === "false" ||
          String(fetchedFeatures.havePOS).toLowerCase() === "false");

      if (isPosDisabled) {
        setHavePOS(false);
        setUpgradeModalOpen(true);
      } else {
        setHavePOS(true);
        setUpgradeModalOpen(false);
      }
    } catch (err) {
      console.error("Error refreshing subscription:", err);
    } finally {
      setIsRechecking(false);
    }
  };

  // ⚡ فحص فوري ومباشر لـ tenant-info عند فتح صفحة تسجيل الدخول
  useEffect(() => {
    let isMounted = true;
    async function verifyTenantPOS() {
      setCheckingSubscription(true);
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://bcknd.systego.net/";
        const cleanBase = baseUrl.replace(/\/+$/, "");
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await axios.get(`${cleanBase}/api/admin/tenant-info`, {
          headers,
        });

        if (isMounted) {
          const payload = res?.data?.data || res?.data;
          const fetchedFeatures = payload?.features;
          const pkg = payload?.package;
          setUpgradePackage(pkg);

          // التحقق من havePOS بدقة (سواء boolean أو string)
          const isPosDisabled =
            fetchedFeatures &&
            (fetchedFeatures.havePOS === false ||
              fetchedFeatures.havePOS === "false" ||
              String(fetchedFeatures.havePOS).toLowerCase() === "false");

          if (isPosDisabled) {
            setHavePOS(false);
            setUpgradeModalOpen(true);
            // مسح أي بيانات جلسة سابقة لمنع الدخول تماماً
            sessionStorage.clear();
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          } else {
            setHavePOS(true);
          }
        }
      } catch (err) {
        console.error("Error fetching tenant info on login mount:", err);
        if (isMounted) {
          if (contextFeatures && contextFeatures.havePOS === false) {
            setHavePOS(false);
            setUpgradeModalOpen(true);
          } else {
            setHavePOS(true);
          }
        }
      } finally {
        if (isMounted) {
          setCheckingSubscription(false);
        }
      }
    }

    verifyTenantPOS();
    return () => {
      isMounted = false;
    };
  }, []);

  // ✅ استدعاء الهوك بدون parameters
  const { postData, loading, error } = usePost();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // ✅ submit handler
  async function onSubmit(values) {
    if (havePOS === false) {
      setUpgradeModalOpen(true);
      return;
    }

    try {
      // ✅ بنبعت الـ endpoint مع الـ body
      const res = await postData("api/admin/auth/login", values);

      if (res?.success) {
        const { token, user } = res.data;

        // ⛔ فحص صلاحية havePOS لهذا المستأجر فوراً قبل السماح بالدخول
        let tenantFeatures = null;
        let fetchedPackage = null;
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || "https://bcknd.systego.net/";
          const cleanBase = baseUrl.replace(/\/+$/, "");
          const tenantRes = await axios.get(`${cleanBase}/api/admin/tenant-info`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
          const tenantPayload = tenantRes?.data?.data || tenantRes?.data;
          tenantFeatures = tenantPayload?.features;
          fetchedPackage = tenantPayload?.package;
        } catch (tenantErr) {
          console.error("Tenant check error on login:", tenantErr);
        }

        // لو الـ havePOS مش موجودة أو false، يمنع الدخول تماماً ويظهر مودال الترقية
        const isPosDisabled =
          tenantFeatures &&
          (tenantFeatures.havePOS === false ||
            tenantFeatures.havePOS === "false" ||
            String(tenantFeatures.havePOS).toLowerCase() === "false");

        if (isPosDisabled) {
          sessionStorage.clear();
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("shiftStatus");
          localStorage.removeItem("shiftStartTime");

          setHavePOS(false);
          setUpgradePackage(fetchedPackage || contextPackage);
          setUpgradeModalOpen(true);
          return; // ⛔ لا يدخل ولا يسجل
        }

        // تخزين البيانات في sessionStorage
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));
        sessionStorage.setItem("warehouseId", JSON.stringify(user?.warehouse_id || null));

        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        let activeShift = res.data.shift || null;
        let activeCashier = res.data.cashier || null;
        let activeAccounts = res.data.financialAccounts || [];

        // لو رد اللوجين معندوش بيانات الشيفت المفتوح، نفحص السيرفر فوراً بالتوكن
        if (!activeShift) {
          try {
            const checkRes = await axios.post(
              `${baseUrl}api/admin/cashier-shift/start`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/json",
                },
              }
            );

            if (checkRes?.data?.data?.isExisting && checkRes?.data?.data?.shift) {
              activeShift = checkRes.data.data.shift;
              activeCashier = checkRes.data.data.cashier;
              if (checkRes.data.data.financialAccounts?.length > 0) {
                activeAccounts = checkRes.data.data.financialAccounts;
              }
            }
          } catch (shiftErr) {
            // لو رجع 400 (Cashier ID is required)، يعني مفيش شيفت مفتوح
            console.log("Shift status check:", shiftErr?.response?.data?.message || "No open shift");
          }
        }

        if (activeShift) {
          // ✅ يوجد شيفت مفتوح بالفعل - استعادة الكاشير والشيفت مباشرة
          const cashierId = activeCashier?._id || activeShift.cashier_id;
          const cashierName = activeCashier?.name || activeCashier?.ar_name || `POS ${cashierId}`;
          sessionStorage.setItem("cashier_id", cashierId);
          sessionStorage.setItem("cashier_name", cashierName);
          sessionStorage.setItem("shift_id", activeShift._id);
          sessionStorage.setItem("shift_start_time", activeShift.start_time);
          sessionStorage.setItem("shift_data", JSON.stringify(activeShift));

          if (activeAccounts && activeAccounts.length > 0) {
            sessionStorage.setItem("financial_accounts", JSON.stringify(activeAccounts));
          } else {
            // جلب الحسابات المالية الخاصة بالكاشير
            try {
              const selRes = await axios.post(
                `${baseUrl}api/admin/pos-home/cashiers/select`,
                { cashier_id: cashierId },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                  },
                }
              );
              sessionStorage.setItem(
                "financial_accounts",
                JSON.stringify(selRes?.data?.data?.financialAccounts || [])
              );
            } catch (selErr) {
              console.error("Select cashier error:", selErr);
            }
          }

          // ✅ تحديث حالة الشيفت في الـ Context
          openShift(activeShift.start_time);

          // ✅ الانتقال مباشرة لشاشة الـ POS متجاوزاً شاشة اختيار الكاشير بالكامل
          navigate("/", {
            replace: true,
            state: {
              showWelcomeBackModal: true,
              cashierName,
              shiftStartTime: activeShift.start_time,
            },
          });
        } else {
          // ✅ لا يوجد شيفت مفتوح - تنظيف أي بيانات شيفت سابقة والانتقال لاختيار الكاشير
          localStorage.removeItem("shiftStatus");
          localStorage.removeItem("shiftStartTime");
          sessionStorage.removeItem("cashier_id");
          sessionStorage.removeItem("cashier_name");
          sessionStorage.removeItem("shift_id");
          sessionStorage.removeItem("shift_start_time");
          sessionStorage.removeItem("shift_data");
          sessionStorage.removeItem("financial_accounts");

          navigate("/cashier", { replace: true });
        }
      }
    } catch (err) {
      console.error("Login error:", err);
    }
  }

  // 1. شاشة التحميل وقت فحص صلاحيات واشتراك المستأجر
  if (checkingSubscription) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-100 p-4">
        <div className="flex flex-col items-center gap-5 bg-white p-8 sm:p-10 rounded-3xl shadow-2xl border border-purple-100 max-w-sm w-full text-center animate-in fade-in duration-300">
          <img src={logo} alt="SalePro Logo" width={120} height={50} className="object-contain" />
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              {isArabic ? "جاري التحقق من الاشتراك..." : "Verifying Subscription..."}
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              {isArabic ? "يرجى الانتظار لحظات" : "Checking tenant permissions..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. إذا كانت havePOS بـ false، يظهر مودال الترقية وشاشة القفل ويمنع تسجيل الدخول تماماً
  if (havePOS === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-100 p-4">
        <Card className="w-full max-w-lg rounded-3xl shadow-2xl border border-purple-200 bg-white p-8 sm:p-10 text-center  animate-in fade-in duration-300">
          <CardHeader className="flex flex-col items-center p-0">
            <img src={logo} alt="SalePro Logo" width={110} height={45} className="object-contain mb-2" />
            <div className="size-16 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
          </CardHeader>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {isArabic ? "نظام نقاط البيع (POS) غير متاح" : "Point of Sale (POS) Not Available"}
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {isArabic
                ? "باقتك الحالية لا تتضمن صلاحية الوصول إلى نظام نقاط البيع (POS). يرجى التواصل مع فريق الدعم الفني لتفعيل الخدمة."
                : "Your current subscription plan does not include Point of Sale (POS) access. Please contact support to activate POS."}
            </p>
          </div>

          {/* Support callout box */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 flex items-center justify-center gap-2.5 text-xs font-bold text-purple-900 shadow-xs">
            <PhoneCall className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span>
              {isArabic
                ? "يرجى التواصل مع فريق الدعم الفني لترقية باقتك وتفعيل النظام"
                : "Please contact customer support to upgrade your plan and activate POS"}
            </span>
          </div>

          {upgradePackage?.name && (
            <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 px-4 py-2 rounded-xl text-xs font-bold text-purple-800 mx-auto">
              <span>{isArabic ? "باقتك الحالية:" : "Your Current Plan:"}</span>
              <span className="font-black underline">{upgradePackage.name}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            {/* Recheck subscription button calling POST /api/admin/tenant-info/refresh */}
            <button
              type="button"
              onClick={handleRecheckSubscription}
              disabled={isRechecking}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm shadow-lg shadow-purple-600/25 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isRechecking ? "animate-spin" : ""}`} />
              <span>
                {isRechecking
                  ? (isArabic ? "جاري إعادة فحص الاشتراك..." : "Rechecking...")
                  : (isArabic ? "إعادة فحص الاشتراك" : "Recheck Subscription")}
              </span>
            </button>

            {/* View Details button to reopen modal */}
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(true)}
              className="w-full py-3 px-4 rounded-xl border border-purple-200 text-purple-700 font-bold text-xs hover:bg-purple-50 cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span>{isArabic ? "عرض التفاصيل" : "View Details"}</span>
            </button>
          </div>
        </Card>

        {/* Upgrade Modal */}
        <PosUpgradeRequiredModal
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          packageInfo={upgradePackage || contextPackage}
        />
      </div>
    );
  }

  // 3. إذا كانت havePOS بـ true، يظهر فورم الدخول العادي
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
      <Card className="w-full max-w-lg rounded-lg shadow-lg">
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          <img src={logo} alt="SalePro Logo" width={100} height={40} className="mb-2" />
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Error Message */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 cursor-pointer transition-colors"
                disabled={loading}
              >
                {loading ? "Loading..." : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}