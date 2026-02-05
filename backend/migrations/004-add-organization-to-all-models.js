/**
 * Migration: Add organizationId to All Models
 * 
 * Adds organizationId field to all domain models and assigns
 * all existing documents to the default organization.
 * 
 * This enables full multi-tenant enforcement.
 */

import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import Purchase from '../models/Purchase.js';
import Invoice from '../models/Invoice.js';
import Item from '../models/Item.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import Bill from '../models/Bill.js';
import PaymentIn from '../models/PaymentIn.js';
import PaymentOut from '../models/PaymentOut.js';
import Return from '../models/Return.js';
import PurchaseReturn from '../models/PurchaseReturn.js';
import Expense from '../models/Expense.js';
import BankAccount from '../models/BankAccount.js';
import StockLedger from '../models/StockLedger.js';

export async function up() {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            console.log('🏢 Adding organizationId to all models...');

            // Get default organization
            const defaultOrg = await Organization.findOne({}).session(session);

            if (!defaultOrg) {
                throw new Error('No organization found. Please run migration 001 first.');
            }

            console.log(`\n📊 Using default organization: ${defaultOrg.name}`);

            const models = [
                { name: 'Purchase', model: Purchase },
                { name: 'Invoice', model: Invoice },
                { name: 'Item', model: Item },
                { name: 'Customer', model: Customer },
                { name: 'Supplier', model: Supplier },
                { name: 'Bill', model: Bill },
                { name: 'PaymentIn', model: PaymentIn },
                { name: 'PaymentOut', model: PaymentOut },
                { name: 'Return', model: Return },
                { name: 'PurchaseReturn', model: PurchaseReturn },
                { name: 'Expense', model: Expense },
                { name: 'BankAccount', model: BankAccount },
                { name: 'StockLedger', model: StockLedger }
            ];

            for (const { name, model } of models) {
                try {
                    const result = await model.updateMany(
                        { organizationId: { $exists: false } },
                        { $set: { organizationId: defaultOrg._id } },
                        { session }
                    );

                    console.log(`✅ ${name}: Updated ${result.modifiedCount} documents`);

                    // Create index
                    await model.collection.createIndex(
                        { organizationId: 1 },
                        { session }
                    );

                    console.log(`✅ ${name}: Created organizationId index`);
                } catch (error) {
                    console.error(`⚠️  ${name}: ${error.message}`);
                    // Continue with other models
                }
            }

            console.log('\n✅ Multi-tenant migration complete');
        });
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

export async function down() {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            console.log('🔄 Rolling back organizationId from all models...');

            const models = [
                Purchase, Invoice, Item, Customer, Supplier, Bill,
                PaymentIn, PaymentOut, Return, PurchaseReturn,
                Expense, BankAccount, StockLedger
            ];

            for (const model of models) {
                await model.updateMany(
                    {},
                    { $unset: { organizationId: '' } },
                    { session }
                );

                // Drop index
                try {
                    await model.collection.dropIndex('organizationId_1', { session });
                } catch (error) {
                    // Index might not exist
                }
            }

            console.log('✅ Rollback complete');
        });
    } catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

export default { up, down };

