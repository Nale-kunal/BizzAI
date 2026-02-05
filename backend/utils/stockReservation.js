import Item from "../models/Item.js";
import { logStockMovement } from "./stockMovementLogger.js";
import { validateStockLevels } from "./inventoryValidator.js";

/**
 * Reserve stock for an item
 * @param {String} itemId - Item ID
 * @param {Number} quantity - Quantity to reserve
 * @param {ObjectId} sourceId - Source document ID (SalesOrder)
 * @param {String} sourceType - Source model name
 * @param {ObjectId} userId - User performing the action
 * @returns {Object} { success, item, error }
 */
export const reserveStock = async (itemId, quantity, sourceId = null, sourceType = "SalesOrder", userId = null) => {
    try {
        // Validate quantity
        if (quantity <= 0) {
            return { success: false, error: 'Invalid quantity: must be greater than 0' };
        }

        const item = await Item.findById(itemId);
        if (!item) {
            return { success: false, error: `Item not found: ${itemId}` };
        }

        const availableStock = item.stockQty - item.reservedStock;
        if (availableStock < quantity) {
            return {
                success: false,
                error: `Insufficient stock for ${item.name}. Available: ${availableStock}, Requested: ${quantity}`
            };
        }

        // Capture previous state
        const previousState = {
            stockQty: item.stockQty,
            reservedStock: item.reservedStock,
            inTransitStock: item.inTransitStock || 0,
        };

        // Update reserved stock
        item.reservedStock += quantity;

        // Validate stock levels
        try {
            validateStockLevels(item);
        } catch (validationError) {
            return { success: false, error: validationError.message };
        }

        await item.save();

        // Capture new state
        const newState = {
            stockQty: item.stockQty,
            reservedStock: item.reservedStock,
            inTransitStock: item.inTransitStock || 0,
        };

        // Log stock movement if source info provided
        if (sourceId && userId) {
            await logStockMovement(
                item,
                "RESERVE",
                quantity,
                sourceId,
                sourceType,
                userId,
                previousState,
                newState
            );
        }

        return { success: true, item };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Release reserved stock for an item
 * @param {String} itemId - Item ID
 * @param {Number} quantity - Quantity to release
 * @param {ObjectId} sourceId - Source document ID (SalesOrder)
 * @param {String} sourceType - Source model name
 * @param {ObjectId} userId - User performing the action
 * @returns {Object} { success, item, error }
 */
export const releaseStock = async (itemId, quantity, sourceId = null, sourceType = "SalesOrder", userId = null) => {
    try {
        const item = await Item.findById(itemId);
        if (!item) {
            return { success: false, error: `Item not found: ${itemId}` };
        }

        if (item.reservedStock < quantity) {
            return {
                success: false,
                error: `Cannot release more than reserved for ${item.name}. Reserved: ${item.reservedStock}, Requested: ${quantity}`
            };
        }

        // Capture previous state
        const previousState = {
            stockQty: item.stockQty,
            reservedStock: item.reservedStock,
            inTransitStock: item.inTransitStock || 0,
        };

        // Update reserved stock
        item.reservedStock -= quantity;

        // Validate stock levels
        try {
            validateStockLevels(item);
        } catch (validationError) {
            return { success: false, error: validationError.message };
        }

        await item.save();

        // Capture new state
        const newState = {
            stockQty: item.stockQty,
            reservedStock: item.reservedStock,
            inTransitStock: item.inTransitStock || 0,
        };

        // Log stock movement if source info provided
        if (sourceId && userId) {
            await logStockMovement(
                item,
                "RELEASE",
                -quantity,  // Negative for release
                sourceId,
                sourceType,
                userId,
                previousState,
                newState
            );
        }

        return { success: true, item };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Check available stock for an item
 * @param {String} itemId - Item ID
 * @returns {Number} Available stock quantity
 */
export const checkAvailableStock = async (itemId) => {
    const item = await Item.findById(itemId);
    if (!item) {
        throw new Error(`Item not found: ${itemId}`);
    }

    return item.stockQty - item.reservedStock;
};

/**
 * Deliver stock (reduces both reserved and actual stock)
 * @param {String} itemId - Item ID
 * @param {Number} quantity - Quantity to deliver
 * @param {ObjectId} sourceId - Source document ID (DeliveryChallan)
 * @param {String} sourceType - Source model name
 * @param {ObjectId} userId - User performing the action
 * @returns {Object} { success, item, error, warning }
 */
export const deliverStock = async (itemId, quantity, sourceId = null, sourceType = "Invoice", userId = null) => {
    try {
        const item = await Item.findById(itemId);
        if (!item) {
            return { success: false, error: `Item not found: ${itemId}` };
        }

        // Capture previous state
        const previousState = {
            stockQty: item.stockQty,
            reservedStock: item.reservedStock,
            inTransitStock: item.inTransitStock || 0,
        };

        let warning = null;

        // Check for over-commitment
        if (item.stockQty < quantity) {
            warning = `Stock over-committed for ${item.name}. Available: ${item.stockQty}, Requested: ${quantity}. Setting to 0.`;
            item.stockQty = 0;
            item.reservedStock = Math.max(0, item.reservedStock - quantity);
        } else {
            // Normal delivery
            item.stockQty -= quantity;
            item.reservedStock = Math.max(0, item.reservedStock - quantity);
        }

        // Validate stock levels
        try {
            validateStockLevels(item);
        } catch (validationError) {
            return { success: false, error: validationError.message };
        }

        await item.save();

        // Capture new state
        const newState = {
            stockQty: item.stockQty,
            reservedStock: item.reservedStock,
            inTransitStock: item.inTransitStock || 0,
        };

        // Log stock movement if source info provided
        if (sourceId && userId) {
            await logStockMovement(
                item,
                "DELIVER",
                -quantity,  // Negative for delivery (stock reduction)
                sourceId,
                sourceType,
                userId,
                previousState,
                newState
            );
        }

        const result = { success: true, item };
        if (warning) {
            result.warning = warning;
        }
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
};

