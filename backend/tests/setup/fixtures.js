import User from '../../models/User.js';
import Item from '../../models/Item.js';
import Customer from '../../models/Customer.js';
import Supplier from '../../models/Supplier.js';
import BankAccount from '../../models/BankAccount.js';
import Organization from '../../models/Organization.js';

/**
 * Test fixtures for consistent test data
 */

export const createTestUser = async (overrides = {}) => {
    // Create organization first
    const organization = await Organization.create({
        name: 'Test Organization',
        subdomain: `test-org-${Date.now()}`,
        owner: null, // Will be set after user creation
        settings: {}
    });

    const defaultUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        shopName: 'Test Shop',
        gstNumber: '29ABCDE1234F1Z5',
        shopAddress: '123 Test Street',
        phone: '9876543210',
        role: 'owner',
        organizationId: organization._id,
        ...overrides
    };

    const user = await User.create(defaultUser);

    // Update organization owner
    organization.owner = user._id;
    await organization.save();

    return user;
};

export const createTestItem = async (userId, overrides = {}) => {
    const defaultItem = {
        name: 'Test Item',
        sku: 'TEST-001',
        barcode: '1234567890',
        category: 'Test Category',
        costPrice: 100,
        sellingPrice: 150,
        stockQty: 100,
        lowStockLimit: 10,
        unit: 'pcs',
        hsnCode: '1234',
        taxRate: 18,
        addedBy: userId,
        ...overrides
    };

    const item = await Item.create(defaultItem);
    return item;
};

export const createTestCustomer = async (userId, overrides = {}) => {
    const defaultCustomer = {
        name: 'Test Customer',
        email: 'customer@example.com',
        phone: '9876543210',
        address: '456 Customer Street',
        gstNumber: '29XYZAB1234C1Z5',
        creditLimit: 10000,
        outstandingBalance: 0,
        addedBy: userId,
        ...overrides
    };

    const customer = await Customer.create(defaultCustomer);
    return customer;
};

export const createTestSupplier = async (userId, overrides = {}) => {
    const defaultSupplier = {
        supplierId: `SUP-${Date.now()}`,
        businessName: 'Test Supplier Business',
        contactPersonName: 'Test Contact Person',
        contactNo: '9876543210',
        email: `supplier${Date.now()}@example.com`,
        physicalAddress: '789 Supplier Street',
        gstNo: '29PQRST1234D1Z5',
        state: 'Karnataka',
        supplierType: 'wholesaler',
        openingBalance: 0,
        outstandingBalance: 0,
        owner: userId,
        ...overrides
    };

    const supplier = await Supplier.create(defaultSupplier);
    return supplier;
};

export const createTestBankAccount = async (userId, overrides = {}) => {
    const defaultBankAccount = {
        accountName: 'Test Bank Account',
        accountNumber: '1234567890',
        bankName: 'Test Bank',
        ifscCode: 'TEST0001234',
        branch: 'Test Branch',
        accountType: 'current',
        balance: 100000,
        isDefault: true,
        addedBy: userId,
        ...overrides
    };

    const bankAccount = await BankAccount.create(defaultBankAccount);
    return bankAccount;
};

/**
 * Helper to create a complete test environment
 */
export const createTestEnvironment = async () => {
    const user = await createTestUser();
    const item = await createTestItem(user._id);
    const customer = await createTestCustomer(user._id);
    const supplier = await createTestSupplier(user._id);
    const bankAccount = await createTestBankAccount(user._id);

    return {
        user,
        item,
        customer,
        supplier,
        bankAccount
    };
};
