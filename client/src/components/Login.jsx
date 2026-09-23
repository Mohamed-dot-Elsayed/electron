import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

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

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const { openShift } = useShift();
  const { postData, loading, error } = usePost();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values) {
    try {
      const res = await postData("api/auth/login", values);

      if (res?.success) {
        const { token, user, shift, cashier, financialAccounts } = res.data;

        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));
        sessionStorage.setItem("warehouseId", JSON.stringify(user?.warehouse_id || null));

        // ✅ حالة 1: المستخدِم لديه شيفت مفتوح بالفعل من قبل
        if (shift) {
          const cashierId = cashier?._id || shift.cashier_id;
          const cashierName = cashier?.name || cashier?.ar_name || `POS ${cashierId}`;

          sessionStorage.setItem("cashier_id", cashierId);
          sessionStorage.setItem("cashier_name", cashierName);
          sessionStorage.setItem("shift_id", shift._id);
          sessionStorage.setItem("shift_start_time", shift.start_time);
          sessionStorage.setItem("shift_data", JSON.stringify(shift));

          if (financialAccounts?.length > 0) {
            sessionStorage.setItem("financial_accounts", JSON.stringify(financialAccounts));
          }

          openShift(shift.start_time);
          localStorage.setItem("offline_pos_cashier_id", cashierId);

          // ➡️ توجيه للرئيسية وإظهار Welcome Back Modal
          navigate("/", {
            replace: true,
            state: {
              showWelcomeBackModal: true,
              cashierName,
              shiftStartTime: shift.start_time,
            },
          });
        } 
        // ⛔ حالة 2: ليس لديه شيفت مفتوح -> الذهاب لاختيار الكاشير
        else {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
      <Card className="w-full max-w-lg rounded-lg shadow-lg">
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          <img src={logo} alt="SalePro Logo" width={100} height={40} className="mb-2" />
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? "Loading..." : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}