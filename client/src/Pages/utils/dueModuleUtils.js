// utils/dueModuleUtils.js
import { useMemo } from "react";

export const useIsDueModuleAllowed = (orderType, groupProducts) => {
  return useMemo(() => {
    if (!orderType || !Array.isArray(groupProducts) || groupProducts.length === 0) {
      return false;
    }

    const lastSelectedGroupId = sessionStorage.getItem("last_selected_group");

    // لو مفيش group مختار أو "all" → false
    if (!lastSelectedGroupId || lastSelectedGroupId === "all" || lastSelectedGroupId === "null") {
      return false;
    }

    const groupId = parseInt(lastSelectedGroupId, 10);
    if (isNaN(groupId)) return false;

    // ابحث عن الجروب بالـ id
    const selectedGroup = groupProducts.find(g => g.id === groupId);

    // لو الجروب موجود و due = 1 → true
    return !!selectedGroup && selectedGroup.due === 1;

  }, [orderType, groupProducts]); // ← مهم جدًا إن groupProducts تكون في الـ dependencies
};