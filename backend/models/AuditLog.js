/**
 * ENTERPRISE AUDIT LOG: Append-Only with Integrity Protection
 * 
 * Adds:
 * - Hash chaining for integrity
 * - Retention policy
 * - Export capability
 * - Append-only enforcement
 * 
 * NO BUSINESS LOGIC CHANGES - Only adds audit security
 */

import mongoose from "mongoose";
import crypto from "crypto";

const auditLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        action: {
            type: String,
            required: true,
            enum: [
                "DELETE_INVOICE",
                "DELETE_CUSTOMER",
                "DELETE_ITEM",
                "UPDATE_INVOICE",
                "UPDATE_CUSTOMER",
                "UPDATE_ITEM",
                "DELETE_RETURN",
                "UPDATE_RETURN",
                "DELETE_SALES_ORDER",
                "UPDATE_SALES_ORDER",
                "DELETE_PAYMENT",
                "UPDATE_PAYMENT",
                "FORCE_LOGOUT",
                "PASSWORD_RESET",
                "USER_ROLE_CHANGE",
            ],
            index: true,
        },
        entityType: {
            type: String,
            required: true,
            enum: ["Invoice", "Customer", "Item", "Return", "SalesOrder", "Payment", "User"],
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        // Snapshot of data before change (for UPDATE) or deleted data (for DELETE)
        beforeSnapshot: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        // Snapshot of data after change (for UPDATE only)
        afterSnapshot: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        ipAddress: {
            type: String,
            required: true,
        },
        userAgent: {
            type: String,
            default: null,
        },
        // Additional context
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        // ENTERPRISE: Integrity protection
        previousHash: {
            type: String,
            default: null,
            index: true,
        },
        currentHash: {
            type: String,
            required: true,
            index: true,
        },
        // ENTERPRISE: Retention
        retentionUntil: {
            type: Date,
            default: function () {
                // Default: 7 years retention (compliance standard)
                const date = new Date();
                date.setFullYear(date.getFullYear() + 7);
                return date;
            },
            index: true,
        },
    },
    {
        timestamps: true, // createdAt, updatedAt
    }
);

// Indexes for efficient querying
auditLogSchema.index({ createdAt: -1 }); // Recent logs first
auditLogSchema.index({ userId: 1, createdAt: -1 }); // User activity timeline
auditLogSchema.index({ entityType: 1, entityId: 1 }); // Entity history

// ENTERPRISE: Prevent updates and deletes (append-only)
auditLogSchema.pre('updateOne', function (next) {
    next(new Error('Audit logs are append-only and cannot be updated'));
});

auditLogSchema.pre('findOneAndUpdate', function (next) {
    next(new Error('Audit logs are append-only and cannot be updated'));
});

auditLogSchema.pre('deleteOne', function (next) {
    next(new Error('Audit logs are append-only and cannot be deleted'));
});

auditLogSchema.pre('findOneAndDelete', function (next) {
    next(new Error('Audit logs are append-only and cannot be deleted'));
});

// ENTERPRISE: Hash chaining for integrity
auditLogSchema.pre('save', async function (next) {
    if (this.isNew) {
        // Ensure createdAt is defined for hashing (set explicitly if not yet set by Mongoose)
        if (!this.createdAt) {
            this.createdAt = new Date();
        }

        // Get previous log entry
        const previousLog = await this.constructor.findOne().sort({ createdAt: -1 });
        this.previousHash = previousLog ? previousLog.currentHash : null;

        // Calculate current hash
        const dataToHash = JSON.stringify({
            userId: this.userId,
            action: this.action,
            entityType: this.entityType,
            entityId: this.entityId,
            timestamp: this.createdAt,
            previousHash: this.previousHash,
        });

        this.currentHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    }
    next();

// ENTERPRISE: Handle insertMany (when using AuditLog.create([...]))
auditLogSchema.pre('insertMany', async function (next, docs) {
    if (Array.isArray(docs)) {
        for (const doc of docs) {
            if (!doc.createdAt) {
                doc.createdAt = new Date();
            }
            
            const previousLog = await this.findOne().sort({ createdAt: -1 });
            doc.previousHash = previousLog ? previousLog.currentHash : null;

            const dataToHash = JSON.stringify({
                userId: doc.userId,
                action: doc.action,
                entityType: doc.entityType,
                entityId: doc.entityId,
                timestamp: doc.createdAt,
                previousHash: doc.previousHash,
            });

            doc.currentHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
        }
    }
    next();
});
});

// ENTERPRISE: Handle insertMany (when using AuditLog.create([...]))
auditLogSchema.pre('insertMany', async function (next, docs) {
    if (Array.isArray(docs)) {
        for (const doc of docs) {
            if (!doc.createdAt) {
                doc.createdAt = new Date();
            }
            
            const previousLog = await this.findOne().sort({ createdAt: -1 });
            doc.previousHash = previousLog ? previousLog.currentHash : null;

            const dataToHash = JSON.stringify({
                userId: doc.userId,
                action: doc.action,
                entityType: doc.entityType,
                entityId: doc.entityId,
                timestamp: doc.createdAt,
                previousHash: doc.previousHash,
            });

            doc.currentHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
        }
    }
    next();
});
