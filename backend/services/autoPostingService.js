import * as accountingService from '../services/accountingService.js';
import * as cogsEngine from '../services/cogsEngine.js';
import ChartOfAccounts from '../models/ChartOfAccounts.js';

/**
 * Auto-posting service
 * Automatically creates journal entries for business transactions
 */

/**
 * Post purchase transaction
 * Debit: Inventory, Credit: Accounts Payable (or Cash)
 * 
 * @param {Object} purchase - Purchase document
 * @param {String} userId - User ID
 * @param {Object} financialPeriod - Financial period (REQUIRED)
 * @param {Object} session - MongoDB session for transactions
 */
export async function postPurchase(purchase, userId, financialPeriod, session = null) {
    try {
        if (!financialPeriod) {
            throw new Error('Financial period is required for posting');
        }

        if (financialPeriod.status !== 'open') {
            throw new Error(`Cannot post to ${financialPeriod.status} period`);
        }

        // Get accounts
        const inventoryAccount = await ChartOfAccounts.findOne({
            code: '1140',
            organization: purchase.organization
        }).session(session);

        const apAccount = await ChartOfAccounts.findOne({
            code: '2110',
            organization: purchase.organization
        }).session(session);

        const cashAccount = await ChartOfAccounts.findOne({
            code: '1110',
            organization: purchase.organization
        }).session(session);

        if (!inventoryAccount || !apAccount || !cashAccount) {
            throw new Error('Required accounts not found');
        }

        const lines = [];

        // Debit: Inventory
        lines.push({
            account: inventoryAccount._id,
            debit: purchase.totalAmount,
            credit: 0,
            description: `Purchase ${purchase.purchaseNo}`
        });

        // Credit: AP or Cash
        if (purchase.purchaseType === 'cash') {
            lines.push({
                account: cashAccount._id,
                debit: 0,
                credit: purchase.totalAmount,
                description: `Cash payment for ${purchase.purchaseNo}`
            });
        } else {
            lines.push({
                account: apAccount._id,
                debit: 0,
                credit: purchase.totalAmount,
                description: `Accounts payable for ${purchase.purchaseNo}`
            });
        }

        // Create journal entry with financial period
        const result = await accountingService.createJournalEntry({
            date: purchase.purchaseDate,
            sourceDocument: {
                type: 'Purchase',
                id: purchase._id
            },
            lines,
            memo: `Purchase from ${purchase.supplierName || 'supplier'}`,
            organizationId: purchase.organization,
            financialPeriod: financialPeriod._id,
            userId,
            autoPost: true,
            session
        });

        return result;

    } catch (error) {
        throw new Error(`Failed to post purchase: ${error.message}`);
    }
}

/**
 * Post sale transaction
 * Debit: Accounts Receivable (or Cash), Credit: Sales Revenue
 * Debit: COGS, Credit: Inventory
 * 
 * @param {Object} invoice - Invoice document
 * @param {String} userId - User ID
 * @param {Object} financialPeriod - Financial period (REQUIRED)
 * @param {String} cogsMethod - COGS calculation method (FIFO/LIFO/WAC)
 * @param {Object} session - MongoDB session for transactions
 */
export async function postSale(invoice, userId, financialPeriod, cogsMethod = 'FIFO', session = null) {
    try {
        if (!financialPeriod) {
            throw new Error('Financial period is required for posting');
        }

        if (financialPeriod.status !== 'open') {
            throw new Error(`Cannot post to ${financialPeriod.status} period`);
        }

        // Get accounts
        const arAccount = await ChartOfAccounts.findOne({
            code: '1130',
            organization: invoice.organization
        }).session(session);

        const cashAccount = await ChartOfAccounts.findOne({
            code: '1110',
            organization: invoice.organization
        }).session(session);

        const revenueAccount = await ChartOfAccounts.findOne({
            code: '4100',
            organization: invoice.organization
        }).session(session);

        const cogsAccount = await ChartOfAccounts.findOne({
            code: '6000',
            organization: invoice.organization
        }).session(session);

        const inventoryAccount = await ChartOfAccounts.findOne({
            code: '1140',
            organization: invoice.organization
        }).session(session);

        if (!arAccount || !cashAccount || !revenueAccount || !cogsAccount || !inventoryAccount) {
            throw new Error('Required accounts not found');
        }

        const lines = [];

        // Revenue entry
        // Debit: AR or Cash
        if (invoice.paymentStatus === 'paid') {
            lines.push({
                account: cashAccount._id,
                debit: invoice.totalAmount,
                credit: 0,
                description: `Cash sale ${invoice.invoiceNo}`
            });
        } else {
            lines.push({
                account: arAccount._id,
                debit: invoice.totalAmount,
                credit: 0,
                description: `Credit sale ${invoice.invoiceNo}`
            });
        }

        // Credit: Revenue
        lines.push({
            account: revenueAccount._id,
            debit: 0,
            credit: invoice.totalAmount,
            description: `Sales revenue ${invoice.invoiceNo}`
        });

        // Create revenue journal entry with financial period
        await accountingService.createJournalEntry({
            date: invoice.invoiceDate,
            sourceDocument: {
                type: 'Invoice',
                id: invoice._id
            },
            lines,
            memo: `Sale to ${invoice.customerName || 'customer'}`,
            organizationId: invoice.organization,
            financialPeriod: financialPeriod._id,
            userId,
            autoPost: true,
            session
        });

        // COGS entry
        let totalCOGS = 0;

        for (const item of invoice.items) {
            const cogs = await cogsEngine.calculateCOGS(
                item.item,
                item.quantity,
                invoice.invoiceDate,
                cogsMethod
            );
            totalCOGS += cogs.totalCOGS;
        }

        const cogsLines = [
            {
                account: cogsAccount._id,
                debit: totalCOGS,
                credit: 0,
                description: `COGS for ${invoice.invoiceNo}`
            },
            {
                account: inventoryAccount._id,
                debit: 0,
                credit: totalCOGS,
                description: `Inventory reduction for ${invoice.invoiceNo}`
            }
        ];

        // Create COGS journal entry with financial period
        await accountingService.createJournalEntry({
            date: invoice.invoiceDate,
            sourceDocument: {
                type: 'Invoice',
                id: invoice._id
            },
            lines: cogsLines,
            memo: `COGS for ${invoice.invoiceNo}`,
            organizationId: invoice.organization,
            financialPeriod: financialPeriod._id,
            userId,
            autoPost: true,
            session
        });

        return { success: true, totalCOGS };

    } catch (error) {
        throw new Error(`Failed to post sale: ${error.message}`);
    }
}

/**
 * Post payment transaction
 * Debit: Accounts Payable (or Receivable), Credit: Cash/Bank
 * 
 * @param {Object} payment - Payment document
 * @param {String} userId - User ID
 * @param {Object} financialPeriod - Financial period (REQUIRED)
 * @param {Object} session - MongoDB session for transactions
 */
export async function postPayment(payment, userId, financialPeriod, session = null) {
    try {
        if (!financialPeriod) {
            throw new Error('Financial period is required for posting');
        }

        if (financialPeriod.status !== 'open') {
            throw new Error(`Cannot post to ${financialPeriod.status} period`);
        }

        const lines = [];

        // Get cash/bank account
        const cashAccount = await ChartOfAccounts.findOne({
            code: payment.paymentMethod === 'bank' ? '1120' : '1110',
            organization: payment.organization
        }).session(session);

        if (!cashAccount) {
            throw new Error('Cash/Bank account not found');
        }

        // Determine if paying supplier or receiving from customer
        if (payment.type === 'payment') {
            // Paying supplier
            const apAccount = await ChartOfAccounts.findOne({
                code: '2110',
                organization: payment.organization
            }).session(session);

            lines.push({
                account: apAccount._id,
                debit: payment.amount,
                credit: 0,
                description: `Payment to supplier`
            });

            lines.push({
                account: cashAccount._id,
                debit: 0,
                credit: payment.amount,
                description: `Cash payment`
            });

        } else {
            // Receiving from customer
            const arAccount = await ChartOfAccounts.findOne({
                code: '1130',
                organization: payment.organization
            }).session(session);

            lines.push({
                account: cashAccount._id,
                debit: payment.amount,
                credit: 0,
                description: `Receipt from customer`
            });

            lines.push({
                account: arAccount._id,
                debit: 0,
                credit: payment.amount,
                description: `Customer payment`
            });
        }

        // Create journal entry with financial period
        const result = await accountingService.createJournalEntry({
            date: payment.date || new Date(),
            sourceDocument: {
                type: 'Payment',
                id: payment._id
            },
            lines,
            memo: `Payment transaction`,
            organizationId: payment.organization,
            financialPeriod: financialPeriod._id,
            userId,
            autoPost: true,
            session
        });

        return result;

    } catch (error) {
        throw new Error(`Failed to post payment: ${error.message}`);
    }
}

export default {
    postPurchase,
    postSale,
    postPayment
};
