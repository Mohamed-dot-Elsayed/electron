import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loading from "@/components/Loading";

export default function DealModal({
  isOpen,
  onClose,
  dealCode,
  setDealCode,
  onApply,
  pendingApproval,
  onApprove,
  onCancelApproval,
  isLoading,
  t,
}) {
  // Deal Code Entry Modal
  if (isOpen && !pendingApproval) {
    return (
      <div className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-[95%] max-h-[90vh] overflow-y-auto mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("ApplyDealCode")}
          </h3>
          <p className="text-gray-600 mb-6">{t("EnterDealCode")}</p>
          <Input
            type="text"
            placeholder={t("EnterDealCode")}
            value={dealCode}
            onChange={(e) => setDealCode(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:ring-bg-primary focus:border-bg-primary"
            disabled={isLoading}
          />
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => {
                onClose();
                setDealCode("");
              }}
              variant="outline"
              disabled={isLoading}
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={onApply}
              className="bg-teal-600 text-white hover:bg-teal-700"
              disabled={isLoading || !dealCode.trim()}
            >
              {isLoading ? <Loading /> : t("CheckDeal")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pending Deal Approval Modal
  if (pendingApproval) {
    return (
      <div className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-[95%] max-h-[90vh] overflow-y-auto mx-auto">
          <h3 className="text-lg font-semibold text-teal-700 mb-4">
            {t("ConfirmDealAcceptance")}
          </h3>
          <p className="text-gray-700 mb-2 font-medium">
            {t("CustomerUserId", { user_id: pendingApproval.user_id })}
          </p>
          <p className="text-gray-700 mb-6">
            {t("ConfirmAddDeal", {
              deal_title: pendingApproval.deal_title,
              deal_price: pendingApproval.deal_price.toFixed(2),
            })}
          </p>
          <p className="text-gray-700 mb-6">
            {pendingApproval.description || "No description available."}
          </p>
          <div className="flex justify-end gap-3">
            <Button onClick={onCancelApproval} variant="outline" disabled={isLoading}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={onApprove}
              className="bg-teal-600 text-white hover:bg-teal-700"
              disabled={isLoading}
            >
              {isLoading ? <Loading /> : t("ApproveandAddDeal")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
