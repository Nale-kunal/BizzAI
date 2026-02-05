import StockLedger from '../models/StockLedger.js';
import Item from '../models/Item.js';
import mongoose from 'mongoose';

/**
 * Ledger Service - Manages append-only stock ledger operations
 * 
 * Provides:
 * - Idempotent ledger entry creation
 * - Point-in-time balance calculation
 * - Historical reconstruction
 * - Reconciliation with Item.stockQty
 */

/**
 * Append entry to stock ledger
 * @param {Object} params - Entry parameters
 * @param {ObjectId} params.itemId - Item ID
 * @param {Number} params.quantityChange - Quantity change (+ or -)
 * @param {String} params.transactionType - Transaction type
 * @param {Object} params.sourceDocument - {type, id}
 * @param {Number} params.costPerUnit - Cost per unit
 * @param {ObjectId} params.userId - User creating entry
 * @param {Object} params.metadata - Additional metadata
 * @param {String} params.idempotencyKey - Optional idempotency key
 * @param {Object} params.session - MongoDB session for transactions
 * @returns {Promise<Object>} Created ledger entry
 */
export async function appendEntry({
    itemId,
    quantityChange,
    transactionType,
    sourceDocument,
    costPerUnit,
    userId,
    metadata = {},
    idempotencyKey = null,
    session = null
}) {
    try {
        // Check for existing entry with same idempotency key
        if (idempotencyKey) {
            const existing = await StockLedger.findOne({ idempotencyKey }).session(session);
            if (existing) {
                return {
                    success: true,
                    entry: existing,
                    duplicate: true
                };
            }
        }

        // Get current running balance
        const currentBalance = await getRunningBalance(itemId, null, session);
        const newBalance = currentBalance + quantityChange;

        // Validate balance doesn't go negative
        if (newBalance < 0) {
            throw new Error(`Insufficient stock. Current: ${currentBalance}, Requested: ${Math.abs(quantityChange)}, Shortfall: ${Math.abs(newBalance)}`);
        }

        // Calculate total value
        const totalValue = quantityChange * costPerUnit;

        // Create ledger entry
        const entry = await StockLedger.create([{
            item: itemId,
            transactionType,
            sourceDocument,
            quantityChange,
            runningBalance: newBalance,
            costPerUnit,
            totalValue,
            createdBy: userId,
            metadata,
            idempotencyKey
        }], { session });

        // Update Item.stockQty for backward compatibility
        await Item.findByIdAndUpdate(
            itemId,
            { stockQty: newBalance },
            { session }
        );

        return {
            success: true,
            entry: entry[0],
            previousBalance: currentBalance,
            newBalance,
            duplicate: false
        };

    } catch (error) {
        throw new Error(`Failed to append ledger entry: ${error.message}`);
    }
}

/**
 * Get running balance for an item at a specific point in time
 * @param {ObjectId} itemId - Item ID
 * @param {Date} asOfDate - Optional date (null = current)
 * @param {Object} session - MongoDB session
 * @returns {Promise<Number>} Running balance
 */
export async function getRunningBalance(itemId, asOfDate = null, session = null) {
    try {
        const query = { item: itemId };

        if (asOfDate) {
            query.timestamp = { $lte: asOfDate };
        }

        // Get the most recent ledger entry
        const latestEntry = await StockLedger
            .findOne(query)
            .sort({ timestamp: -1 })
            .session(session);

        return latestEntry ? latestEntry.runningBalance : 0;

    } catch (error) {
        throw new Error(`Failed to get running balance: ${error.message}`);
    }
}

/**
 * Reconstruct complete history for an item
 * @param {ObjectId} itemId - Item ID
 * @param {Date} startDate - Optional start date
 * @param {Date} endDate - Optional end date
 * @returns {Promise<Array>} Ledger entries with running balances
 */
export async function reconstructHistory(itemId, startDate = null, endDate = null) {
    try {
        const query = { item: itemId };

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = startDate;
            if (endDate) query.timestamp.$lte = endDate;
        }

        const entries = await StockLedger
            .find(query)
            .sort({ timestamp: 1 })
            .populate('createdBy', 'name email')
            .lean();

        return entries.map(entry => ({
            ...entry,
            direction: entry.quantityChange >= 0 ? 'IN' : 'OUT',
            absoluteChange: Math.abs(entry.quantityChange)
        }));

    } catch (error) {
        throw new Error(`Failed to reconstruct history: ${error.message}`);
    }
}

/**
 * Reconcile ledger balance with Item.stockQty
 * @param {ObjectId} itemId - Item ID
 * @returns {Promise<Object>} Reconciliation result
 */
export async function reconcile(itemId) {
    try {
        const item = await Item.findById(itemId);
        if (!item) {
            throw new Error('Item not found');
        }

        const ledgerBalance = await getRunningBalance(itemId);
        const itemStockQty = item.stockQty;

        const discrepancy = ledgerBalance - itemStockQty;

        return {
            itemId,
            itemName: item.name,
            ledgerBalance,
            itemStockQty,
            discrepancy,
            isReconciled: discrepancy === 0,
            status: discrepancy === 0 ? 'OK' : 'MISMATCH'
        };

    } catch (error) {
        throw new Error(`Failed to reconcile: ${error.message}`);
    }
}

/**
 * Reconcile all items
 * @returns {Promise<Array>} Reconciliation results for all items
 */
export async function reconcileAll() {
    try {
        const items = await Item.find({ isDeleted: { $ne: true } });
        const results = [];

        for (const item of items) {
            const result = await reconcile(item._id);
            if (!result.isReconciled) {
                results.push(result);
            }
        }

        return {
            totalItems: items.length,
            mismatches: results.length,
            reconciled: items.length - results.length,
            discrepancies: results
        };

    } catch (error) {
        throw new Error(`Failed to reconcile all: ${error.message}`);
    }
}

/**
 * Get ledger entries for a source document
 * @param {String} sourceType - Source document type
 * @param {ObjectId} sourceId - Source document ID
 * @returns {Promise<Array>} Ledger entries
 */
export async function getEntriesBySource(sourceType, sourceId) {
    try {
        const entries = await StockLedger
            .find({
                'sourceDocument.type': sourceType,
                'sourceDocument.id': sourceId
            })
            .populate('item', 'name sku')
            .populate('createdBy', 'name email')
            .sort({ timestamp: 1 });

        return entries;

    } catch (error) {
        throw new Error(`Failed to get entries by source: ${error.message}`);
    }
}

/**
 * Get inventory valuation at a point in time
 * @param {Date} asOfDate - Optional date (null = current)
 * @returns {Promise<Object>} Valuation summary
 */
export async function getInventoryValuation(asOfDate = null) {
    try {
        const query = {};
        if (asOfDate) {
            query.timestamp = { $lte: asOfDate };
        }

        // Get latest entry for each item
        const pipeline = [
            { $match: query },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: '$item',
                    latestEntry: { $first: '$$ROOT' }
                }
            },
            {
                $replaceRoot: { newRoot: '$latestEntry' }
            },
            {
                $lookup: {
                    from: 'items',
                    localField: 'item',
                    foreignField: '_id',
                    as: 'itemDetails'
                }
            },
            { $unwind: '$itemDetails' },
            {
                $project: {
                    item: '$itemDetails.name',
                    sku: '$itemDetails.sku',
                    quantity: '$runningBalance',
                    costPerUnit: 1,
                    totalValue: { $multiply: ['$runningBalance', '$costPerUnit'] }
                }
            }
        ];

        const valuations = await StockLedger.aggregate(pipeline);

        const totalValue = valuations.reduce((sum, v) => sum + v.totalValue, 0);
        const totalQuantity = valuations.reduce((sum, v) => sum + v.quantity, 0);

        return {
            asOfDate: asOfDate || new Date(),
            totalItems: valuations.length,
            totalQuantity,
            totalValue,
            items: valuations
        };

    } catch (error) {
        throw new Error(`Failed to get inventory valuation: ${error.message}`);
    }
}

export default {
    appendEntry,
    getRunningBalance,
    reconstructHistory,
    reconcile,
    reconcileAll,
    getEntriesBySource,
    getInventoryValuation
};
