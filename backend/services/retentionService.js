/**
 * Data Retention Job
 * 
 * Automatically deletes or archives data based on retention policies
 */

import mongoose from 'mongoose';
import cron from 'node-cron';
import Organization from '../models/Organization.js';
import JournalEntry from '../models/JournalEntry.js';
import Invoice from '../models/Invoice.js';
import Purchase from '../models/Purchase.js';
import { hasActiveLegalHold } from '../services/gdprService.js';

/**
 * Retention Policy Model
 */
const RetentionPolicySchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    dataType: {
        type: String,
        enum: ['invoices', 'purchases', 'journal_entries', 'audit_logs', 'user_data'],
        required: true
    },
    retentionPeriodDays: {
        type: Number,
        required: true,
        min: 1
    },
    action: {
        type: String,
        enum: ['delete', 'archive', 'anonymize'],
        default: 'archive'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastRunAt: Date,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

const RetentionPolicy = mongoose.model('RetentionPolicy', RetentionPolicySchema);

/**
 * Create retention policy
 */
export async function createRetentionPolicy(organizationId, dataType, retentionPeriodDays, action, createdBy) {
    const policy = await RetentionPolicy.create({
        organizationId,
        dataType,
        retentionPeriodDays,
        action,
        createdBy
    });

    console.log(`📋 Retention policy created: ${dataType} - ${retentionPeriodDays} days`);

    return policy;
}

/**
 * Run retention job for all active policies
 */
export async function runRetentionJob() {
    console.log('🔄 Starting retention job...');

    const policies = await RetentionPolicy.find({ isActive: true });

    let totalProcessed = 0;
    let totalDeleted = 0;
    let totalArchived = 0;

    for (const policy of policies) {
        try {
            const result = await processRetentionPolicy(policy);
            totalProcessed += result.processed;
            totalDeleted += result.deleted || 0;
            totalArchived += result.archived || 0;

            // Update last run time
            policy.lastRunAt = new Date();
            await policy.save();

        } catch (error) {
            console.error(`❌ Retention policy failed: ${policy._id}`, error);
        }
    }

    console.log(`✅ Retention job completed: ${totalProcessed} records processed, ${totalDeleted} deleted, ${totalArchived} archived`);

    return { totalProcessed, totalDeleted, totalArchived };
}

/**
 * Process individual retention policy
 */
async function processRetentionPolicy(policy) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);

    console.log(`📋 Processing policy: ${policy.dataType} (cutoff: ${cutoffDate.toISOString()})`);

    let processed = 0;
    let deleted = 0;
    let archived = 0;

    switch (policy.dataType) {
        case 'invoices':
            const invoices = await Invoice.find({
                organizationId: policy.organizationId,
                createdAt: { $lt: cutoffDate },
                isDeleted: false
            });

            for (const invoice of invoices) {
                // Check legal hold
                if (await hasActiveLegalHold('transaction', invoice._id)) {
                    console.log(`⚠️  Skipping invoice ${invoice.invoiceNo}: Active legal hold`);
                    continue;
                }

                if (policy.action === 'delete') {
                    invoice.isDeleted = true;
                    invoice.deletedAt = new Date();
                    await invoice.save();
                    deleted++;
                } else if (policy.action === 'archive') {
                    // Archive to cold storage (implement as needed)
                    archived++;
                }

                processed++;
            }
            break;

        case 'purchases':
            const purchases = await Purchase.find({
                organizationId: policy.organizationId,
                createdAt: { $lt: cutoffDate },
                isDeleted: false
            });

            for (const purchase of purchases) {
                if (await hasActiveLegalHold('transaction', purchase._id)) {
                    console.log(`⚠️  Skipping purchase ${purchase.purchaseNo}: Active legal hold`);
                    continue;
                }

                if (policy.action === 'delete') {
                    purchase.isDeleted = true;
                    purchase.deletedAt = new Date();
                    await purchase.save();
                    deleted++;
                } else if (policy.action === 'archive') {
                    archived++;
                }

                processed++;
            }
            break;

        case 'journal_entries':
            // Journal entries should typically never be deleted (audit trail)
            // Only archive to cold storage
            const entries = await JournalEntry.find({
                organization: policy.organizationId,
                createdAt: { $lt: cutoffDate }
            });

            for (const entry of entries) {
                if (policy.action === 'archive') {
                    // Archive to cold storage
                    archived++;
                }
                processed++;
            }
            break;

        default:
            console.log(`⚠️  Unknown data type: ${policy.dataType}`);
    }

    return { processed, deleted, archived };
}

/**
 * Schedule retention job (runs daily at 2 AM)
 */
export function scheduleRetentionJob() {
    // Run daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        console.log('⏰ Scheduled retention job triggered');
        try {
            await runRetentionJob();
        } catch (error) {
            console.error('❌ Scheduled retention job failed:', error);
        }
    });

    console.log('📅 Retention job scheduled (daily at 2:00 AM)');
}

/**
 * Get retention policies for organization
 */
export async function getRetentionPolicies(organizationId) {
    return await RetentionPolicy.find({ organizationId })
        .populate('createdBy', 'name')
        .sort({ dataType: 1 });
}

/**
 * Update retention policy
 */
export async function updateRetentionPolicy(policyId, updates) {
    const policy = await RetentionPolicy.findByIdAndUpdate(
        policyId,
        updates,
        { new: true, runValidators: true }
    );

    if (!policy) {
        throw new Error('Retention policy not found');
    }

    console.log(`✅ Retention policy updated: ${policyId}`);

    return policy;
}

/**
 * Delete retention policy
 */
export async function deleteRetentionPolicy(policyId) {
    const policy = await RetentionPolicy.findByIdAndDelete(policyId);

    if (!policy) {
        throw new Error('Retention policy not found');
    }

    console.log(`🗑️  Retention policy deleted: ${policyId}`);

    return policy;
}

export default {
    createRetentionPolicy,
    runRetentionJob,
    scheduleRetentionJob,
    getRetentionPolicies,
    updateRetentionPolicy,
    deleteRetentionPolicy,
    RetentionPolicy
};
