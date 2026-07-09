import axios from "axios";
import crypto from "crypto";

const FAWRY_STAGING_URL = "https://atfawry.fawrystaging.com";
const FAWRY_PRODUCTION_URL = "https://atfawry.com";

export type FawryItem = {
    itemId: string;
    description: string;
    price: number;
    quantity: number;
};

type FawryInitInput = {
    merchantCode: string;
    secureKey: string;
    merchantRefNum: string;
    customerProfileId: string;
    customerName: string;
    customerMobile: string;
    customerEmail: string;
    amount: number;
    returnUrl: string;
    items: FawryItem[];
    isSandbox: boolean;
};

export class FawryService {
    static generateSignature(
        merchantCode: string,
        merchantRefNum: string,
        customerProfileId: string,
        returnUrl: string,
        items: FawryItem[],
        secureKey: string
    ): string {
        let itemsString = "";
        items.forEach(item => {
            const formattedPrice = Number(item.price).toFixed(2);
            itemsString += `${item.itemId}${item.quantity}${formattedPrice}`;
        });

        const stringToHash = `${merchantCode}${merchantRefNum}${customerProfileId}${returnUrl}${itemsString}${secureKey}`;
        return crypto.createHash("sha256").update(stringToHash).digest("hex");
    }

    static async createChargeRequest(data: FawryInitInput) {
        const baseUrl = data.isSandbox ? FAWRY_STAGING_URL : FAWRY_PRODUCTION_URL;
        const endpoint = `${baseUrl}/ECommerceWeb/Fawry/payments/charge`;

        const signature = this.generateSignature(
            data.merchantCode,
            data.merchantRefNum,
            data.customerProfileId,
            data.returnUrl,
            data.items,
            data.secureKey
        );

        const payload = {
            merchantCode: data.merchantCode,
            merchantRefNum: data.merchantRefNum,
            customerProfileId: data.customerProfileId || "guest",
            customerName: data.customerName,
            customerMobile: data.customerMobile || "01000000000",
            customerEmail: data.customerEmail || "guest@systego.com",
            amount: Number(data.amount).toFixed(2),
            currencyCode: "EGP",
            language: "ar-eg",
            chargeItems: data.items.map(item => ({
                itemId: item.itemId,
                description: item.description,
                price: Number(item.price).toFixed(2),
                quantity: item.quantity
            })),
            signature: signature,
            returnUrl: data.returnUrl,
            authCaptureModeEnum: "PAY_NOW"
        };

        const response = await axios.post(endpoint, payload);
        return response.data;
    }
}