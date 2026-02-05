import request from 'supertest';
import app from '../../app.js';
import Item from '../../models/Item.js';
import { createTestUser, createTestItem } from '../setup/fixtures.js';

describe('Inventory API Integration Tests', () => {
    let testUser, authToken;

    beforeEach(async () => {
        testUser = await createTestUser();

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: 'Password123!'
            });

        authToken = loginResponse.body.token;
    });

    describe('POST /api/inventory', () => {
        test('should create new item successfully', async () => {
            const itemData = {
                name: 'New Test Item',
                sku: 'NEW-001',
                barcode: '9876543210',
                category: 'Electronics',
                costPrice: 500,
                sellingPrice: 750,
                stockQty: 50,
                lowStockLimit: 10,
                unit: 'pcs',
                hsnCode: '8471',
                taxRate: 18
            };

            const response = await request(app)
                .post('/api/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(itemData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.item).toHaveProperty('name', itemData.name);
            expect(response.body.item).toHaveProperty('sku', itemData.sku);
            expect(response.body.item).toHaveProperty('stockQty', itemData.stockQty);

            // Verify item created in database
            const item = await Item.findOne({ name: itemData.name, addedBy: testUser._id });
            expect(item).toBeTruthy();
            expect(item.costPrice).toBe(itemData.costPrice);
        });

        test('should fail with duplicate item name for same user', async () => {
            await createTestItem(testUser._id, { name: 'Duplicate Item' });

            const itemData = {
                name: 'Duplicate Item',
                costPrice: 100,
                sellingPrice: 150
            };

            const response = await request(app)
                .post('/api/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(itemData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should calculate available stock correctly', async () => {
            const itemData = {
                name: 'Stock Test Item',
                costPrice: 100,
                sellingPrice: 150,
                stockQty: 100,
                reservedStock: 30
            };

            const response = await request(app)
                .post('/api/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .send(itemData)
                .expect(201);

            expect(response.body.item.availableStock).toBe(70); // 100 - 30
        });
    });

    describe('GET /api/inventory', () => {
        beforeEach(async () => {
            await createTestItem(testUser._id, { name: 'Item 1', category: 'Category A' });
            await createTestItem(testUser._id, { name: 'Item 2', category: 'Category B', sku: 'ITEM-002' });
            await createTestItem(testUser._id, { name: 'Item 3', category: 'Category A', sku: 'ITEM-003' });
        });

        test('should get all items for authenticated user', async () => {
            const response = await request(app)
                .get('/api/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.items).toHaveLength(3);
            expect(response.body.items.every(item => item.addedBy.toString() === testUser._id.toString())).toBe(true);
        });

        test('should filter items by category', async () => {
            const response = await request(app)
                .get('/api/inventory?category=Category A')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.items).toHaveLength(2);
            expect(response.body.items.every(item => item.category === 'Category A')).toBe(true);
        });

        test('should search items by name', async () => {
            const response = await request(app)
                .get('/api/inventory?search=Item 2')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].name).toBe('Item 2');
        });

        test('should not return items from other users', async () => {
            const otherUser = await createTestUser({ email: 'other@example.com' });
            await createTestItem(otherUser._id, { name: 'Other User Item' });

            const response = await request(app)
                .get('/api/inventory')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.items).toHaveLength(3);
            expect(response.body.items.every(item => item.name !== 'Other User Item')).toBe(true);
        });
    });

    describe('PUT /api/inventory/:id', () => {
        let testItem;

        beforeEach(async () => {
            testItem = await createTestItem(testUser._id);
        });

        test('should update item successfully', async () => {
            const updates = {
                sellingPrice: 200,
                lowStockLimit: 15
            };

            const response = await request(app)
                .put(`/api/inventory/${testItem._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.item.sellingPrice).toBe(200);
            expect(response.body.item.lowStockLimit).toBe(15);

            // Verify in database
            const updatedItem = await Item.findById(testItem._id);
            expect(updatedItem.sellingPrice).toBe(200);
        });

        test('should not allow updating another user\'s item', async () => {
            const otherUser = await createTestUser({ email: 'other@example.com' });
            const otherItem = await createTestItem(otherUser._id);

            const response = await request(app)
                .put(`/api/inventory/${otherItem._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ sellingPrice: 999 })
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/inventory/:id', () => {
        let testItem;

        beforeEach(async () => {
            testItem = await createTestItem(testUser._id);
        });

        test('should delete item successfully', async () => {
            const response = await request(app)
                .delete(`/api/inventory/${testItem._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify soft delete
            const deletedItem = await Item.findById(testItem._id);
            expect(deletedItem.isDeleted).toBe(true);
            expect(deletedItem.deletedBy.toString()).toBe(testUser._id.toString());
        });

        test('should not allow deleting another user\'s item', async () => {
            const otherUser = await createTestUser({ email: 'other@example.com' });
            const otherItem = await createTestItem(otherUser._id);

            const response = await request(app)
                .delete(`/api/inventory/${otherItem._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/inventory/low-stock', () => {
        beforeEach(async () => {
            await createTestItem(testUser._id, { name: 'Low Stock Item', stockQty: 5, lowStockLimit: 10 });
            await createTestItem(testUser._id, { name: 'Normal Stock Item', stockQty: 50, lowStockLimit: 10 });
        });

        test('should return only low stock items', async () => {
            const response = await request(app)
                .get('/api/inventory/low-stock')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].name).toBe('Low Stock Item');
        });
    });
});
