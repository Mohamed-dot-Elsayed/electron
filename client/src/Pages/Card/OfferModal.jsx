import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loading from "@/components/Loading";

export default function OfferModal({
  isOpen,
  onClose,
  offerCode,
  setOfferCode,
  onApply,
  pendingApproval,
  onApprove,
  onCancelApproval,
  isLoading,
  t,
}) {
  // Offer Code Entry Modal
  if (isOpen && !pendingApproval) {
    return (
      <div className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-[95%] max-h-[90vh] overflow-y-auto mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("ApplyOfferUsePoints")}
          </h3>
          <p className="text-gray-600 mb-6">{t("EnterLoyaltyOrRewardCode")}</p>
          <Input
            type="text"
            placeholder={t("EnterOfferCode")}
            value={offerCode}
            onChange={(e) => setOfferCode(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:ring-bg-primary focus:border-bg-primary"
            disabled={isLoading}
          />
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => {
                onClose();
                setOfferCode("");
              }}
              variant="outline"
              disabled={isLoading}
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={onApply}
              className="bg-bg-primary text-white hover:bg-purple-700"
              disabled={isLoading || !offerCode.trim()}
            >
              {isLoading ? <Loading /> : t("CheckCode")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pending Offer Approval Modal
  if (pendingApproval) {
    return (
      <div className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-[95%] max-h-[90vh] overflow-y-auto mx-auto">
          <h3 className="text-lg font-semibold text-bg-primary mb-4">
            {t("ConfirmRewardPurchase")}
          </h3>
          <p className="text-gray-700 mb-2 font-medium">
            {t("UserID")}: **{pendingApproval.user_id}**
          </p>
          <p className="text-gray-700 mb-6">
            {t("ConfirmAddOffer", {
              product: pendingApproval.product,
              points: pendingApproval.points,
            })}
          </p>
          <div className="flex justify-end gap-3">
            <Button onClick={onCancelApproval} variant="outline" disabled={isLoading}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={onApprove}
              className="bg-bg-primary text-white hover:bg-purple-700"
              disabled={isLoading}
            >
              {isLoading ? <Loading /> : t("ApproveandAddItem")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}