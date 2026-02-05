/**
 * Integration Tests: Multi-Tenancy
 * 
 * Tests tenant isolation and data scoping
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import Organization from '../../models/Organization.js';
import User from '../../models/User.js';
import Item from '../../models/Item.js';
import Invoice from '../../models/Invoice.js';
import Purchase from '../../models/Purchase.js';

describe('Multi-Tenancy Integration Tests', () => {
    let org1, org2;
    let user1Token, user2Token;
    let user1Id, user2Id;

    beforeAll(async () => {
        // Create two organizations
        org1 = await Organization.create({
            name: 'Organization 1',
            subdomain: 'org1-test',
            settings: { currency: 'INR', timezone: 'Asia/Kolkata' }
        });

        org2 = await Organization.create({
            name: 'Organization 2',
            subdomain: 'org2-test',
            settings: { currency: 'USD', timezone: 'America/New_York' }
        });

        // Create users for each organization
        const user1 = await User.create({
            name: 'User 1',
            email: 'user1@org1.com',
            password: 'Test@123',
            organization: org1._id
        });
        user1Id = user1._id;

        const user2 = await User.create({
            name: 'User 2',
            email: 'user2@org2.com',
            password: 'Test@123',
            organization: org2._id
        });
        user2Id = user2._id;

        // Login both users
        const login1 = await request(app)
            .post('/api/auth/login')
            .send({ email: 'user1@org1.com', password: 'Test@123' });
        user1Token = login1.body.token;

        const login2 = await request(app)
            .post('/api/auth/login')
            .send({ email: 'user2@org2.com', password: 'Test@123' });
        user2Token = login2.body.token;
    });

    afterAll(async () => {
        await Organization.deleteMany({});
        await User.deleteMany({});
        await Item.deleteMany({});
        await Invoice.deleteMany({});
        await Purchase.deleteMany({});
    });

    describe('Tenant Isolation - Items', () => {
        let item1, item2;

        beforeAll(async () => {
            // Create items for each organization
            item1 = await Item.create({
                name: 'Item Org 1',
                sku: 'ORG1-001',
                addedBy: user1Id,
                costPrice: 50,
                sellingPrice: 100,
                purchasePrice: 50,
                currentStock: 100,
                organization: org1._id,
                createdBy: user1Id,
                organizationId: org1._id
            });

            item2 = await Item.create({
                name: 'Item Org 2',
                sku: 'ORG2-001',
                addedBy: user2Id,
                costPrice: 100,
                sellingPrice: 200,
                purchasePrice: 100,
                currentStock: 50,
                organization: org2._id,
                createdBy: user2Id,
                organizationId: org2._id
            });
        });

        test('user1 should only see org1 items', async () => {
            const res = await request(app)
                .get('/api/inventory')
                .set('Authorization', `Bearer ${user1Token}`);

            expect(res.status).toBe(200);
            const items = res.body.items || res.body;
            expect(items.some(i => i._id.toString() === item1._id.toString())).toBe(true);
            expect(items.some(i => i._id.toString() === item2._id.toString())).toBe(false);
        });

        test('user2 should only see org2 items', async () => {
            const res = await request(app)
                .get('/api/inventory')
                .set('Authorization', `Bearer ${user2Token}`);

            expect(res.status).toBe(200);
            const items = res.body.items || res.body;
            expect(items.some(i => i._id.toString() === item2._id.toString())).toBe(true);
            expect(items.some(i => i._id.toString() === item1._id.toString())).toBe(false);
        });

        test('user1 cannot access org2 item by ID', async () => {
            const res = await request(app)
                .get(`/api/inventory/${item2._id}`)
                .set('Authorization', `Bearer ${user1Token}`);

            expect(res.status).toBe(404);
        });

        test('user2 cannot update org1 item', async () => {
            const res = await request(app)
                .put(`/api/inventory/${item1._id}`)
                .set('Authorization', `Bearer ${user2Token}`)
                .send({ currentStock: 999 });

            expect(res.status).toBe(404);

            // Verify item not modified
            const item = await Item.findById(item1._id);
            expect(item.currentStock).toBe(100);
        });

        test('user1 cannot delete org2 item', async () => {
            const res = await request(app)
                .delete(`/api/inventory/${item2._id}`)
                .set('Authorization', `Bearer ${user1Token}`);

            expect(res.status).toBe(404);

            // Verify item still exists
            const item = await Item.findById(item2._id);
            expect(item).toBeDefined();
        });
    });

    describe('Tenant Isolation - Invoices', () => {
        let invoice1, invoice2;

        beforeAll(async () => {
            invoice1 = await Invoice.create({
                invoiceNo: 'INV-ORG1-001',
                customerName: 'Customer Org 1',
                items: [{ itemName: 'Test', quantity: 1, rate: 100 }],
                totalAmount: 100,
                paymentStatus: 'paid',
                createdBy: user1Id,
                organizationId: org1._id
            });

            invoice2 = await Invoice.create({
                invoiceNo: 'INV-ORG2-001',
                customerName: 'Customer Org 2',
                items: [{ itemName: 'Test', quantity: 1, rate: 200 }],
                totalAmount: 200,
                paymentStatus: 'paid',
                createdBy: user2Id,
                organizationId: org2._id
            });
        });

        test('user1 should only see org1 invoices', async () => {
            const res = await request(app)
                .get('/api/sales-invoice')
                .set('Authorization', `Bearer ${user1Token}`);

            expect(res.status).toBe(200);
            const invoices = res.body.invoices || res.body;
            expect(invoices.some(i => i._id.toString() === invoice1._id.toString())).toBe(true);
            expect(invoices.some(i => i._id.toString() === invoice2._id.toString())).toBe(false);
        });

        test('user2 should only see org2 invoices', async () => {
            const res = await request(app)
                .get('/api/sales-invoice')
                .set('Authorization', `Bearer ${user2Token}`);

            expect(res.status).toBe(200);
            const invoices = res.body.invoices || res.body;
            expect(invoices.some(i => i._id.toString() === invoice2._id.toString())).toBe(true);
            expect(invoices.some(i => i._id.toString() === invoice1._id.toString())).toBe(false);
        });
    });

    describe('Tenant Isolation - Purchases', () => {
        let purchase1, purchase2;

        beforeAll(async () => {
            purchase1 = await Purchase.create({
                purchaseNo: 'PUR-ORG1-001',
                supplierName: 'Supplier Org 1',
                items: [{ itemName: 'Test', quantity: 10, rate: 50 }],
                totalAmount: 500,
                purchaseType: 'credit',
                createdBy: user1Id,
                organizationId: org1._id
            });

            purchase2 = await Purchase.create({
                purchaseNo: 'PUR-ORG2-001',
                supplierName: 'Supplier Org 2',
                items: [{ itemName: 'Test', quantity: 20, rate: 100 }],
                totalAmount: 2000,
                purchaseType: 'credit',
                createdBy: user2Id,
                organizationId: org2._id
            });
        });

        test('user1 should only see org1 purchases', async () => {
            const res = await request(app)
                .get('/api/purchases')
                .set('Authorization', `Bearer ${user1Token}`);

            expect(res.status).toBe(200);
            const purchases = res.body.purchases || res.body;
            expect(purchases.some(p => p._id.toString() === purchase1._id.toString())).toBe(true);
            expect(purchases.some(p => p._id.toString() === purchase2._id.toString())).toBe(false);
        });

        test('user2 should only see org2 purchases', async () => {
            const res = await request(app)
                .get('/api/purchases')
                .set('Authorization', `Bearer ${user2Token}`);

            expect(res.status).toBe(200);
            const purchases = res.body.purchases || res.body;
            expect(purchases.some(p => p._id.toString() === purchase2._id.toString())).toBe(true);
            expect(purchases.some(p => p._id.toString() === purchase1._id.toString())).toBe(false);
        });
    });

    describe('Cross-Tenant Prevention', () => {
        test('should prevent cross-tenant data leakage in aggregations', async () => {
            // Get dashboard for user1
            const res1 = await request(app)
                .get('/api/reports/dashboard')
                .set('Authorization', `Bearer ${user1Token}`);

            // Get dashboard for user2
            const res2 = await request(app)
                .get('/api/reports/dashboard')
                .set('Authorization', `Bearer ${user2Token}`);

            expect(res1.status).toBe(200);
            expect(res2.status).toBe(200);

            // Dashboards should have different data
            expect(res1.body).not.toEqual(res2.body);
        });

        test('should enforce organizationId in all queries', async () => {
            // Verify all models have organizationId
            const modelsToCheck = [Item, Invoice, Purchase];

            for (const Model of modelsToCheck) {
                const schema = Model.schema;
                expect(schema.path('organizationId')).toBeDefined();
            }
        });
    });
});
