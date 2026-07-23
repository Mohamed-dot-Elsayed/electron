import React from "react";
import { Button } from "@/components/ui/button";

export default function ClearAllConfirmModal({ open, onOpenChange, onConfirm, itemCount, t }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-[95%] max-h-[90vh] overflow-y-auto mx-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t("ConfirmClearAllItems")}
        </h3>
        <p className="text-gray-600 mb-6">
          {t("ConfirmRemoveAll", { count: itemCount || 0 })}
        </p>
        <div className="flex justify-end gap-3">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            {t("Cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            {t("ClearAllItems")}
          </Button>
        </div>
      </div>
    </div>
  );
}
