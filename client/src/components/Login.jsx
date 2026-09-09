// src/components/Login.jsx

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    try {
      // ✅ بنبعت الـ endpoint مع الـ body
      const res = await postData("api/auth/login", values);

      if (res?.success) {
        const { token, user } = res.data;

        // تخزين البيانات في sessionStorage
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));
        sessionStorage.setItem(
          "warehouseId",
          JSON.stringify(user?.warehouse_id || null)
        );

        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
        let activeShift = res.data.shift || null;
        let activeCashier = res.data.cashier || null;
        let activeAccounts = res.data.financialAccounts || [];

        // لو رد اللوجين معندوش بيانات الشيفت المفتوح، نفحص السيرفر فوراً بالتوكن
        if (!activeShift) {
          try {
            const checkRes = await axios.post(
              `${baseUrl}${baseUrl.endsWith("/") ? "" : "/"}api/cashier-shift/start`,
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
            try {
              const selRes = await axios.post(
                `${baseUrl}${baseUrl.endsWith("/") ? "" : "/"}api/pos-home/cashiers/select`,
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

          // ✅ حفظ كاشير الجهاز المحلي
          localStorage.setItem("offline_pos_cashier_id", cashierId);

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
          // ✅ لا يوجد شيفت مفتوح - في تطبيق Electron (Offline POS) لا نطلب اختيار الـ POS يدويًا
          // بل يتم اختيار كاشير هذا الجهاز تلقائيًا وبدء الشيفت والدخول مباشرة للشاشة الرئيسية
          localStorage.removeItem("shiftStatus");
          localStorage.removeItem("shiftStartTime");
          sessionStorage.removeItem("cashier_id");
          sessionStorage.removeItem("cashier_name");
          sessionStorage.removeItem("shift_id");
          sessionStorage.removeItem("shift_start_time");
          sessionStorage.removeItem("shift_data");
          sessionStorage.removeItem("financial_accounts");

          try {
            // 1. جلب قائمة الكاشيرات التابعة للمخزن
            const cashiersRes = await axios.get(
              `${baseUrl}${baseUrl.endsWith("/") ? "" : "/"}api/pos-home/cashiers`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/json",
                },
              }
            );

            const cashiersList = cashiersRes?.data?.data?.cashiers || [];

            // 2. تحديد الكاشير الخاص بهذا الجهاز (المحفوظ سابقاً أو أول كاشير متاح)
            let chosenCashierId = localStorage.getItem("offline_pos_cashier_id");
            let chosenCashier = cashiersList.find((c) => c._id === chosenCashierId);

            if (!chosenCashier && cashiersList.length > 0) {
              chosenCashier = cashiersList[0];
              chosenCashierId = chosenCashier._id;
              localStorage.setItem("offline_pos_cashier_id", chosenCashierId);
            }

            if (chosenCashierId) {
              // 3. اختيار الكاشير وجلب الحسابات المالية
              let financialAccounts = [];
              try {
                const selRes = await axios.post(
                  `${baseUrl}${baseUrl.endsWith("/") ? "" : "/"}api/pos-home/cashiers/select`,
                  { cashier_id: chosenCashierId },
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      Accept: "application/json",
                    },
                  }
                );
                financialAccounts = selRes?.data?.data?.financialAccounts || [];
              } catch (selErr) {
                console.warn("Auto select cashier warning:", selErr);
              }

              // 4. فتح الشيفت الجديد تلقائيًا
              const startRes = await axios.post(
                `${baseUrl}${baseUrl.endsWith("/") ? "" : "/"}api/cashier-shift/start`,
                { cashier_id: chosenCashierId },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                  },
                }
              );

              const newShift = startRes?.data?.data?.shift;
              const shiftStartTime = newShift?.start_time || new Date().toISOString();
              const cashierName =
                chosenCashier?.name || chosenCashier?.ar_name || `POS ${chosenCashierId}`;

              if (startRes?.data?.data?.financialAccounts?.length > 0) {
                financialAccounts = startRes.data.data.financialAccounts;
              }

              sessionStorage.setItem("cashier_id", chosenCashierId);
              sessionStorage.setItem("cashier_name", cashierName);
              if (newShift) {
                sessionStorage.setItem("shift_id", newShift._id);
                sessionStorage.setItem("shift_start_time", shiftStartTime);
                sessionStorage.setItem("shift_data", JSON.stringify(newShift));
              }
              if (financialAccounts.length > 0) {
                sessionStorage.setItem("financial_accounts", JSON.stringify(financialAccounts));
              }

              // ✅ تحديث حالة الشيفت في الـ Context
              openShift(shiftStartTime);

              // ✅ الانتقال مباشرة للشاشة الرئيسية ببدء شيفت جديد
              navigate("/", {
                replace: true,
                state: {
                  showShiftStartedModal: true,
                  cashierName,
                  shiftStartTime,
                },
              });
              return;
            }
          } catch (autoShiftErr) {
            console.error("Auto start shift error:", autoShiftErr);
          }

          // في حال عدم توفر كاشير، نتوجه للشاشة الرئيسية مباشرة
          navigate("/", { replace: true });
        }
      }
    } catch (err) {
      console.error("Login error:", err);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
      <Card className="w-full max-w-lg rounded-lg shadow-lg">
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          <img
            src={logo}
            alt="SalePro Logo"
            width={100}
            height={40}
            className="mb-2"
          />
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
                      <Input
                        type="email"
                        placeholder="admin@example.com"
                        {...field}
                      />
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
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
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
                className="w-full bg-purple-600 hover:bg-purple-700"
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
