import JournalEntry from '../models/JournalEntry.js';
import ChartOfAccounts from '../models/ChartOfAccounts.js';
import mongoose from 'mongoose';

/**
 * Accounting Service - Double-entry accounting operations
 */

/**
 * Create journal entry
 * @param {Object} params - Entry parameters
 * @returns {Promise<Object>} Created journal entry
 */
export async function createJournalEntry({
    date,
    sourceDocument,
    lines,
    memo,
    organizationId,
    userId,
    autoPost = false,
    session = null
}) {
    try {
        // Generate entry number
        const entryNumber = await generateEntryNumber(organizationId, session);

        // Validate lines balance
        const totalDebits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
        const totalCredits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            throw new Error(`Entry must balance. Debits: ${totalDebits}, Credits: ${totalCredits}`);
        }

        // Create entry
        const entry = await JournalEntry.create([{
            entryNumber,
            date,
            sourceDocument,
            lines,
            memo,
            organization: organizationId,
            createdBy: userId,
            status: autoPost ? 'posted' : 'draft',
            postedAt: autoPost ? new Date() : null,
            postedBy: autoPost ? userId : null
        }], { session });

        return {
            success: true,
            entry: entry[0]
        };

    } catch (error) {
        throw new Error(`Failed to create journal entry: ${error.message}`);
    }
}

/**
 * Post journal entry (make it permanent)
 * @param {ObjectId} entryId - Entry ID
 * @param {ObjectId} userId - User posting
 * @param {Object} session - MongoDB session
 * @returns {Promise<Object>}
 */
export async function postJournalEntry(entryId, userId, session = null) {
    try {
        const entry = await JournalEntry.findById(entryId).session(session);

        if (!entry) {
            throw new Error('Journal entry not found');
        }

        if (entry.status === 'posted') {
            throw new Error('Entry already posted');
        }

        if (entry.status === 'void') {
            throw new Error('Cannot post voided entry');
        }

        entry.status = 'posted';
        entry.postedAt = new Date();
        entry.postedBy = userId;
        await entry.save({ session });

        return {
            success: true,
            entry
        };

    } catch (error) {
        throw new Error(`Failed to post journal entry: ${error.message}`);
    }
}

/**
 * Void journal entry
 * @param {ObjectId} entryId - Entry ID
 * @param {ObjectId} userId - User voiding
 * @param {String} reason - Void reason
 * @param {Object} session - MongoDB session
 * @returns {Promise<Object>}
 */
export async function voidJournalEntry(entryId, userId, reason, session = null) {
    try {
        const entry = await JournalEntry.findById(entryId).session(session);

        if (!entry) {
            throw new Error('Journal entry not found');
        }

        if (entry.status === 'void') {
            throw new Error('Entry already voided');
        }

        entry.status = 'void';
        entry.voidedAt = new Date();
        entry.voidedBy = userId;
        entry.voidReason = reason;
        await entry.save({ session });

        return {
            success: true,
            entry
        };

    } catch (error) {
        throw new Error(`Failed to void journal entry: ${error.message}`);
    }
}

/**
 * Generate trial balance
 * @param {ObjectId} organizationId - Organization ID
 * @param {Date} asOfDate - As of date
 * @returns {Promise<Object>} Trial balance
 */
export async function generateTrialBalance(organizationId, asOfDate = new Date()) {
    try {
        const pipeline = [
            {
                $match: {
                    organization: organizationId,
                    status: 'posted',
                    date: { $lte: asOfDate }
                }
            },
            { $unwind: '$lines' },
            {
                $group: {
                    _id: '$lines.account',
                    totalDebits: { $sum: '$lines.debit' },
                    totalCredits: { $sum: '$lines.credit' }
                }
            },
            {
                $lookup: {
                    from: 'chartofaccounts',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'accountDetails'
                }
            },
            { $unwind: '$accountDetails' },
            {
                $project: {
                    account: '$accountDetails.name',
                    accountCode: '$accountDetails.code',
                    accountType: '$accountDetails.accountType',
                    normalBalance: '$accountDetails.normalBalance',
                    debits: '$totalDebits',
                    credits: '$totalCredits',
                    balance: {
                        $cond: {
                            if: { $eq: ['$accountDetails.normalBalance', 'DEBIT'] },
                            then: { $subtract: ['$totalDebits', '$totalCredits'] },
                            else: { $subtract: ['$totalCredits', '$totalDebits'] }
                        }
                    }
                }
            },
            { $sort: { accountCode: 1 } }
        ];

        const accounts = await JournalEntry.aggregate(pipeline);

        const totalDebits = accounts.reduce((sum, acc) => sum + acc.debits, 0);
        const totalCredits = accounts.reduce((sum, acc) => sum + acc.credits, 0);

        return {
            asOfDate,
            accounts,
            totalDebits,
            totalCredits,
            isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
        };

    } catch (error) {
        throw new Error(`Failed to generate trial balance: ${error.message}`);
    }
}

/**
 * Generate Profit & Loss statement
 * @param {ObjectId} organizationId - Organization ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} P&L statement
 */
export async function generateProfitAndLoss(organizationId, startDate, endDate) {
    try {
        const pipeline = [
            {
                $match: {
                    organization: organizationId,
                    status: 'posted',
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: '$lines' },
            {
                $lookup: {
                    from: 'chartofaccounts',
                    localField: 'lines.account',
                    foreignField: '_id',
                    as: 'accountDetails'
                }
            },
            { $unwind: '$accountDetails' },
            {
                $match: {
                    'accountDetails.accountType': { $in: ['REVENUE', 'EXPENSE', 'COGS'] }
                }
            },
            {
                $group: {
                    _id: {
                        accountType: '$accountDetails.accountType',
                        account: '$accountDetails._id'
                    },
                    accountName: { $first: '$accountDetails.name' },
                    accountCode: { $first: '$accountDetails.code' },
                    debits: { $sum: '$lines.debit' },
                    credits: { $sum: '$lines.credit' }
                }
            },
            {
                $project: {
                    accountType: '$_id.accountType',
                    accountName: 1,
                    accountCode: 1,
                    amount: {
                        $cond: {
                            if: { $eq: ['$_id.accountType', 'REVENUE'] },
                            then: { $subtract: ['$credits', '$debits'] },
                            else: { $subtract: ['$debits', '$credits'] }
                        }
                    }
                }
            },
            { $sort: { accountCode: 1 } }
        ];

        const accounts = await JournalEntry.aggregate(pipeline);

        // Calculate totals
        const revenue = accounts
            .filter(a => a.accountType === 'REVENUE')
            .reduce((sum, a) => sum + a.amount, 0);

        const cogs = accounts
            .filter(a => a.accountType === 'COGS')
            .reduce((sum, a) => sum + a.amount, 0);

        const expenses = accounts
            .filter(a => a.accountType === 'EXPENSE')
            .reduce((sum, a) => sum + a.amount, 0);

        const grossProfit = revenue - cogs;
        const netProfit = grossProfit - expenses;

        return {
            period: { startDate, endDate },
            revenue,
            cogs,
            grossProfit,
            expenses,
            netProfit,
            accounts: {
                revenue: accounts.filter(a => a.accountType === 'REVENUE'),
                cogs: accounts.filter(a => a.accountType === 'COGS'),
                expenses: accounts.filter(a => a.accountType === 'EXPENSE')
            }
        };

    } catch (error) {
        throw new Error(`Failed to generate P&L: ${error.message}`);
    }
}

/**
 * Generate entry number
 * @param {ObjectId} organizationId - Organization ID
 * @param {Object} session - MongoDB session
 * @returns {Promise<String>} Entry number
 */
async function generateEntryNumber(organizationId, session = null) {
    const year = new Date().getFullYear();
    const prefix = `JE-${year}-`;

    const lastEntry = await JournalEntry
        .findOne({
            organization: organizationId,
            entryNumber: new RegExp(`^${prefix}`)
        })
        .sort({ entryNumber: -1 })
        .session(session);

    let nextNumber = 1;
    if (lastEntry) {
        const lastNumber = parseInt(lastEntry.entryNumber.split('-').pop());
        nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(6, '0')}`;
}

export default {
    createJournalEntry,
    postJournalEntry,
    voidJournalEntry,
    generateTrialBalance,
    generateProfitAndLoss
};
