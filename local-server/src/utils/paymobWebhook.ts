import { Request, Response } from "express";
import crypto from "crypto";
import { OrderModel } from "../models/order";
import { PaymobModel } from "../models/paymob";

const valueToHmacString = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
};

const buildPaymobTransactionHmacPayload = (obj: any) => {
  const parts = [
    obj?.amount_cents,
    obj?.created_at,
    obj?.currency,
    obj?.error,
    obj?.has_parent_transaction,
    obj?.id,
    obj?.integration_id,
    obj?.is_3d_secure,
    obj?.is_auth,
    obj?.is_capture,
    obj?.is_refunded,
    obj?.is_standalone_payment,
    obj?.is_voided,
    obj?.order?.id,
    obj?.owner,
    obj?.pending,
    obj?.source_data?.pan,
    obj?.source_data?.sub_type,
    obj?.source_data?.type,
    obj?.success,
  ];

  return parts.map(valueToHmacString).join("");
};

export const paymobWebhook = async (req: Request, res: Response) => {
  try {
    const hmacHeader = String(req.query.hmac || req.body?.hmac || "")
      .trim()
      .toLowerCase();
    const rawPayload = JSON.stringify(req.body);
    const data = req.body?.obj || req.body;

    const queryMerchantOrderId = String(
      req.query?.merchant_order_id || ""
    ).trim();
    const queryPaymobOrderId = String(
      req.query?.order || req.query?.order_id || ""
    ).trim();
    const queryTransactionId = String(req.query?.id || "").trim();
    const querySuccessRaw = req.query?.success;
    const queryAmountCentsRaw = req.query?.amount_cents;
    const strictHmac =
      String(process.env.PAYMOB_STRICT_HMAC || "").toLowerCase() === "true";

    const paymobConfigs = PaymobModel.find().map(
      ({ hmac_key, integration_id, isActive }) => ({
        hmac_key,
        integration_id,
        isActive,
      })
    );

    const integrationId = String(data?.integration_id || "").trim();
    const configByIntegration = paymobConfigs.find(
      (cfg: any) => String(cfg.integration_id || "").trim() === integrationId
    );
    const activeConfig = paymobConfigs.find(
      (cfg: any) => cfg.isActive === true
    );

    const candidateSecretKeys = Array.from(
      new Set(
        [
          process.env.PAYMOB_HMAC_KEY,
          process.env.PAYMOB_HMAC_SECRET,
          process.env.PAYMOB_SECRET_KEY,
          configByIntegration?.hmac_key,
          activeConfig?.hmac_key,
          ...paymobConfigs.map((cfg: any) => cfg.hmac_key),
        ]
          .map((key) => String(key || "").trim())
          .filter((key) => key.length > 0)
      )
    );

    let isHmacValid = !hmacHeader;
    if (hmacHeader && req.body && Object.keys(req.body).length > 0) {
      if (candidateSecretKeys.length === 0) {
        return res.status(500).json({
          success: false,
          message: "No Paymob HMAC key is configured",
        });
      }

      const payloadCandidates = Array.from(
        new Set([
          rawPayload,
          buildPaymobTransactionHmacPayload(req.body?.obj),
          buildPaymobTransactionHmacPayload(data),
        ])
      );

      isHmacValid = false;
      for (const secretKey of candidateSecretKeys) {
        for (const payloadCandidate of payloadCandidates) {
          const generatedHash = crypto
            .createHmac("sha512", secretKey)
            .update(payloadCandidate)
            .digest("hex")
            .toLowerCase();

          if (generatedHash === hmacHeader) {
            isHmacValid = true;
            break;
          }
        }

        if (isHmacValid) break;
      }

      if (!isHmacValid && strictHmac) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid HMAC" });
      }
    }

    const merchantOrderId = String(
      data?.order?.merchant_order_id ||
        data?.merchant_order_id ||
        queryMerchantOrderId ||
        ""
    ).trim();
    const paymobOrderId = String(
      data?.order?.id || data?.order || queryPaymobOrderId || ""
    ).trim();
    const isSuccess =
      data?.success === true ||
      String(querySuccessRaw || "").toLowerCase() === "true" ||
      String(querySuccessRaw || "") === "1";

    let order = null;

    if (merchantOrderId) {
      order = await OrderModel.findById(merchantOrderId);
    }

    if (!order && paymobOrderId) {
      order = await OrderModel.findOne({ paymobOrderId });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found for Paymob callback",
      });
    }

    if (String(order.paymentGateway || "") !== "paymob") {
      return res
        .status(400)
        .json({ success: false, message: "Order is not a Paymob order" });
    }

    if (
      paymobOrderId &&
      order.paymobOrderId &&
      String(order.paymobOrderId) !== paymobOrderId
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Paymob order id mismatch" });
    }

    const callbackAmountCents = Number(
      data?.amount_cents ?? queryAmountCentsRaw ?? NaN
    );
    const orderAmountCents = Math.round(
      Number(order.totalOrderPrice || 0) * 100
    );
    if (
      !Number.isNaN(callbackAmountCents) &&
      callbackAmountCents > 0 &&
      callbackAmountCents !== orderAmountCents
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Amount mismatch" });
    }

    order.paymentStatus = isSuccess ? "paid" : "failed";
    order.status = isSuccess ? "confirmed" : "rejected";
    order.paymobTransactionId = data?.id
      ? String(data.id)
      : queryTransactionId || order.paymobTransactionId;
    order.paymobCallbackPayload = {
      callback: Object.keys(req.body || {}).length > 0 ? data : req.query,
      hmacVerified: isHmacValid,
      hmacProvided: !!hmacHeader,
      hmacStrictMode: strictHmac,
    };
    await order.save();

    return res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
