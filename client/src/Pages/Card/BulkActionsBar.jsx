import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PREPARATION_STATUSES, statusOrder } from "./constants";

export default function BulkActionsBar({
  bulkStatus,
  setBulkStatus,
  selectedItems,
  onApplyStatus,
  onTransferOrder,
  isLoading,
  currentLowestStatus,
  t,
}) {
  return (
    <div className="flex items-center justify-start mb-4 gap-4 flex-wrap p-4 bg-white rounded-lg shadow-md">
      <Select value={bulkStatus} onValueChange={setBulkStatus}>
        <SelectTrigger className="w-[200px] border-gray-300 rounded-md shadow-sm px-4 py-2 bg-white hover:border-bg-primary focus:ring-2 focus:ring-bg-primary">
          <SelectValue placeholder="-- Choose Status --" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg">
          {Object.entries(PREPARATION_STATUSES)
            .filter(
              ([key]) =>
                statusOrder.indexOf(key) >= statusOrder.indexOf(currentLowestStatus)
            )
            .map(([key, value]) => (
              <SelectItem
                key={key}
                value={key}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <value.icon size={16} className={value.color} />
                  <span>{value.label}</span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Button
        onClick={onApplyStatus}
        className="bg-bg-primary text-white hover:bg-purple-700 text-sm"
        disabled={selectedItems.length === 0 || !bulkStatus || isLoading}
      >
        {t("ApplyStatus", { count: selectedItems.length })}
      </Button>
      <Button
        onClick={onTransferOrder}
        className="bg-purple-700 text-white hover:bg-bg-primary text-sm flex items-center gap-1"
        disabled={isLoading}
      >
        {t("ChangeTable")}
      </Button>
    </div>
  );
}
