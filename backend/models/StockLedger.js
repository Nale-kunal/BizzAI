import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * StockLedger - Append-only, immutable inventory tracking
 * 
 * This model provides:
 * - Complete audit trail of all stock movements
 * - Point-in-time balance reconstruction
 * - Immutable historical record
 * - Idempotent transaction support
 */
const stockLedgerSchema = new mongoose.Schema(
    {
        // Unique, immutable entry identifier
        entryId: {
            type: String,
            required: true,
            unique: true,
            default: () => uuidv4(),
            immutable: true
        },

        // Item reference
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: true,
            immutable: true,
            index: true
        },

        // Transaction details
        transactionType: {
            type: String,
            enum: [
                'PURCHASE',           // Stock in from purchase
                'SALE',               // Stock out from sale
                'PURCHASE_RETURN',    // Stock out (return to supplier)
                'SALES_RETURN',       // Stock in (customer return)
                'ADJUSTMENT_IN',      // Manual increase
                'ADJUSTMENT_OUT',     // Manual decrease
                'TRANSFER_IN',        // Inter-branch/warehouse transfer in
                'TRANSFER_OUT',       // Inter-branch/warehouse transfer out
                'DAMAGE',             // Stock write-off
                'INITIAL_STOCK'       // Opening balance
            ],
            required: true,
            immutable: true,
            index: true
        },

        // Source document reference
        sourceDocument: {
            type: {
                type: String,
                enum: ['Purchase', 'Invoice', 'PurchaseReturn', 'Return', 'GoodsReceivedNote', 'DeliveryChallan', 'Adjustment', 'Transfer'],
                required: true,
                immutable: true
            },
            id: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                immutable: true
            }
        },

        // Quantity change (positive = increase, negative = decrease)
        quantityChange: {
            type: Number,
            required: true,
            immutable: true
        },

        // Running balance after this transaction
        runningBalance: {
            type: Number,
            required: true,
            min: 0,
            immutable: true
        },

        // Cost tracking
        costPerUnit: {
            type: Number,
            required: true,
            min: 0,
            immutable: true
        },

        totalValue: {
            type: Number,
            required: true,
            immutable: true
        },

        // Multi-warehouse support (future)
        warehouse: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Warehouse',
            default: null,
            immutable: true
        },

        // Multi-branch support (future)
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch',
            default: null,
            immutable: true
        },

        // Audit fields
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true
        },

        // Multi-tenancy
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            immutable: true,
            index: true
        },

        timestamp: {
            type: Date,
            required: true,
            default: Date.now,
            immutable: true,
            index: true
        },

        // Additional metadata (batch, expiry, etc.)
        metadata: {
            batchNo: String,
            expiryDate: Date,
            serialNumbers: [String],
            notes: String
        },

        // Idempotency support
        idempotencyKey: {
            type: String,
            sparse: true,
            unique: true,
            immutable: true,
            index: true
        }
    },
    {
        timestamps: true,
        // Prevent updates after creation
        strict: 'throw'
    }
);

// Compound indexes for efficient queries
stockLedgerSchema.index({ item: 1, timestamp: 1 });
stockLedgerSchema.index({ item: 1, transactionType: 1 });
stockLedgerSchema.index({ 'sourceDocument.type': 1, 'sourceDocument.id': 1 });
stockLedgerSchema.index({ createdBy: 1, timestamp: -1 });

// Prevent updates to ledger entries
stockLedgerSchema.pre('save', function (next) {
    if (!this.isNew) {
        return next(new Error('StockLedger entries are immutable and cannot be updated'));
    }
    next();
});

// Prevent deletion
stockLedgerSchema.pre('remove', function (next) {
    next(new Error('StockLedger entries cannot be deleted'));
});

stockLedgerSchema.pre('deleteOne', function (next) {
    next(new Error('StockLedger entries cannot be deleted'));
});

stockLedgerSchema.pre('deleteMany', function (next) {
    next(new Error('StockLedger entries cannot be deleted'));
});

// Virtual for absolute quantity change
stockLedgerSchema.virtual('absoluteChange').get(function () {
    return Math.abs(this.quantityChange);
});

// Virtual for transaction direction
stockLedgerSchema.virtual('direction').get(function () {
    return this.quantityChange >= 0 ? 'IN' : 'OUT';
});

const StockLedger = mongoose.model('StockLedger', stockLedgerSchema);

export default StockLedger;
