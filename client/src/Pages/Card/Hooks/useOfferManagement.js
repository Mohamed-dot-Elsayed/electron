// Hooks/useOfferManagement.js
import { useState } from "react";
import { toast } from "react-toastify";

export function useOfferManagement(orderItems, updateOrderItems, postData, t) {
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerCode, setOfferCode] = useState("");
  const [pendingOfferApproval, setPendingOfferApproval] = useState(null);
  const [approvedOfferData, setApprovedOfferData] = useState(null);

  const handleApplyOffer = async () => {
    const code = offerCode.trim();
    if (!code) {
      toast.warning(t("Pleaseenteranoffercode"));
      return;
    }

    const formData = new FormData();
    formData.append("code", code);

    try {
      const response = await postData("cashier/offer/check_order", formData);

      // الـ response عندك هو { offer: { ... } }
      const offerRecord = response?.offer || response?.data?.offer || response;

      if (!offerRecord || !offerRecord.id) {
        toast.error(t("InvalidorExpiredOfferCode"));
        return;
      }

      // أهم حاجة: offer_order_id هو offerRecord.id (يعني 1)
      const offer_order_id = offerRecord.id; // ده اللي هنبعته للـ approve
      const user_id = offerRecord.user_id;
      const productName = offerRecord.offer?.product || offerRecord.product || "Free Item";
      const points = offerRecord.offer?.points || offerRecord.points || 0;

      if (!offer_order_id || !user_id) {
        toast.error("بيانات العرض ناقصة");
        return;
      }

      toast.success(t("OffervalidatedsuccessfullyPleaseconfirm"));

      setPendingOfferApproval({
        offer_order_id: offer_order_id.toString(),
        user_id: user_id.toString(),
        product: productName,
        points,
        code: offerRecord.code, // اختياري: عشان نعرضه في الرسالة لو عايز
      });

      setShowOfferModal(false);
    } catch (err) {
      const msg = err.response?.data?.message || t("InvalidorExpiredOfferCode");
      toast.error(msg);
    }
  };

  const handleApproveOffer = () => {
    if (!pendingOfferApproval) return;

    const { offer_order_id, user_id, product } = pendingOfferApproval;

    setApprovedOfferData({
      offer_order_id,
      user_id,
      product,
    });

    const freeItem = {
      temp_id: `reward-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${product} (${t("RewardItem")})`,
      name_ar: `${product} (مكافأة)`,
      price: 0,
      originalPrice: 0,
      count: 1,
      quantity: 1,
      is_reward: true,
      reward_offer_id: offer_order_id, // 1
    };

    updateOrderItems(prev => [...prev, freeItem]);
    toast.success(t("RewardItemAddedToOrder"));

    setPendingOfferApproval(null);
    setOfferCode("");
  };

  const applyApprovedOffer = async () => {
    if (!approvedOfferData) return false;

    const { offer_order_id, user_id } = approvedOfferData;

    const formData = new FormData();
    formData.append("offer_order_id", offer_order_id); // هنا بيتبعت 1 (الـ id الصحيح)
    formData.append("user_id", user_id);

    try {
      const res = await postData("cashier/offer/approve_offer", formData);

      if (res?.success || res?.message?.toLowerCase().includes("success")) {
        toast.success(t("OfferAppliedSuccessfully"));
        setApprovedOfferData(null);
        return true;
      } else {
        throw new Error("Failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t("FailedToApplyOffer"));
      return false;
    }
  };

  const cancelApprovedOffer = () => {
    if (!approvedOfferData) return;

    updateOrderItems(prev =>
      prev.filter(item => !(item.is_reward && item.reward_offer_id === approvedOfferData.offer_order_id))
    );

    setApprovedOfferData(null);
    toast.info(t("OfferCancelled"));
  };

  return {
    showOfferModal,
    setShowOfferModal,
    offerCode,
    setOfferCode,
    pendingOfferApproval,
    handleApplyOffer,
    handleApproveOffer,
    approvedOfferData,
    applyApprovedOffer,
    cancelApprovedOffer,
  };
}