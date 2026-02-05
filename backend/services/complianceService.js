import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Invoice from '../models/Invoice.js';
import Purchase from '../models/Purchase.js';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

/**
 * GDPR Compliance Service
 * Handles data export, erasure, and consent management
 */

/**
 * Export all user data (GDPR Right to Data Portability)
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} User data export
 */
export async function exportUserData(userId) {
    try {
        const user = await User.findById(userId).lean();

        if (!user) {
            throw new Error('User not found');
        }

        // Collect all user data
        const userData = {
            profile: {
                email: user.email,
                name: user.name,
                shopName: user.shopName,
                phone: user.phone,
                address: user.address,
                city: user.city,
                state: user.state,
                pincode: user.pincode,
                gstNumber: user.gstNumber,
                createdAt: user.createdAt
            },

            activity: {
                lastLoginAt: user.lastLoginAt,
                lastActiveAt: user.lastActiveAt,
                loginHistory: user.loginHistory || []
            },

            transactions: await Transaction.find({ user: userId }).lean(),
            invoices: await Invoice.find({ createdBy: userId }).lean(),
            purchases: await Purchase.find({ createdBy: userId }).lean()
        };

        return {
            success: true,
            data: userData,
            exportedAt: new Date(),
            format: 'JSON'
        };

    } catch (error) {
        throw new Error(`Failed to export user data: ${error.message}`);
    }
}

/**
 * Erase user data (GDPR Right to be Forgotten)
 * @param {ObjectId} userId - User ID
 * @param {String} reason - Erasure reason
 * @returns {Promise<Object>} Erasure result
 */
export async function eraseUserData(userId, reason = 'User request') {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        // Anonymize user data (don't delete for audit trail)
        user.email = `deleted_${userId}@anonymized.local`;
        user.name = 'Deleted User';
        user.phone = null;
        user.address = null;
        user.city = null;
        user.state = null;
        user.pincode = null;
        user.gstNumber = null;
        user.password = null;
        user.isDeleted = true;
        user.deletedAt = new Date();
        user.deletionReason = reason;
        user.loginHistory = [];
        user.deviceFingerprints = [];

        await user.save();

        // Anonymize related data
        await Transaction.updateMany(
            { user: userId },
            {
                $set: {
                    'metadata.anonymized': true,
                    'metadata.anonymizedAt': new Date()
                }
            }
        );

        return {
            success: true,
            message: 'User data anonymized successfully',
            userId,
            erasedAt: new Date()
        };

    } catch (error) {
        throw new Error(`Failed to erase user data: ${error.message}`);
    }
}

/**
 * Get user consent status
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Consent status
 */
export async function getUserConsent(userId) {
    try {
        const user = await User.findById(userId).select('consent').lean();

        if (!user) {
            throw new Error('User not found');
        }

        return {
            success: true,
            consent: user.consent || {
                marketing: false,
                analytics: false,
                thirdParty: false,
                consentedAt: null
            }
        };

    } catch (error) {
        throw new Error(`Failed to get consent: ${error.message}`);
    }
}

/**
 * Update user consent
 * @param {ObjectId} userId - User ID
 * @param {Object} consentData - Consent preferences
 * @returns {Promise<Object>} Updated consent
 */
export async function updateUserConsent(userId, consentData) {
    try {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        user.consent = {
            ...consentData,
            consentedAt: new Date()
        };

        await user.save();

        return {
            success: true,
            consent: user.consent
        };

    } catch (error) {
        throw new Error(`Failed to update consent: ${error.message}`);
    }
}

/**
 * Generate data retention report
 * @param {ObjectId} organizationId - Organization ID
 * @returns {Promise<Object>} Retention report
 */
export async function generateRetentionReport(organizationId) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 7); // 7 years retention

        const oldTransactions = await Transaction.countDocuments({
            createdAt: { $lt: cutoffDate }
        });

        const oldInvoices = await Invoice.countDocuments({
            createdAt: { $lt: cutoffDate }
        });

        const inactiveUsers = await User.countDocuments({
            lastActiveAt: { $lt: cutoffDate },
            isDeleted: false
        });

        return {
            success: true,
            retentionPolicy: '7 years',
            cutoffDate,
            itemsForArchival: {
                transactions: oldTransactions,
                invoices: oldInvoices,
                inactiveUsers
            }
        };

    } catch (error) {
        throw new Error(`Failed to generate retention report: ${error.message}`);
    }
}

export default {
    exportUserData,
    eraseUserData,
    getUserConsent,
    updateUserConsent,
    generateRetentionReport
};
