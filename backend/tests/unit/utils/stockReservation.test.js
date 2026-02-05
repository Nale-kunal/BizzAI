import { reserveStock, releaseStock, deliverStock } from '../../../utils/stockReservation.js';
import Item from '../../../models/Item.js';
import StockMovement from '../../../models/StockMovement.js';
import { createTestUser, createTestItem } from '../../setup/fixtures.js';

describe('Stock Reservation Utilities', () => {
    let user, item;

    beforeEach(async () => {
        user = await createTestUser();
        item = await createTestItem(user._id, { stockQty: 100, reservedStock: 0 });
    });

    describe('reserveStock', () => {
        test('should reserve stock successfully', async () => {
            const sourceId = '507f1f77bcf86cd799439011';
            const result = await reserveStock(item._id, 10, sourceId, 'SalesOrder', user._id);

            expect(result.success).toBe(true);

            // Verify item updated
            const updatedItem = await Item.findById(item._id);
            expect(updatedItem.reservedStock).toBe(10);
            expect(updatedItem.stockQty).toBe(100); // Stock qty unchanged

            // Verify stock movement created
            const movement = await StockMovement.findOne({ item: item._id, type: 'RESERVE' });
            expect(movement).toBeTruthy();
            expect(movement.quantity).toBe(10);
            expect(movement.previousReserved).toBe(0);
            expect(movement.newReserved).toBe(10);
        });

        test('should fail when insufficient stock available', async () => {
            const sourceId = '507f1f77bcf86cd799439011';
            const result = await reserveStock(item._id, 150, sourceId, 'SalesOrder', user._id);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Insufficient stock');

            // Verify item unchanged
            const updatedItem = await Item.findById(item._id);
            expect(updatedItem.reservedStock).toBe(0);
        });

        test('should handle partial reservation correctly', async () => {
            // Reserve 50 first
            await reserveStock(item._id, 50, '507f1f77bcf86cd799439011', 'SalesOrder', user._id);

            // Try to reserve 60 more (should fail)
            const result = await reserveStock(item._id, 60, '507f1f77bcf86cd799439012', 'SalesOrder', user._id);

            expect(result.success).toBe(false);

            // Verify only first reservation applied
            const updatedItem = await Item.findById(item._id);
            expect(updatedItem.reservedStock).toBe(50);
        });

        test('should prevent negative reservation', async () => {
            const sourceId = '507f1f77bcf86cd799439011';
            const result = await reserveStock(item._id, -10, sourceId, 'SalesOrder', user._id);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid quantity');
        });
    });

    describe('releaseStock', () => {
        beforeEach(async () => {
            // Reserve some stock first
            await reserveStock(item._id, 30, '507f1f77bcf86cd799439011', 'SalesOrder', user._id);
        });

        test('should release reserved stock successfully', async () => {
            const sourceId = '507f1f77bcf86cd799439011';
            const result = await releaseStock(item._id, 30, sourceId, 'SalesOrder', user._id);

            expect(result.success).toBe(true);

            // Verify item updated
            const updatedItem = await Item.findById(item._id);
            expect(updatedItem.reservedStock).toBe(0);
            expect(updatedItem.stockQty).toBe(100); // Stock qty unchanged

            // Verify stock movement created
            const movement = await StockMovement.findOne({ item: item._id, type: 'RELEASE' });
            expect(movement).toBeTruthy();
            expect(movement.quantity).toBe(-30);
            expect(movement.previousReserved).toBe(30);
            expect(movement.newReserved).toBe(0);
        });

        test('should fail when releasing more than reserved', async () => {
            const sourceId = '507f1f77bcf86cd799439011';
            const result = await releaseStock(item._id, 50, sourceId, 'SalesOrder', user._id);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot release more than reserved');

            // Verify item unchanged
            const updatedItem = await Item.findById(item._id);
            expect(updatedItem.reservedStock).toBe(30);
        });
    });

    describe('deliverStock', () => {
        beforeEach(async () => {
            // Reserve some stock first
            await reserveStock(item._id, 20, '507f1f77bcf86cd799439011', 'SalesOrder', user._id);
        });

        test('should deliver stock successfully', async () => {
            const sourceId = '507f1f77bcf86cd799439011';
            const result = await deliverStock(item._id, 20, sourceId, 'DeliveryChallan', user._id);

            expect(result.success).toBe(true);

            // Verify item updated
            const updatedItem = await Item.findById(item._id);
            expect(updatedItem.reservedStock).toBe(0); // Reserved released
            expect(updatedItem.stockQty).toBe(80); // Stock reduced

            // Verify stock movement created
            const movement = await StockMovement.findOne({ item: item._id, type: 'DELIVER' });
            expect(movement).toBeTruthy();
            expect(movement.quantity).toBe(-20);
            expect(movement.previousStock).toBe(100);
            expect(movement.newStock).toBe(80);
        });

        test('should handle over-committed stock gracefully', async () => {
            // Create over-commitment scenario
            await Item.findByIdAndUpdate(item._id, { stockQty: 10, reservedStock: 20 });

            const sourceId = '507f1f77bcf86cd799439011';
            const result = await deliverStock(item._id, 20, sourceId, 'DeliveryChallan', user._id);

            // Should still process but flag over-commitment
            expect(result.success).toBe(true);
            expect(result.warning).toContain('over-committed');

            const updatedItem = await Item.findById(item._id);
            expect(updatedItem.stockQty).toBe(0); // Can't go negative
            expect(updatedItem.reservedStock).toBe(0);
        });
    });
});
