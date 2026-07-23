import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * مودال تعيين موظف التوصيل
 * 
 * الوظيفة:
 * - عرض قائمة بموظفي التوصيل المتاحين
 * - تعيين موظف توصيل للطلب
 * - السماح بتخطي هذه الخطوة والتعيين لاحقاً
 */
const DeliveryAssignmentModal = ({
  isOpen,
  onClose,
  deliveryList,
  selectedDeliveryId,
  setSelectedDeliveryId,
  onAssign,
  onSkip,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="relative w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-4 text-bg-primary text-center">
          Assign Delivery Man
        </h2>

        <div className="space-y-4">
          {/* اختيار موظف التوصيل */}
          <Select
            value={selectedDeliveryId}
            onValueChange={(val) => setSelectedDeliveryId(val)}
          >
            <SelectTrigger className="border rounded-md w-full">
              <SelectValue placeholder="Select a delivery person" />
            </SelectTrigger>
            <SelectContent>
              {deliveryList?.map((d) => (
                <SelectItem
                  className="text-bg-primary hover:bg-gray-100"
                  key={d.id}
                  value={String(d.id)}
                >
                  {d.f_name} {d.l_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* أزرار التحكم */}
          <div className="flex w-full space-x-2">
            <Button
              onClick={onAssign}
              className="flex-1 bg-bg-primary text-white hover:bg-bg-secondary rounded-md"
            >
              Assign Delivery
            </Button>
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              Skip
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryAssignmentModal;