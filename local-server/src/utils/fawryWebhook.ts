import { Request, Response } from "express";
import crypto from "crypto";
import { OrderModel } from "../models/order";
import { FawryModel } from "../models/fawry";
export const fawryWebhook = async (req: Request, res: Response) => {
    try {
        const payload = req.body;
        
        const {
            requestId,
            fawryRefNumber,
            merchantRefNumber,
            customerMobile,
            customerMail,
            paymentAmount,
            orderAmount,
            fawryFees,
            shippingFees,
            orderStatus,
            paymentMethod,
            messageSignature,
            paymentRefrenceNumber
        } = payload;

        if (!merchantRefNumber || !fawryRefNumber) {
            return res.status(400).send("Invalid Payload");
        }

        const order = await OrderModel.findById(merchantRefNumber);
        if (!order) {
            return res.status(404).send("Order not found");
        }

        if (String(order.paymentGateway || "") !== "fawry") {
            return res.status(400).send("Order is not a Fawry order");
        }

        const fawryConfig = await FawryModel.findOne({
            payment_method_id: order.paymentMethod,
            isActive: true,
        });

        if (!fawryConfig) {
            return res.status(500).send("Fawry configuration not found");
        }

        const hashString = `${fawryRefNumber}${merchantRefNumber}${Number(paymentAmount).toFixed(2)}${Number(orderAmount).toFixed(2)}${orderStatus}${paymentMethod}${paymentRefrenceNumber || ""}${fawryConfig.secureKey}`;
        
        const expectedSignature = crypto.createHash("sha256").update(hashString).digest("hex");

        const isSignatureValid = expectedSignature.toLowerCase() === messageSignature?.toLowerCase();

        if (!isSignatureValid && process.env.FAWRY_STRICT_SIGNATURE === "true") {
            return res.status(400).send("Invalid Signature");
        }

        (order as any).fawryTransactionId = fawryRefNumber;
        (order as any).fawryCallbackPayload = {
            callback: payload,
            signatureVerified: isSignatureValid,
        };
        order.markModified("fawryCallbackPayload");

        const statusLower = String(orderStatus).toLowerCase();
        
        if (statusLower === "paid" || statusLower === "new") {
            if (order.paymentStatus === "paid" && order.status === "confirmed") {
                return res.status(200).send("Already processed");
            }
            order.status = "processing";
            order.paymentStatus = "paid";
            await order.save();
            return res.status(200).send("OK");
        }

        if (statusLower === "canceled" || statusLower === "failed" || statusLower === "expired") {
            order.status = "rejected";
            order.paymentStatus = "failed";
            await order.save();
            return res.status(200).send("OK");
        }

        order.paymentStatus = "pending";
        await order.save();
        return res.status(200).send("OK");

    } catch (error: any) {
        console.error("Fawry Webhook Error:", error);
        return res.status(500).send("Server Error");
    }
};