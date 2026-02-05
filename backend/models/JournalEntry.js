import mongoose from 'mongoose';

/**
 * JournalEntry - Double-entry accounting journal
 */
const journalEntryLineSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChartOfAccounts',
        required: true
    },

    debit: {
        type: Number,
        default: 0,
        min: 0
    },

    credit: {
        type: Number,
        default: 0,
        min: 0
    },

    description: String
});

const journalEntrySchema = new mongoose.Schema(
    {
        entryNumber: {
            type: String,
            required: true,
            unique: true
        },

        date: {
            type: Date,
            required: true,
            default: Date.now
        },

        // Source document reference
        sourceDocument: {
            type: {
                type: String,
                enum: ['Purchase', 'Invoice', 'Payment', 'Receipt', 'Adjustment', 'Manual'],
                required: true
            },
            id: mongoose.Schema.Types.ObjectId
        },

        // Journal entry lines (must balance)
        lines: [journalEntryLineSchema],

        // Entry status
        status: {
            type: String,
            enum: ['draft', 'posted', 'void'],
            default: 'draft'
        },

        // Financial period (REQUIRED for period locking)
        financialPeriod: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FinancialPeriod',
            required: true,
            index: true
        },

        // Memo/description
        memo: String,

        // Organization for multi-tenancy
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization'
        },

        // Audit fields
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        postedAt: Date,
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        voidedAt: Date,
        voidedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        voidReason: String
    },
    { timestamps: true }
);

// Validation: Debits must equal credits
journalEntrySchema.pre('save', function (next) {
    const totalDebits = this.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = this.lines.reduce((sum, line) => sum + line.credit, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return next(new Error(`Journal entry must balance. Debits: ${totalDebits}, Credits: ${totalCredits}`));
    }

    next();
});

// Prevent modification of posted entries
journalEntrySchema.pre('save', function (next) {
    if (!this.isNew && this.status === 'posted') {
        return next(new Error('Cannot modify posted journal entries'));
    }
    next();
});

// Indexes
journalEntrySchema.index({ entryNumber: 1 });
journalEntrySchema.index({ date: 1 });
journalEntrySchema.index({ status: 1 });
journalEntrySchema.index({ organization: 1 });
journalEntrySchema.index({ 'sourceDocument.type': 1, 'sourceDocument.id': 1 });

const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);

export default JournalEntry;
