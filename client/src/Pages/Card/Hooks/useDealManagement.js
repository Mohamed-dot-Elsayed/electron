import { useState } from "react";
import { toast } from "react-toastify";

export function useDealManagement(orderItems, updateOrderItems, t) {
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealCode, setDealCode] = useState("");
  const [pendingDealApproval, setPendingDealApproval] = useState(null);

  const handleApplyDeal = async (postData) => {
    if (!dealCode.trim()) {
      toast.warning(t("Pleaseenteradealcode"));
        return;
    }
    const formData = new FormData();
    formData.append("code", dealCode.trim());
    try {
        const response = await postData("cashier/deal/check_order", formData);
        let dealData = response?.deal || response?.data?.deal;
        if (dealData && !Array.isArray(dealData)) {
            dealData = [dealData];
        }
        const appliedDealDetails =
        Array.isArray(dealData) && dealData.length > 0 ? dealData[0] : null;
        if (appliedDealDetails) {
        const dealInfo = appliedDealDetails.deal;
        if (dealInfo) {
            toast.success(t("DealvalidatedsuccessfullyPleaseconfirm")); 
            setPendingDealApproval({
            deal_order_id: appliedDealDetails.id,
            user_id: appliedDealDetails.user_id,
            deal_title: dealInfo.title,
            deal_price: parseFloat(dealInfo.price),
            description: dealInfo.description,
            });
            setShowDealModal(false);
        }   else {
            toast.error(t("Dealdetailsareincompleteintheresponse"));
        }
        }   else {
        toast.error(t("Dealdetailsareincompleteintheresponse"));
        }       
    }   catch (err) {
        if (err.response?.status === 404 || err.response?.status === 400) {
        toast.error(
            err.response?.data?.message || t("Failedtofetchdealdata")
        );
        }   else {
        toast.error(t("FailedtovalidatedealPleasetryagain"));
        }
    }
    };
    const handleApproveDeal = async (postData) => {
    if (!pendingDealApproval) return;
    const formData = new FormData();
    formData.append("deal_order_id", pendingDealApproval.deal_order_id);
    try {
        await postData("cashier/deal/apply_order", formData);
        toast.success(t("Dealsuccessfullyappliedtoorder"));
        updateOrderItems([...orderItems, { ...pendingDealApproval }]);
        setPendingDealApproval(null);
    }   catch (err) {
        toast.error(t("FailedtoapplydealPleasetryagain",err));
    }   
    };

  return {
    showDealModal,
    setShowDealModal,
    dealCode,
    setDealCode,
    pendingDealApproval,
    handleApplyDeal,
    handleApproveDeal,
  };
}
