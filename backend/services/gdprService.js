/**
 * GDPR Compliance Service
 * 
 * Handles Data Subject Access Requests (DSAR), legal holds, and data retention
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Invoice from '../models/Invoice.js';
import Purchase from '../models/Purchase.js';
import JournalEntry from '../models/JournalEntry.js';

/**
 * DSAR Status Model
 */
const DSARSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    requestType: {
        type: String,
        enum: ['access', 'erasure', 'portability', 'rectification'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'rejected'],
        default: 'pending',
        index: true
    },
    requestedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    completedAt: Date,
    dataExportPath: String,
    notes: String,
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

const DSAR = mongoose.model('DSAR', DSARSchema);

/**
 * Legal Hold Model
 */
const LegalHoldSchema = new mongoose.Schema({
    holdId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    entityType: {
        type: String,
        enum: ['user', 'customer', 'transaction', 'document'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    reason: {
        type: String,
        required: true
    },
    caseNumber: String,
    startDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    endDate: Date,
    status: {
        type: String,
        enum: ['active', 'released'],
        default: 'active',
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    releasedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    releasedAt: Date
}, { timestamps: true });

const LegalHold = mongoose.model('LegalHold', LegalHoldSchema);

/**
 * Create DSAR request
 */
export async function createDSAR(userId, organizationId, requestType, notes = '') {
    const requestId = `DSAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const dsar = await DSAR.create({
        requestId,
        userId,
        organizationId,
        requestType,
        notes,
        status: 'pending'
    });

    console.log(`📋 DSAR created: ${requestId} (${requestType})`);

    return dsar;
}

/**
 * Process DSAR - Export all user data
 */
export async function processDSAR(dsarId, processedBy) {
    const dsar = await DSAR.findById(dsarId);

    if (!dsar) {
        throw new Error('DSAR not found');
    }

    if (dsar.status !== 'pending') {
        throw new Error(`DSAR already ${dsar.status}`);
    }

    // Update status
    dsar.status = 'processing';
    dsar.processedBy = processedBy;
    await dsar.save();

    try {
        // Collect all user data
        const userData = await collectUserData(dsar.userId, dsar.organizationId);

        // Export to JSON
        const exportPath = `exports/dsar/${dsar.requestId}.json`;
        const fs = await import('fs');
        const path = await import('path');

        const exportDir = path.dirname(exportPath);
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        fs.writeFileSync(exportPath, JSON.stringify(userData, null, 2));

        // Mark as completed
        dsar.status = 'completed';
        dsar.completedAt = new Date();
        dsar.dataExportPath = exportPath;
        await dsar.save();

        console.log(`✅ DSAR completed: ${dsar.requestId}`);

        return { success: true, exportPath, data: userData };

    } catch (error) {
        dsar.status = 'rejected';
        dsar.notes = `Error: ${error.message}`;
        await dsar.save();

        throw error;
    }
}

/**
 * Collect all user data for DSAR
 */
async function collectUserData(userId, organizationId) {
    const user = await User.findById(userId).lean();

    const customers = await Customer.find({
        createdBy: userId,
        organizationId
    }).lean();

    const invoices = await Invoice.find({
        createdBy: userId,
        organizationId
    }).lean();

    const purchases = await Purchase.find({
        createdBy: userId,
        organizationId
    }).lean();

    const journalEntries = await JournalEntry.find({
        createdBy: userId,
        organization: organizationId
    }).lean();

    return {
        user: {
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        },
        customers,
        invoices,
        purchases,
        journalEntries,
        exportedAt: new Date(),
        requestType: 'DSAR'
    };
}

/**
 * Erase user data (GDPR Right to Erasure)
 */
export async function eraseUserData(userId, organizationId, processedBy) {
    // Check for legal holds
    const activeLegalHold = await LegalHold.findOne({
        entityType: 'user',
        entityId: userId,
        status: 'active'
    });

    if (activeLegalHold) {
        throw new Error(`Cannot erase data: Active legal hold ${activeLegalHold.holdId}`);
    }

    const session = await mongoose.startSession();

    try {
        return await session.withTransaction(async () => {
            // Anonymize user
            await User.findByIdAndUpdate(
                userId,
                {
                    name: 'DELETED USER',
                    email: `deleted-${userId}@anonymized.local`,
                    password: 'REDACTED',
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletedBy: processedBy
                },
                { session }
            );

            // Anonymize related customer data
            await Customer.updateMany(
                { createdBy: userId, organizationId },
                {
                    $set: {
                        contactPerson: 'REDACTED',
                        contactNo: 'REDACTED',
                        email: 'redacted@anonymized.local'
                    }
                },
                { session }
            );

            console.log(`🗑️  User data erased: ${userId}`);

            return { success: true, userId, erasedAt: new Date() };
        });
    } finally {
        session.endSession();
    }
}

/**
 * Create legal hold
 */
export async function createLegalHold(organizationId, entityType, entityId, reason, caseNumber, createdBy) {
    const holdId = `HOLD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const legalHold = await LegalHold.create({
        holdId,
        organizationId,
        entityType,
        entityId,
        reason,
        caseNumber,
        createdBy,
        status: 'active'
    });

    console.log(`🔒 Legal hold created: ${holdId}`);

    return legalHold;
}

/**
 * Release legal hold
 */
export async function releaseLegalHold(holdId, releasedBy) {
    const legalHold = await LegalHold.findOne({ holdId });

    if (!legalHold) {
        throw new Error('Legal hold not found');
    }

    if (legalHold.status !== 'active') {
        throw new Error('Legal hold already released');
    }

    legalHold.status = 'released';
    legalHold.releasedBy = releasedBy;
    legalHold.releasedAt = new Date();
    legalHold.endDate = new Date();

    await legalHold.save();

    console.log(`🔓 Legal hold released: ${holdId}`);

    return legalHold;
}

/**
 * Check if entity has active legal hold
 */
export async function hasActiveLegalHold(entityType, entityId) {
    const hold = await LegalHold.findOne({
        entityType,
        entityId,
        status: 'active'
    });

    return !!hold;
}

/**
 * Get all DSARs for organization
 */
export async function getDSARs(organizationId, status = null) {
    const query = { organizationId };
    if (status) {
        query.status = status;
    }

    return await DSAR.find(query)
        .populate('userId', 'name email')
        .populate('processedBy', 'name')
        .sort({ requestedAt: -1 });
}

/**
 * Get all legal holds for organization
 */
export async function getLegalHolds(organizationId, status = null) {
    const query = { organizationId };
    if (status) {
        query.status = status;
    }

    return await LegalHold.find(query)
        .populate('createdBy', 'name')
        .populate('releasedBy', 'name')
        .sort({ startDate: -1 });
}

export default {
    createDSAR,
    processDSAR,
    eraseUserData,
    createLegalHold,
    releaseLegalHold,
    hasActiveLegalHold,
    getDSARs,
    getLegalHolds,
    DSAR,
    LegalHold
};
