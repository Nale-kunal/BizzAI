import crypto from "crypto";

/**
 * Generate a cryptographically secure device ID
 * @returns {string} 64-character hex string (32 bytes)
 */
export const generateDeviceId = () => {
    return crypto.randomBytes(32).toString("hex");
};

/**
 * Set secure deviceId cookie
 * @param {object} res - Express response object
 * @param {string} deviceId - Device identifier
 */
export const setDeviceIdCookie = (res, deviceId) => {
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("deviceId", deviceId, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "strict", // 'none' for cross-origin in production
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        signed: true,
    });
};

/**
 * Clear deviceId cookie
 * @param {object} res - Express response object
 */
export const clearDeviceIdCookie = (res) => {
    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("deviceId", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "strict",
        signed: true,
    });
};

/**
 * Get deviceId from signed cookie
 * @param {object} req - Express request object
 * @returns {string|null} Device ID or null if not present/invalid
 */
export const getDeviceIdFromCookie = (req) => {
    return req.signedCookies?.deviceId || null;
};
