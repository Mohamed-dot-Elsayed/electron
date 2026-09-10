import React, { useState, useEffect } from "react";
import { useGet } from "@/Hooks/useGet";
import { usePut } from "@/Hooks/usePut";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FaEdit } from "react-icons/fa";
import Loading from "@/components/Loading";
import { useTranslation } from "react-i18next";

const Profile = () => {
  const [profileEndpoint, setProfileEndpoint] = useState("api/admin/profile");
  const { data, loading, error, refetch } = useGet(profileEndpoint);
  const { putData, loading: putLoading } = usePut();
  const { postData, loading: postLoading } = usePost();
  const [open, setOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const isArabic = i18n?.language === "ar";

  // Fallback endpoint if api/admin/profile fails
  useEffect(() => {
    if (error && profileEndpoint === "api/admin/profile") {
      setProfileEndpoint("api/profile");
    }
  }, [error, profileEndpoint]);

  // استخراج كائن البروفايل من مختلف أشكال الردود
  const profile =
    data?.profile ||
    data?.data?.profile ||
    data?.user ||
    data?.data?.user ||
    data?.data ||
    data ||
    {};

  const username =
    profile?.username ||
    profile?.user_name ||
    profile?.name ||
    sessionStorage.getItem("cashier_name") ||
    "User";

  const imageUrl =
    profile?.image_url ||
    profile?.image ||
    profile?.avatar ||
    null;

  // التحقق من حالة التفعيل
  const isActive =
    profile?.status === "active" ||
    profile?.status === 1 ||
    profile?.status === true ||
    profile?.isActive === true ||
    profile?.status === "1";

  const [form, setForm] = useState({
    username: "",
    password: "",
    image_url: "",
    image_base64: null,
  });
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});

  const handleEdit = () => {
    setForm({
      username: username || "",
      password: "",
      image_url: imageUrl || "",
      image_base64: null,
    });
    setPreview(imageUrl || null);
    setErrors({});
    setOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setErrors({
          ...errors,
          image: isArabic ? "حجم الصورة يجب أن يكون أقل من 3 ميجابايت" : "Image size must be less than 3MB",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({
          ...prev,
          image_base64: reader.result,
        }));
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setErrors({ ...errors, image: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.username.trim()) {
      newErrors.username = isArabic ? "اسم المستخدم مطلوب" : "Username is required";
    }
    if (form.password && form.password.length < 3) {
      newErrors.password = isArabic ? "كلمة المرور يجب ألا تقل عن 3 أحرف" : "Password must be at least 3 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      username: form.username.trim(),
      user_name: form.username.trim(),
    };

    if (form.password && form.password.trim()) {
      payload.password = form.password.trim();
    }

    if (form.image_base64) {
      payload.image_base64 = form.image_base64;
    } else if (form.image_url && form.image_url.trim()) {
      payload.image_url = form.image_url.trim();
    }

    try {
      try {
        await putData(profileEndpoint, payload);
      } catch (putErr) {
        // لو الـ PUT غير مدعوم، جرب POST
        await postData(profileEndpoint, payload);
      }

      toast.success(isArabic ? "تم تحديث الملف الشخصي بنجاح" : "Profile updated successfully");
      refetch();
      setOpen(false);
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error(
        err?.response?.data?.message ||
          (isArabic ? "حدث خطأ أثناء تحديث الملف الشخصي" : "Error updating profile")
      );
    }
  };

  const handleCancel = () => {
    setForm({ username: "", password: "", image_url: "", image_base64: null });
    setOpen(false);
  };

  const isUpdating = putLoading || postLoading;

  if (loading && !data) return <Loading />;

  return (
    <div
      className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <Card className="max-w-md w-full shadow-xl rounded-2xl overflow-hidden bg-white border border-gray-100">
        <CardContent className="flex flex-col items-center p-8">
          <div className="relative group">
            <Avatar className="w-28 h-28 mb-4 ring-4 ring-purple-100 transition-all duration-300 group-hover:ring-purple-300 shadow-md">
              {imageUrl ? (
                <AvatarImage src={imageUrl} alt={username} className="object-cover" />
              ) : (
                <AvatarFallback className="text-2xl font-bold bg-purple-100 text-purple-600">
                  {username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              )}
            </Avatar>
          </div>

          {/* اسم المستخدم */}
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            {username}
          </h2>

          {/* حالة الحساب (نشط / غير نشط) */}
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isActive ? "bg-green-600 animate-pulse" : "bg-red-600"
                }`}
              />
              {isActive
                ? isArabic ? "نشط (Active)" : "Active"
                : isArabic ? "غير نشط (Inactive)" : "Inactive"}
            </span>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={handleEdit}
                className="mt-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-full flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer"
              >
                <FaEdit />
                {isArabic ? "تعديل الملف الشخصي" : "Edit Profile"}
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md rounded-2xl bg-white p-6" dir={isArabic ? "rtl" : "ltr"}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {isArabic ? "تعديل الملف الشخصي" : "Edit Profile"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleUpdate} className="space-y-4 mt-2">
                {/* معاينة الصورة */}
                {preview && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-purple-200 shadow-sm"
                    />
                  </div>
                )}

                {/* 1. اسم المستخدم (Username) */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    {isArabic ? "اسم المستخدم (Username)" : "Username"}
                  </Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className={`border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-lg transition-all duration-200 ${
                      errors.username ? "border-red-500" : ""
                    }`}
                    required
                  />
                  {errors.username && (
                    <p className="text-red-500 text-xs mt-1">{errors.username}</p>
                  )}
                </div>

                {/* 2. كلمة المرور (Password) */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    {isArabic ? "كلمة المرور الجديدة (Password)" : "New Password"}
                  </Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={`border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-lg transition-all duration-200 ${
                      errors.password ? "border-red-500" : ""
                    }`}
                  />
                  <p className="text-[11px] text-gray-400">
                    {isArabic
                      ? "اتركه فارغاً إذا كنت لا ترغب في تغيير كلمة المرور"
                      : "Leave blank if you don't want to change password"}
                  </p>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                  )}
                </div>

                {/* 3. رفع صورة الملف الشخصي (Image Upload) */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    {isArabic ? "صورة الملف الشخصي (Profile Image)" : "Profile Image"}
                  </Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="border-gray-300 rounded-lg cursor-pointer file:cursor-pointer"
                  />
                  {errors.image && (
                    <p className="text-red-500 text-xs mt-1">{errors.image}</p>
                  )}
                </div>

                {/* أزرار الحفظ والإلغاء */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                    onClick={handleCancel}
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdating}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-60"
                  >
                    {isUpdating
                      ? isArabic ? "جاري الحفظ..." : "Saving..."
                      : isArabic ? "حفظ التعديلات" : "Save Changes"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
