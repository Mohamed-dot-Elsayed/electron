import { BadRequest } from "../Errors/BadRequest";
import axios from "axios";

const GEIDEA_API_BASE_URL = process.env.GEIDEA_API_BASE_URL || "https://api.geidea.net";
const GEIDEA_CALLBACK_URL = process.env.GEIDEA_CALLBACK_URL || "https://bcknd.systego.net/api/store/order/webhook/geidea";
const GEIDEA_RETURN_URL = process.env.GEIDEA_RETURN_URL || "https://your-frontend.com/payment/success";

type GeideaConfig = {
    publicKey: string;
    apiPassword: string;
};

type GeideaInitInput = {
    localOrderId: string;
    amount: number;
    geideaConfig: GeideaConfig;
    customer: any;
    address: any;
};

type GeideaSessionResponse = {
    session?: {
        id?: string;
    };
};

export const initializeGeideaPayment = async ({
    localOrderId,
    amount,
    geideaConfig,
    customer,
    address,
}: GeideaInitInput) => {
    const credentials = Buffer.from(`${geideaConfig.publicKey}:${geideaConfig.apiPassword}`).toString("base64");
    const authHeader = `Basic ${credentials}`;

    const response = await axios.post<GeideaSessionResponse>(
        `${GEIDEA_API_BASE_URL}/pgw/api/v1/direct/session`,
        {
            amount: amount,
            currency: "EGP",
            merchantReferenceId: localOrderId,
            callbackUrl: GEIDEA_CALLBACK_URL,
            returnUrl: GEIDEA_RETURN_URL,
            customerEmail: customer?.email || "no-reply@example.com",
            billingAddress: {
                street: address?.street || "NA",
                city: (address?.city as any)?.name || "NA",
                country: "EGY",
            },
        },
        {
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
        }
    );

    const data = response.data as GeideaSessionResponse;

    if (!data?.session?.id) {
        throw new BadRequest("Failed to create Geidea session");
    }

    return {
        geideaSessionId: data.session.id,
        iframeUrl: `https://pay.geidea.net/hosted?sessionId=${data.session.id}`,
    };
};