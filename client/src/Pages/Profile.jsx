import React, { useState } from "react";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FaEdit } from "react-icons/fa";
import Loading from "@/components/Loading";
import { useTranslation } from "react-i18next";

const Profile = () => {
  const { data, loading, refetch } = useGet("cashier/profile");
  const { postData, loading: updating } = usePost();
  const [open, setOpen] = useState(false);
     const { t ,i18n } = useTranslation();
      const isArabic = i18n.language === "ar";

  const [form, setForm] = useState({
    user_name: "",
    password: "",
    status: 1,
    image: null,
  });
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});

  const handleEdit = () => {
    if (data) {
      setForm({
        user_name: data.user_name || "",
        password: "",
        status: data.status || 1,
        image: null,
      });
      setPreview(data.image || null);
      setErrors({});
      setOpen(true); // ✅ افتح المودال عند الضغط على Edit
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors({ ...errors, image: t("Imagesizemustbelessthan2MB") });
        return;
      }
      setForm({ ...form, image: file });
      setPreview(URL.createObjectURL(file));
      setErrors({ ...errors, image: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.user_name.trim()) newErrors.user_name = t("Usernameisrequipurple");
    if (form.password && form.password.length < 3)
      newErrors.password = "Passwordmustbeatleast3characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formData = new FormData();
    formData.append("user_name", form.user_name);
    formData.append("password", form.password);
    formData.append("status", form.status);
    if (form.image) formData.append("image", form.image);

    try {
      await postData("cashier/profile/update", formData, true);
      toast.success(t("Profileupdatedsuccessfully"));
      refetch();
      setOpen(false); // ✅ يقفل المودال بعد الحفظ
    } catch (err) {
      toast.error(t("Errorupdatingprofile"));
    }
  };

  const handleCancel = () => {
    setForm({ user_name: "", password: "", status: 1, image: null });
    setOpen(false); // ✅ يقفل المودال بعد الإلغاء
  };

  if (loading) return <Loading />;

  return (
    <div  className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <Card className="max-w-md w-full shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardContent className="flex flex-col items-center p-8">
          <div className="relative group">
            <Avatar className="w-28 h-28 mb-4 ring-4 ring-purple-100 transition-all duration-300 group-hover:ring-purple-300">
              {data?.image ? (
                <AvatarImage src={data.image} alt="Profile" className="object-cover" />
              ) : (
                <AvatarFallback className="text-2xl font-bold bg-purple-100 text-purple-600">
                  {data?.user_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              )}
            </Avatar>

          </div>

          <h2 className="text-2xl font-bold text-gray-900">{data?.user_name || "No Name"}</h2>
          <p
            className={`mt-2 text-sm font-medium px-3 py-1 rounded-full ${
              data?.status === 1 ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"
            }`}
          >
            {data?.status === 1 ? "Active" : "Inactive"}
          </p>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={handleEdit}
                className="mt-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-full flex items-center gap-2 transition-all duration-300"
              >
                <FaEdit />
                {t("EditProfile")}
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md rounded-2xl bg-white p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900">
                {t("EditProfile")}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleUpdate} className="space-y-5">
                {preview && (
                  <div className="flex justify-center">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-purple-200"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("Username")}</Label>
                  <Input
                    value={form.user_name}
                    onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                    className={`border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-lg transition-all duration-200 ${
                      errors.user_name ? "border-purple-500" : ""
                    }`}
                    requipurple
                  />
                  {errors.user_name && (
                    <p className="text-purple-500 text-xs mt-1">{errors.user_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("Password")}</Label>
                  <Input
                    type={t("Password")}
                    placeholder="••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={`border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-lg transition-all duration-200 ${
                      errors.password ? "border-purple-500" : ""
                    }`}
                  />
                  {errors.password && (
                    <p className="text-purple-500 text-xs mt-1">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("Status")}</Label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}
                    className="w-full border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-lg px-3 py-2 text-sm transition-all duration-200"
                  >
                    <option value={1}>{t("Active")}</option>
                    <option value={0}>{t("Inactive")}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("ProfileImage")}</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="border-gray-300 rounded-lg"
                  />
                  {errors.image && (
                    <p className="text-purple-500 text-xs mt-1">{errors.image}</p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg"
                    onClick={handleCancel}
                  >
                    {t("Cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updating}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200"
                  >
                    {updating ? t("Saving") : t("Save")}
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
