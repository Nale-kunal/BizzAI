import mongoose from 'mongoose';

/**
 * FinancialPeriod - Fiscal period management with locking
 * 
 * Ensures:
 * - No transactions in locked/closed periods
 * - Fiscal year support
 * - Immutability once closed
 * - Tenant isolation
 */
const financialPeriodSchema = new mongoose.Schema(
    {
        // Period identification
        name: {
            type: String,
            required: true,
            trim: true
        },

        // Fiscal year
        fiscalYear: {
            type: Number,
            required: true,
            index: true
        },

        // Period boundaries
        startDate: {
            type: Date,
            required: true,
            index: true
        },

        endDate: {
            type: Date,
            required: true,
            index: true
        },

        // Period status
        status: {
            type: String,
            enum: ['open', 'locked', 'closed'],
            default: 'open',
            required: true,
            index: true
        },

        // Lock metadata
        lockedAt: Date,
        lockedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        // Close metadata
        closedAt: Date,
        closedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        // Multi-tenancy
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true
        },

        // Audit fields
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        // Notes
        notes: String
    },
    { timestamps: true }
);

// Compound indexes
financialPeriodSchema.index({ organization: 1, fiscalYear: 1 });
financialPeriodSchema.index({ organization: 1, status: 1 });
financialPeriodSchema.index({ organization: 1, startDate: 1, endDate: 1 });

// Prevent modification of closed periods
financialPeriodSchema.pre('save', function (next) {
    if (!this.isNew && this.status === 'closed' && this.isModified()) {
        const modifiedFields = this.modifiedPaths();
        // Only allow updating notes on closed periods
        const allowedFields = ['notes', 'updatedAt'];
        const hasDisallowedChanges = modifiedFields.some(
            field => !allowedFields.includes(field)
        );

        if (hasDisallowedChanges) {
            return next(new Error('Cannot modify closed financial period'));
        }
    }
    next();
});

// Validation: endDate must be after startDate
financialPeriodSchema.pre('save', function (next) {
    if (this.endDate <= this.startDate) {
        return next(new Error('Period end date must be after start date'));
    }
    next();
});

// Helper method: Check if period is open
financialPeriodSchema.methods.isOpen = function () {
    return this.status === 'open';
};

// Helper method: Check if date falls within period
financialPeriodSchema.methods.containsDate = function (date) {
    const checkDate = new Date(date);
    return checkDate >= this.startDate && checkDate <= this.endDate;
};

// Static method: Find period for date
financialPeriodSchema.statics.findPeriodForDate = async function (
    organizationId,
    date
) {
    return await this.findOne({
        organization: organizationId,
        startDate: { $lte: date },
        endDate: { $gte: date }
    });
};

// Static method: Get current open period
financialPeriodSchema.statics.getCurrentOpenPeriod = async function (
    organizationId
) {
    return await this.findOne({
        organization: organizationId,
        status: 'open',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
    });
};

const FinancialPeriod = mongoose.model('FinancialPeriod', financialPeriodSchema);

export default FinancialPeriod;
