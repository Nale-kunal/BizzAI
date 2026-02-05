import Organization from '../models/Organization.js';
import Role from '../models/Role.js';
import User from '../models/User.js';
import ChartOfAccounts from '../models/ChartOfAccounts.js';
import { ROLES } from '../config/permissions.js';

/**
 * Seed default organization and roles for existing users
 * This migration ensures backward compatibility
 */
async function seedDefaultOrganizationAndRoles() {
    try {
        console.log('🌱 Starting default organization and roles seeding...');

        // Check if default organization exists
        let defaultOrg = await Organization.findOne({ name: 'Default Organization' });

        if (!defaultOrg) {
            // Create default organization
            defaultOrg = await Organization.create({
                name: 'Default Organization',
                subdomain: 'default',
                subscription: {
                    plan: 'enterprise',
                    status: 'active',
                    features: {
                        maxUsers: 999,
                        maxBranches: 999,
                        maxWarehouses: 999,
                        advancedReporting: true,
                        apiAccess: true
                    }
                },
                settings: {
                    currency: 'INR',
                    timezone: 'Asia/Kolkata',
                    gstEnabled: true
                },
                status: 'active'
            });

            console.log('✅ Created default organization');
        }

        // Create system roles
        const rolesToCreate = Object.values(ROLES);

        for (const roleData of rolesToCreate) {
            const existingRole = await Role.findOne({
                name: roleData.name,
                organization: defaultOrg._id
            });

            if (!existingRole) {
                await Role.create({
                    ...roleData,
                    isSystem: true,
                    organization: defaultOrg._id
                });
                console.log(`✅ Created role: ${roleData.displayName}`);
            }
        }

        // Assign admin role to all existing users
        const adminRole = await Role.findOne({
            name: 'admin',
            organization: defaultOrg._id
        });

        const usersWithoutRoles = await User.find({
            $or: [
                { roles: { $exists: false } },
                { roles: { $size: 0 } }
            ]
        });

        for (const user of usersWithoutRoles) {
            user.roles = [adminRole._id];
            await user.save();
            console.log(`✅ Assigned admin role to user: ${user.email}`);
        }

        // Seed Chart of Accounts
        await seedChartOfAccounts(defaultOrg._id);

        console.log('🎉 Seeding completed successfully!');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}

/**
 * Seed standard Chart of Accounts
 */
async function seedChartOfAccounts(organizationId) {
    const accounts = [
        // Assets
        { code: '1000', name: 'Assets', accountType: 'ASSET', subType: null, normalBalance: 'DEBIT', isSystem: true },
        { code: '1100', name: 'Current Assets', accountType: 'ASSET', subType: 'CURRENT_ASSET', normalBalance: 'DEBIT', isSystem: true },
        { code: '1110', name: 'Cash', accountType: 'ASSET', subType: 'CASH', normalBalance: 'DEBIT', isSystem: true },
        { code: '1120', name: 'Bank Accounts', accountType: 'ASSET', subType: 'BANK', normalBalance: 'DEBIT', isSystem: true },
        { code: '1130', name: 'Accounts Receivable', accountType: 'ASSET', subType: 'ACCOUNTS_RECEIVABLE', normalBalance: 'DEBIT', isSystem: true },
        { code: '1140', name: 'Inventory', accountType: 'ASSET', subType: 'INVENTORY', normalBalance: 'DEBIT', isSystem: true },

        // Liabilities
        { code: '2000', name: 'Liabilities', accountType: 'LIABILITY', subType: null, normalBalance: 'CREDIT', isSystem: true },
        { code: '2100', name: 'Current Liabilities', accountType: 'LIABILITY', subType: 'CURRENT_LIABILITY', normalBalance: 'CREDIT', isSystem: true },
        { code: '2110', name: 'Accounts Payable', accountType: 'LIABILITY', subType: 'ACCOUNTS_PAYABLE', normalBalance: 'CREDIT', isSystem: true },

        // Equity
        { code: '3000', name: 'Equity', accountType: 'EQUITY', subType: 'OWNERS_EQUITY', normalBalance: 'CREDIT', isSystem: true },
        { code: '3100', name: 'Retained Earnings', accountType: 'EQUITY', subType: 'RETAINED_EARNINGS', normalBalance: 'CREDIT', isSystem: true },

        // Revenue
        { code: '4000', name: 'Revenue', accountType: 'REVENUE', subType: 'SALES_REVENUE', normalBalance: 'CREDIT', isSystem: true },
        { code: '4100', name: 'Sales Revenue', accountType: 'REVENUE', subType: 'SALES_REVENUE', normalBalance: 'CREDIT', isSystem: true },
        { code: '4200', name: 'Other Income', accountType: 'REVENUE', subType: 'OTHER_INCOME', normalBalance: 'CREDIT', isSystem: true },

        // Expenses
        { code: '5000', name: 'Expenses', accountType: 'EXPENSE', subType: 'OPERATING_EXPENSE', normalBalance: 'DEBIT', isSystem: true },
        { code: '5100', name: 'Operating Expenses', accountType: 'EXPENSE', subType: 'OPERATING_EXPENSE', normalBalance: 'DEBIT', isSystem: true },

        // COGS
        { code: '6000', name: 'Cost of Goods Sold', accountType: 'COGS', subType: 'COST_OF_GOODS_SOLD', normalBalance: 'DEBIT', isSystem: true }
    ];

    for (const account of accounts) {
        const existing = await ChartOfAccounts.findOne({
            code: account.code,
            organization: organizationId
        });

        if (!existing) {
            await ChartOfAccounts.create({
                ...account,
                organization: organizationId
            });
            console.log(`✅ Created account: ${account.code} - ${account.name}`);
        }
    }
}

export default seedDefaultOrganizationAndRoles;
