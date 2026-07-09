import axios from "axios";
import { AppError } from "../Errors/appError";/**
 * Reusable axios client for the PleskVersionUpdater microservice.
 * Reads config from environment variables:
 *   - VERSION_UPDATER_URL  (e.g. http://localhost:3500)
 *   - VERSION_UPDATER_API_KEY
 */

const getClient = () => {
    const baseURL = process.env.VERSION_UPDATER_URL;
    const apiKey = process.env.VERSION_UPDATER_API_KEY;

    if (!baseURL) {
        throw new Error("VERSION_UPDATER_URL is not configured in .env");
    }
    if (!apiKey) {
        throw new Error("VERSION_UPDATER_API_KEY is not configured in .env");
    }

    return axios.create({
        baseURL,
        timeout: 120_000, // 2 minutes — syncs can take a while
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
        },
    });
};

// ─── Public helpers ────────────────────────────────────────────────

const handleAxiosError = (error: any) => {
    if (error && error.isAxiosError && error.response) {
        const status = error.response.status;
        const responseData = error.response.data;
        const message = responseData?.message || responseData?.error || "Version Updater Service Error";
        const details = responseData?.details || responseData;
        throw new AppError(message, status, details);
    }
    throw error;
};

/** Dry-run: compare base vs client and return diff report */
export const checkForChanges = async (clientName: string) => {
    try {
        const { data } = await getClient().post("/api/update/check", { clientName });
        return data;
    } catch (error) {
        return handleAxiosError(error);
    }
};

/** Full sync: frontend + backend */
export const syncAll = async (clientName: string) => {
    try {
        const { data } = await getClient().post("/api/update/sync", { clientName });
        return data;
    } catch (error) {
        return handleAxiosError(error);
    }
};

/** Sync frontend only */
export const syncFrontend = async (clientName: string) => {
    try {
        const { data } = await getClient().post("/api/update/sync-frontend", { clientName });
        return data;
    } catch (error) {
        return handleAxiosError(error);
    }
};

/** Sync backend only */
export const syncBackend = async (clientName: string) => {
    try {
        const { data } = await getClient().post("/api/update/sync-backend", { clientName });
        return data;
    } catch (error) {
        return handleAxiosError(error);
    }
};
