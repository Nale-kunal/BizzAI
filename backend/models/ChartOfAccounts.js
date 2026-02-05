import mongoose from 'mongoose';

/**
 * ChartOfAccounts - Double-entry accounting structure
 */
const chartOfAccountsSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        accountType: {
            type: String,
            enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COGS'],
            required: true
        },

        subType: {
            type: String,
            enum: [
                // Assets
                'CURRENT_ASSET', 'FIXED_ASSET', 'INVENTORY', 'CASH', 'BANK', 'ACCOUNTS_RECEIVABLE',
                // Liabilities
                'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'ACCOUNTS_PAYABLE',
                // Equity
                'OWNERS_EQUITY', 'RETAINED_EARNINGS',
                // Revenue
                'SALES_REVENUE', 'OTHER_INCOME',
                // Expenses
                'OPERATING_EXPENSE', 'ADMINISTRATIVE_EXPENSE',
                // COGS
                'COST_OF_GOODS_SOLD'
            ]
        },

        parentAccount: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChartOfAccounts'
        },

        // Normal balance (debit or credit)
        normalBalance: {
            type: String,
            enum: ['DEBIT', 'CREDIT'],
            required: true
        },

        // System accounts cannot be deleted
        isSystem: {
            type: Boolean,
            default: false
        },

        // Active status
        isActive: {
            type: Boolean,
            default: true
        },

        // Organization for multi-tenancy
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization'
        },

        description: String
    },
    { timestamps: true }
);

// Indexes
chartOfAccountsSchema.index({ code: 1 });
chartOfAccountsSchema.index({ accountType: 1 });
chartOfAccountsSchema.index({ organization: 1 });

const ChartOfAccounts = mongoose.model('ChartOfAccounts', chartOfAccountsSchema);

export default ChartOfAccounts;
