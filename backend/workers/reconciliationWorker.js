/**
 * BullMQ Reconciliation Worker
 * 
 * Processes background reconciliation jobs
 * Handles: Stock reconciliation, financial reconciliation, balance updates
 */

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import StockLedger from '../models/StockLedger.js';
import Item from '../models/Item.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import dotenv from 'dotenv';

dotenv.config();

// Redis connection
const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

/**
 * Reconcile stock for an item
 */
async function reconcileStock(itemId, organizationId) {
    const session = await mongoose.startSession();

    try {
        return await session.withTransaction(async () => {
            // Get all stock ledger entries for this item
            const entries = await StockLedger.find({
                item: itemId,
                organizationId
            })
                .sort({ timestamp: 1 })
                .session(session);

            let runningBalance = 0;

            // Recalculate running balances
            for (const entry of entries) {
                runningBalance += entry.quantityChange;

                if (entry.runningBalance !== runningBalance) {
                    entry.runningBalance = runningBalance;
                    await entry.save({ session });
                }
            }

            // Update item's current stock
            await Item.findByIdAndUpdate(
                itemId,
                { currentStock: runningBalance },
                { session }
            );

            return { itemId, reconciledBalance: runningBalance };
        });
    } finally {
        session.endSession();
    }
}

/**
 * Reconcile customer balance
 */
async function reconcileCustomerBalance(customerId, organizationId) {
    const session = await mongoose.startSession();

    try {
        return await session.withTransaction(async () => {
            // Calculate from invoices and payments
            const Invoice = mongoose.model('Invoice');
            const PaymentIn = mongoose.model('PaymentIn');

            const invoices = await Invoice.find({
                customer: customerId,
                organizationId,
                isDeleted: false
            }).session(session);

            const payments = await PaymentIn.find({
                customer: customerId,
                organizationId
            }).session(session);

            const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
            const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
            const outstandingBalance = totalInvoiced - totalPaid;

            await Customer.findByIdAndUpdate(
                customerId,
                { outstandingBalance },
                { session }
            );

            return { customerId, outstandingBalance };
        });
    } finally {
        session.endSession();
    }
}

/**
 * Reconcile supplier balance
 */
async function reconcileSupplierBalance(supplierId, organizationId) {
    const session = await mongoose.startSession();

    try {
        return await session.withTransaction(async () => {
            const Purchase = mongoose.model('Purchase');
            const PaymentOut = mongoose.model('PaymentOut');

            const purchases = await Purchase.find({
                supplier: supplierId,
                organizationId,
                isDeleted: false
            }).session(session);

            const payments = await PaymentOut.find({
                supplier: supplierId,
                organizationId
            }).session(session);

            const totalPurchased = purchases.reduce((sum, pur) => sum + pur.totalAmount, 0);
            const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
            const outstandingBalance = totalPurchased - totalPaid;

            await Supplier.findByIdAndUpdate(
                supplierId,
                { outstandingBalance },
                { session }
            );

            return { supplierId, outstandingBalance };
        });
    } finally {
        session.endSession();
    }
}

/**
 * Reconciliation job processor
 */
const reconciliationWorker = new Worker(
    'reconciliation-queue',
    async (job) => {
        const { type, entityId, organizationId } = job.data;

        console.log(`🔄 Processing reconciliation job ${job.id}: ${type}`);

        try {
            let result;

            switch (type) {
                case 'stock':
                    result = await reconcileStock(entityId, organizationId);
                    break;

                case 'customer':
                    result = await reconcileCustomerBalance(entityId, organizationId);
                    break;

                case 'supplier':
                    result = await reconcileSupplierBalance(entityId, organizationId);
                    break;

                default:
                    throw new Error(`Unknown reconciliation type: ${type}`);
            }

            console.log(`✅ Reconciliation completed:`, result);

            return {
                success: true,
                type,
                result
            };

        } catch (error) {
            console.error(`❌ Reconciliation failed: ${error.message}`);
            throw error;
        }
    },
    {
        connection,
        concurrency: 3 // Process 3 reconciliations concurrently
    }
);

// Event listeners
reconciliationWorker.on('completed', (job, result) => {
    console.log(`✅ Reconciliation job ${job.id} completed: ${result.type}`);
});

reconciliationWorker.on('failed', (job, error) => {
    console.error(`❌ Reconciliation job ${job.id} failed:`, error.message);
});

reconciliationWorker.on('error', (error) => {
    console.error('❌ Reconciliation worker error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 Shutting down reconciliation worker...');
    await reconciliationWorker.close();
    await connection.quit();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🔄 Shutting down reconciliation worker...');
    await reconciliationWorker.close();
    await connection.quit();
    process.exit(0);
});

console.log('🔄 Reconciliation worker started');

export default reconciliationWorker;
