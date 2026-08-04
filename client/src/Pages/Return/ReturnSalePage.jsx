import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";

export default function ReturnSalePage() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();
  const { postData, loading } = usePost();

  const [reference, setReference] = useState("");
  const [saleData, setSaleData] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnNote, setReturnNote] = useState("");
  const [refundAccountId, setRefundAccountId] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [fileName, setFileName] = useState("No file chosen");

  // خطوة 1: البحث عن الفاتورة بالرقم المرجعي
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!reference.trim()) {
      toast.error(t("Please enter reference number"));
      return;
    }

    try {
      const response = await postData("api/return-sale/sale-for-return", {
        reference: reference.trim(),
      });

      if (response.success) {
        const { sale, items } = response.data;

        // تهيئة الأصناف مع دعم كلا الحالتين (product_price أو product)
        const initializedItems = items.map((item) => {
          // اسم المنتج حسب اللغة (مع trim)
          const productName = item.product?.name || "";
          const productArName = (item.product?.ar_name || "").trim() || "";
          const displayName = isArabic 
            ? (productArName || productName || t("Unknown Product"))
            : (productName || productArName || t("Unknown Product"));

          // الكود
          const code = item.product_price?.code || "-";

          return {
            ...item,
            return_quantity: 0,
            reason: "",
            displayName,
            code,
            max_return: item.available_to_return || 0,
            original_quantity: item.quantity || 0,
            unit_price: item.price || 0,
          };
        });

        setSaleData(sale);
        setReturnItems(initializedItems);
        toast.success(response.data.message || t("Sale found successfully"));
      }
    } catch (err) {
      const msg = err?.response?.data?.message || t("Sale not found");
      toast.error(msg);
      setSaleData(null);
      setReturnItems([]);
    }
  };

  // تعديل كمية الإرجاع
  const updateQuantity = (index, qty) => {
    const maxQty = returnItems[index].max_return || 0;
    const newQty = Math.max(0, Math.min(parseInt(qty) || 0, maxQty));
    const updated = [...returnItems];
    updated[index].return_quantity = newQty;
    setReturnItems(updated);
  };

  // تعديل سبب الإرجاع
  const updateReason = (index, reason) => {
    const updated = [...returnItems];
    updated[index].reason = reason;
    setReturnItems(updated);
  };

  // حذف صنف من الإرجاع
  const removeItem = (index) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  // حساب الإجماليات
  const calculateTotals = () => {
    let totalQuantity = 0;
    let totalAmount = 0;

    returnItems.forEach((item) => {
      const qty = item.return_quantity || 0;
      if (qty > 0) {
        totalQuantity += qty;
        const price = item.unit_price || 0;
        totalAmount += qty * price;
      }
    });

    return {
      totalQuantity,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    };
  };

  const { totalQuantity, totalAmount } = calculateTotals();

  // رفع ملف
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachedFile(file);
      setFileName(file.name);
    }
  };

  // Submit الإرجاع النهائي
  const handleFinalSubmit = async () => {
    const validItems = returnItems.filter(
      (item) => (item.return_quantity || 0) > 0 && (item.reason || "").trim() !== ""
    );

    if (validItems.length === 0) {
      toast.error(t("Please select at least one item with quantity and reason"));
      return;
    }



    const payload = {
      sale_id: saleData._id,
      items: validItems.map((item) => ({
        product_sale_id: item.product_price?._id || item._id,
        quantity: item.return_quantity,
        reason: item.reason.trim(),
      })),
      note: returnNote.trim(),
    };

    let dataToSend = payload;
    let isFormData = !!attachedFile;

    if (isFormData) {
      const formData = new FormData();
      formData.append("sale_id", payload.sale_id);
      formData.append("refund_account_id", payload.refund_account_id);
      formData.append("note", payload.note);
      payload.items.forEach((item, idx) => {
        formData.append(`items[${idx}][product_sale_id]`, item.product_sale_id);
        formData.append(`items[${idx}][quantity]`, item.quantity);
        formData.append(`items[${idx}][reason]`, item.reason);
      });
      if (attachedFile) formData.append("attachment", attachedFile);
      dataToSend = formData;
    }

    try {
      const response = await postData("api/return-sale/create-return", dataToSend, isFormData);

      if (response.success) {
        toast.success(t("Return created successfully"));
        navigate("/returns");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || t("Failed to create return");
      toast.error(msg);
    }
  };

  // استخراج أسماء الكاشير والكاشير مان حسب اللغة
  const cashierName = (() => {
    const cashier = saleData?.shift?.cashier;
    if (!cashier) return "-";
    const arName = (cashier.ar_name || "").trim();
    return isArabic ? (arName || cashier.name || "-") : (cashier.name || arName || "-");
  })();

  const cashiermanName = saleData?.shift?.cashierman?.username || "-";

  // شاشة البحث الأولية
  if (!saleData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl">{t("Return Sale")}</CardTitle>
              <p className="text-center text-gray-600 mt-2">
                {t("Enter the reference number to start return process")}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reference">{t("Reference Number")} *</Label>
                  <Input
                    id="reference"
                    type="text"
                    placeholder={t("e.g. 01075713")}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    disabled={loading}
                    className="text-lg"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={loading}>
                    {loading ? t("Searching...") : t("Search Sale")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate("/")} disabled={loading}>
                    {t("Cancel")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // الشاشة الرئيسية بعد العثور على الفاتورة
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t("Return Sale")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Header: Reference, Date, Customer, Warehouse, Cashier, Cashier Manager */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div>
                <Label>{t("Reference")}</Label>
                <Input value={saleData?.reference || ""} readOnly className="bg-gray-100" />
              </div>
              <div>
                <Label>{t("Date")}</Label>
                <Input 
                  value={saleData?.date ? new Date(saleData.date).toLocaleString() : "-"} 
                  readOnly 
                  className="bg-gray-100" 
                />
              </div>
              <div>
                <Label>{t("Customer")}</Label>
                <Input 
                  value={saleData?.customer?.name || t("Walk in Customer")} 
                  readOnly 
                  className="bg-gray-100" 
                />
              </div>
              <div>
                <Label>{t("Warehouse")}</Label>
                <Input 
                  value={saleData?.warehouse?.name || "-"} 
                  readOnly 
                  className="bg-gray-100" 
                />
              </div>
              <div>
                <Label>{t("Cashier")}</Label>
                <Input 
                  value={cashierName} 
                  readOnly 
                  className="bg-gray-100" 
                />
              </div>
              <div>
                <Label>{t("Cashier Manager") || "Cashier Man"}</Label>
                <Input 
                  value={cashiermanName} 
                  readOnly 
                  className="bg-gray-100" 
                />
              </div>
            </div>

            {/* Order Table */}
            <div>
              <Label className="text-base font-medium">{t("Order Table")} *</Label>
              <div className="border rounded-lg overflow-hidden mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Product")}</TableHead>
                      <TableHead>{t("Code")}</TableHead>
                      <TableHead>{t("Quantity")}</TableHead>
                      <TableHead>{t("Available to Return")}</TableHead>
                      <TableHead>{t("Return Qty")}</TableHead>
                      <TableHead>{t("Reason")}</TableHead>
                      <TableHead>{t("Unit Price")}</TableHead>
                      <TableHead>{t("SubTotal")}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                          {t("No items available")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      returnItems.map((item, index) => {
                        const returnQty = item.return_quantity || 0;
                        const subtotal = (returnQty * item.unit_price).toFixed(2);
                        
                        return (
                          <TableRow key={item._id || index}>
                            <TableCell className="font-medium">
                              {item.displayName}
                            </TableCell>
                            <TableCell>{item.code}</TableCell>
                            <TableCell>{item.original_quantity || 0}</TableCell>
                            <TableCell>{item.max_return || 0}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={item.max_return || 0}
                                value={returnQty}
                                onChange={(e) => updateQuantity(index, e.target.value)}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                placeholder={t("Reason")}
                                value={item.reason || ""}
                                onChange={(e) => updateReason(index, e.target.value)}
                                className="w-full min-w-[150px]"
                              />
                            </TableCell>
                            <TableCell>{item.unit_price.toFixed(2)}</TableCell>
                            <TableCell>{subtotal}</TableCell>
                            <TableCell>
                              <Button variant="destructive" size="icon" onClick={() => removeItem(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                    {returnItems.length > 0 && (
                      <TableRow className="font-bold bg-gray-100">
                        <TableCell colSpan={4}>{t("Total")}</TableCell>
                        <TableCell>{totalQuantity}</TableCell>
                        <TableCell colSpan={2}></TableCell>
                        <TableCell>{totalAmount.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Attach Document */}
            <div>
              <Label>{t("Attach Document")} ({t("Optional")})</Label>
              <div className="flex items-center gap-3 mt-2">
                <Button variant="outline" asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {t("Choose File")}
                  </label>
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <span className="text-sm text-gray-600">{fileName}</span>
              </div>
            </div>

            {/* Refund Account */}
            {/* <div>
              <Label>{t("Refund Account")} *</Label>
              <Input
                placeholder={t("e.g. 693e887d5d2abb8f0937d1f5")}
                value={refundAccountId}
                onChange={(e) => setRefundAccountId(e.target.value)}
                required
              />
            </div> */}

            {/* Notes */}
            <div>
              <Label>{t("Return Note")}</Label>
              <textarea
                className="w-full p-3 border rounded-md mt-2"
                rows="4"
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                placeholder={t("e.g. Customer returned because...")}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSaleData(null);
                  setReturnItems([]);
                  setReference("");
                  setReturnNote("");
                  setAttachedFile(null);
                  setFileName("No file chosen");
                }}
                disabled={loading}
              >
                {t("Cancel")}
              </Button>
              <Button
                size="lg"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={handleFinalSubmit}
                disabled={loading}
              >
                {loading ? t("Submitting...") : t("Submit Return")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}