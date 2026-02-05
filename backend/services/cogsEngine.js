import StockLedger from '../models/StockLedger.js';

/**
 * COGS Engine - Cost of Goods Sold calculation
 * Supports FIFO, LIFO, and Weighted Average methods
 */

/**
 * Calculate COGS using FIFO method
 * @param {ObjectId} itemId - Item ID
 * @param {Number} quantitySold - Quantity sold
 * @param {Date} saleDate - Sale date
 * @returns {Promise<Object>} COGS calculation
 */
export async function calculateCOGS_FIFO(itemId, quantitySold, saleDate) {
    try {
        // Get all purchase entries before sale date
        const purchases = await StockLedger
            .find({
                item: itemId,
                transactionType: { $in: ['PURCHASE', 'SALES_RETURN', 'ADJUSTMENT_IN', 'INITIAL_STOCK'] },
                timestamp: { $lte: saleDate },
                quantityChange: { $gt: 0 }
            })
            .sort({ timestamp: 1 }); // Oldest first (FIFO)

        // Get all sales/outflows before this sale
        const outflows = await StockLedger
            .find({
                item: itemId,
                transactionType: { $in: ['SALE', 'PURCHASE_RETURN', 'ADJUSTMENT_OUT', 'DAMAGE'] },
                timestamp: { $lt: saleDate },
                quantityChange: { $lt: 0 }
            });

        const totalOutflow = Math.abs(outflows.reduce((sum, o) => sum + o.quantityChange, 0));

        // Calculate COGS
        let remainingQty = quantitySold;
        let totalCost = 0;
        let purchaseOffset = totalOutflow; // Skip already consumed inventory
        const layers = [];

        for (const purchase of purchases) {
            if (remainingQty <= 0) break;

            const purchaseQty = purchase.quantityChange;

            // Skip if this purchase was already consumed
            if (purchaseOffset >= purchaseQty) {
                purchaseOffset -= purchaseQty;
                continue;
            }

            // Calculate available quantity from this purchase
            const availableQty = purchaseQty - purchaseOffset;
            const qtyToUse = Math.min(availableQty, remainingQty);

            const cost = qtyToUse * purchase.costPerUnit;
            totalCost += cost;
            remainingQty -= qtyToUse;
            purchaseOffset = 0;

            layers.push({
                purchaseDate: purchase.timestamp,
                quantity: qtyToUse,
                costPerUnit: purchase.costPerUnit,
                totalCost: cost
            });
        }

        if (remainingQty > 0) {
            throw new Error(`Insufficient inventory to calculate COGS. Short by ${remainingQty} units`);
        }

        return {
            method: 'FIFO',
            quantitySold,
            totalCOGS: totalCost,
            averageCost: totalCost / quantitySold,
            layers
        };

    } catch (error) {
        throw new Error(`FIFO COGS calculation failed: ${error.message}`);
    }
}

/**
 * Calculate COGS using Weighted Average method
 * @param {ObjectId} itemId - Item ID
 * @param {Number} quantitySold - Quantity sold
 * @param {Date} saleDate - Sale date
 * @returns {Promise<Object>} COGS calculation
 */
export async function calculateCOGS_WeightedAverage(itemId, quantitySold, saleDate) {
    try {
        // Get all entries before sale date
        const entries = await StockLedger
            .find({
                item: itemId,
                timestamp: { $lte: saleDate }
            })
            .sort({ timestamp: 1 });

        let totalQuantity = 0;
        let totalValue = 0;

        for (const entry of entries) {
            totalQuantity += entry.quantityChange;
            totalValue += entry.totalValue;
        }

        if (totalQuantity < quantitySold) {
            throw new Error(`Insufficient inventory. Available: ${totalQuantity}, Required: ${quantitySold}`);
        }

        const weightedAverageCost = totalValue / totalQuantity;
        const totalCOGS = weightedAverageCost * quantitySold;

        return {
            method: 'WEIGHTED_AVERAGE',
            quantitySold,
            totalCOGS,
            averageCost: weightedAverageCost,
            currentInventoryQty: totalQuantity - quantitySold,
            currentInventoryValue: totalValue - totalCOGS
        };

    } catch (error) {
        throw new Error(`Weighted Average COGS calculation failed: ${error.message}`);
    }
}

/**
 * Calculate COGS using LIFO method
 * @param {ObjectId} itemId - Item ID
 * @param {Number} quantitySold - Quantity sold
 * @param {Date} saleDate - Sale date
 * @returns {Promise<Object>} COGS calculation
 */
export async function calculateCOGS_LIFO(itemId, quantitySold, saleDate) {
    try {
        // Get all purchase entries before sale date
        const purchases = await StockLedger
            .find({
                item: itemId,
                transactionType: { $in: ['PURCHASE', 'SALES_RETURN', 'ADJUSTMENT_IN', 'INITIAL_STOCK'] },
                timestamp: { $lte: saleDate },
                quantityChange: { $gt: 0 }
            })
            .sort({ timestamp: -1 }); // Newest first (LIFO)

        // Get all sales/outflows before this sale
        const outflows = await StockLedger
            .find({
                item: itemId,
                transactionType: { $in: ['SALE', 'PURCHASE_RETURN', 'ADJUSTMENT_OUT', 'DAMAGE'] },
                timestamp: { $lt: saleDate },
                quantityChange: { $lt: 0 }
            });

        const totalOutflow = Math.abs(outflows.reduce((sum, o) => sum + o.quantityChange, 0));

        // Calculate COGS (similar to FIFO but from newest purchases)
        let remainingQty = quantitySold;
        let totalCost = 0;
        let purchaseOffset = totalOutflow;
        const layers = [];

        for (const purchase of purchases) {
            if (remainingQty <= 0) break;

            const purchaseQty = purchase.quantityChange;

            if (purchaseOffset >= purchaseQty) {
                purchaseOffset -= purchaseQty;
                continue;
            }

            const availableQty = purchaseQty - purchaseOffset;
            const qtyToUse = Math.min(availableQty, remainingQty);

            const cost = qtyToUse * purchase.costPerUnit;
            totalCost += cost;
            remainingQty -= qtyToUse;
            purchaseOffset = 0;

            layers.push({
                purchaseDate: purchase.timestamp,
                quantity: qtyToUse,
                costPerUnit: purchase.costPerUnit,
                totalCost: cost
            });
        }

        if (remainingQty > 0) {
            throw new Error(`Insufficient inventory to calculate COGS. Short by ${remainingQty} units`);
        }

        return {
            method: 'LIFO',
            quantitySold,
            totalCOGS: totalCost,
            averageCost: totalCost / quantitySold,
            layers
        };

    } catch (error) {
        throw new Error(`LIFO COGS calculation failed: ${error.message}`);
    }
}

/**
 * Calculate COGS using configured method
 * @param {ObjectId} itemId - Item ID
 * @param {Number} quantitySold - Quantity sold
 * @param {Date} saleDate - Sale date
 * @param {String} method - FIFO, LIFO, or WEIGHTED_AVERAGE
 * @returns {Promise<Object>} COGS calculation
 */
export async function calculateCOGS(itemId, quantitySold, saleDate, method = 'FIFO') {
    switch (method.toUpperCase()) {
        case 'FIFO':
            return calculateCOGS_FIFO(itemId, quantitySold, saleDate);
        case 'LIFO':
            return calculateCOGS_LIFO(itemId, quantitySold, saleDate);
        case 'WEIGHTED_AVERAGE':
        case 'AVERAGE':
            return calculateCOGS_WeightedAverage(itemId, quantitySold, saleDate);
        default:
            throw new Error(`Unknown COGS method: ${method}`);
    }
}

export default {
    calculateCOGS,
    calculateCOGS_FIFO,
    calculateCOGS_LIFO,
    calculateCOGS_WeightedAverage
};
