import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loading from "@/components/Loading";

export default function ClearAllManagerModal({
  open,
  onOpenChange,
  managerId,
  setManagerId,
  managerPassword,
  setManagerPassword,
  onConfirm,
  isLoading,
  t,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-[95%] max-h-[90vh] overflow-y-auto mx-auto">
        <h3 className="text-xl font-bold text-purple-700 mb-6">
          {t("ManagerApprovalRequired")}
        </h3>
        <p className="text-gray-700 mb-6">
          {t("Clearingallitemsrequiresmanagerapproval")}
        </p>
        <div className="space-y-4">
          <Input
            placeholder={t("ManagerID")}
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            className="w-full"
          />
          <Input
            type="password"
            placeholder={t("ManagerPassword")}
            value={managerPassword}
            onChange={(e) => setManagerPassword(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex justify-end gap-4 mt-8">
          <Button
            onClick={() => {
              onOpenChange(false);
              setManagerId("");
              setManagerPassword("");
            }}
            variant="outline"
            disabled={isLoading}
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-purple-600 text-white hover:bg-purple-800"
            disabled={isLoading || !managerId || !managerPassword}
          >
            {isLoading ? <Loading /> : t("VoidAllItems")}
          </Button>
        </div>
      </div>
    </div>
  );
}