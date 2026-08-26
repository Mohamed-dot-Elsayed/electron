import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Plus } from "lucide-react";

export default function ReturnsListPage() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();

  const {
    data: response,
    isLoading,
    error,
  } = useGet("api/return-sale/all-returns");

  const returns = response?.success ? response.data?.returns || [] : [];
  const summary = response?.success ? response.data?.summary : null;

  const [selectedReturn, setSelectedReturn] = useState(null);

  const customerName = (ret) => ret.customer_id?.name || t("Walk in Customer");

  const financialsSummary = (ret) => {
    const financials = ret.financials || [];
    if (financials.length === 0) return "-";
    return financials
      .map((f) => `${f.account_name || t("Unknown")} (${f.amount})`)
      .join(", ");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">{t("Returns")}</CardTitle>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => navigate("/return-sale")}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("Create Return")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600">{t("Total Returns")}</p>
                  <p className="text-2xl font-bold">{summary.total_returns}</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600">{t("Total Amount")}</p>
                  <p className="text-2xl font-bold">
                    {summary.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Reference")}</TableHead>
                    <TableHead>{t("Date")}</TableHead>
                    <TableHead>{t("Customer")}</TableHead>
                    <TableHead>{t("Items")}</TableHead>
                    <TableHead>{t("Total Amount")}</TableHead>
                    <TableHead>{t("Refunded To")}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-gray-500 py-8"
                      >
                        {t("Loading...")}
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-red-500 py-8"
                      >
                        {t("Failed to load returns")}
                      </TableCell>
                    </TableRow>
                  ) : returns.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-gray-500 py-8"
                      >
                        {t("No returns found")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    returns.map((ret) => (
                      <TableRow key={ret._id}>
                        <TableCell className="font-medium">
                          {ret.sale_id?.reference || "-"}
                        </TableCell>
                        <TableCell>
                          {ret.date
                            ? new Date(ret.date).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>{customerName(ret)}</TableCell>
                        <TableCell>{ret.items?.length || 0}</TableCell>
                        <TableCell>
                          {(ret.total_amount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate">
                          {financialsSummary(ret)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSelectedReturn(ret)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Return details popup */}
      <Dialog
        open={!!selectedReturn}
        onOpenChange={(open) => !open && setSelectedReturn(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("Return Details")} —{" "}
              {selectedReturn?.sale_id?.reference || "-"}
            </DialogTitle>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-6">
              {/* Returned items — replaces the old table block */}
              <div>
                <p className="text-sm font-medium mb-2">
                  {t("Returned Items")}
                </p>
                <div className="space-y-3">
                  {(selectedReturn.items || []).map((line, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 border rounded-lg p-3 items-start"
                    >
                      <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                        {line.product_image ? (
                          <img
                            src={line.product_image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">
                            {t("No image")}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {isArabic
                            ? line.product_ar_name || line.product_name || "-"
                            : line.product_name || line.product_ar_name || "-"}
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                          <p className="text-gray-600">
                            {t("Saled Qty")}:{" "}
                            <span className="text-gray-900">
                              {line.original_quantity}
                            </span>
                          </p>
                          <p className="text-gray-600">
                            {t("Returned Qty")}:{" "}
                            <span className="text-gray-900">
                              {line.returned_quantity}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return-level reason/note — new */}
              {(selectedReturn.reason || selectedReturn.note) && (
                <div className="space-y-2">
                  {selectedReturn.reason && (
                    <div>
                      <p className="text-sm font-medium mb-1">{t("Reason")}</p>
                      <p className="text-sm text-gray-600">
                        {selectedReturn.reason}
                      </p>
                    </div>
                  )}
                  {selectedReturn.note && (
                    <div>
                      <p className="text-sm font-medium mb-1">{t("Note")}</p>
                      <p className="text-sm text-gray-600">
                        {selectedReturn.note}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Refunded To — unchanged from before */}
              <div>
                <p className="text-sm font-medium mb-2">{t("Refunded To")}</p>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Account")}</TableHead>
                        <TableHead>{t("Amount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedReturn.financials || []).map((f, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {isArabic
                              ? f.account_ar_name || f.account_name || "-"
                              : f.account_name || f.account_ar_name || "-"}
                          </TableCell>
                          <TableCell>{f.amount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
