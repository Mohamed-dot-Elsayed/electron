import React from "react";
import ItemRow from "./ItemRow";

export default function OrderTable({
  orderItems,
  orderType,
  selectedItems,
  selectedPaymentItems,
  onToggleSelectItem,
  onToggleSelectPaymentItem,
  onSelectAll,
  onIncrease,
  onDecrease,
  onUpdateStatus,
  onVoidItem,
  onRemoveFrontOnly,
  allowQuantityEdit,
  itemLoadingStates,
  updateOrderItems,
  t,
}) {
  return (
    <div className="bg-white rounded-xl overflow-x-auto border border-gray-100 shadow-sm">
      <table className="w-full text-sm min-w-[600px] md:min-w-full">
        {/* Table Header */}
        <thead>
          <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            {orderType === "dine_in" && (
              <th className="py-2.5 px-3 text-center">
                <input
                  type="checkbox"
                  checked={
                    selectedItems.length > 0 &&
                    selectedItems.length === orderItems.length
                  }
                  onChange={onSelectAll}
                  className="w-3.5 h-3.5 accent-purple-600 rounded cursor-pointer"
                />
              </th>
            )}
            <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              {t("Item")}
            </th>
            <th className="py-2.5 px-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              {t("Price")}
            </th>
            <th className="py-2.5 px-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              {t("Quantity")}
            </th>
            {orderType === "dine_in" && (
              <th className="py-2.5 px-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                {t("Preparation")}
              </th>
            )}
            {orderType === "dine_in" && (
              <th className="py-2.5 px-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                {t("Pay")}
              </th>
            )}
            <th className="py-2.5 px-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              {t("Total")}
            </th>
            <th className="py-2.5 px-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              {t("Void")}
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-50">
          {orderItems.length === 0 ? (
            <tr>
              <td
                colSpan={orderType === "dine_in" ? 8 : 5}
                className="text-center py-10 text-gray-400"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🛒</span>
                  </div>
                  <p className="text-sm font-medium text-gray-400">{t("NoItemsFound")}</p>
                </div>
              </td>
            </tr>
          ) : (
            orderItems.map((item, index) => (
              <ItemRow
                key={item.temp_id || `${item.id}-${index}`}
                item={item}
                orderType={orderType}
                selectedItems={selectedItems}
                toggleSelectItem={onToggleSelectItem}
                selectedPaymentItems={selectedPaymentItems}
                toggleSelectPaymentItem={onToggleSelectPaymentItem}
                handleIncrease={onIncrease}
                handleDecrease={onDecrease}
                allowQuantityEdit={allowQuantityEdit}
                itemLoadingStates={itemLoadingStates}
                handleUpdatePreparationStatus={onUpdateStatus}
                handleVoidItem={onVoidItem}
                handleRemoveFrontOnly={onRemoveFrontOnly}
                updateOrderItems={updateOrderItems}
                orderItems={orderItems}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
