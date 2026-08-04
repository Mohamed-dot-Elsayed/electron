// src/components/Login.jsx

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

      if (res.success) {
        const { token, user, hasOpenShift } = res.data;

        // تخزين البيانات في sessionStorage (مش localStorage)
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));
        sessionStorage.setItem(
          "warehouseId",
          JSON.stringify(user?.warehouse_id || null),
        );

        // ✅ لو فيه شيفت مفتوح يروح للصفحة الرئيسية، لو مفيش يروح للكاشير
        if (hasOpenShift) {
          navigate("/", { state: { fromLogin: true } });
        } else {
          navigate("/cashier");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      // الـ error handling موجود في الـ hook
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
