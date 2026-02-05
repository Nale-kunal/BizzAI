/**
 * Permission definitions for RBAC
 * 
 * Format: 'resource:action'
 */

export const PERMISSIONS = {
    // Inventory
    INVENTORY_VIEW: 'inventory:view',
    INVENTORY_CREATE: 'inventory:create',
    INVENTORY_EDIT: 'inventory:edit',
    INVENTORY_DELETE: 'inventory:delete',

    // Purchases
    PURCHASE_VIEW: 'purchase:view',
    PURCHASE_CREATE: 'purchase:create',
    PURCHASE_EDIT: 'purchase:edit',
    PURCHASE_DELETE: 'purchase:delete',
    PURCHASE_APPROVE: 'purchase:approve',

    // Sales
    SALES_VIEW: 'sales:view',
    SALES_CREATE: 'sales:create',
    SALES_EDIT: 'sales:edit',
    SALES_DELETE: 'sales:delete',

    // Customers
    CUSTOMER_VIEW: 'customer:view',
    CUSTOMER_CREATE: 'customer:create',
    CUSTOMER_EDIT: 'customer:edit',
    CUSTOMER_DELETE: 'customer:delete',

    // Suppliers
    SUPPLIER_VIEW: 'supplier:view',
    SUPPLIER_CREATE: 'supplier:create',
    SUPPLIER_EDIT: 'supplier:edit',
    SUPPLIER_DELETE: 'supplier:delete',

    // Payments
    PAYMENT_VIEW: 'payment:view',
    PAYMENT_CREATE: 'payment:create',
    PAYMENT_EDIT: 'payment:edit',
    PAYMENT_DELETE: 'payment:delete',

    // Reports
    REPORT_VIEW: 'report:view',
    REPORT_EXPORT: 'report:export',
    REPORT_FINANCIAL: 'report:financial',

    // Users
    USER_VIEW: 'user:view',
    USER_CREATE: 'user:create',
    USER_EDIT: 'user:edit',
    USER_DELETE: 'user:delete',

    // Settings
    SETTINGS_VIEW: 'settings:view',
    SETTINGS_EDIT: 'settings:edit',

    // Accounting
    ACCOUNTING_VIEW: 'accounting:view',
    ACCOUNTING_EDIT: 'accounting:edit',
    ACCOUNTING_POST: 'accounting:post',

    // Ledger
    LEDGER_VIEW: 'ledger:view',
    LEDGER_RECONCILE: 'ledger:reconcile'
};

/**
 * Role definitions with permissions
 */
export const ROLES = {
    ADMIN: {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full system access',
        permissions: Object.values(PERMISSIONS)
    },

    MANAGER: {
        name: 'manager',
        displayName: 'Manager',
        description: 'Manage operations, view reports',
        permissions: [
            PERMISSIONS.INVENTORY_VIEW,
            PERMISSIONS.INVENTORY_CREATE,
            PERMISSIONS.INVENTORY_EDIT,
            PERMISSIONS.PURCHASE_VIEW,
            PERMISSIONS.PURCHASE_CREATE,
            PERMISSIONS.PURCHASE_EDIT,
            PERMISSIONS.PURCHASE_APPROVE,
            PERMISSIONS.SALES_VIEW,
            PERMISSIONS.SALES_CREATE,
            PERMISSIONS.SALES_EDIT,
            PERMISSIONS.CUSTOMER_VIEW,
            PERMISSIONS.CUSTOMER_CREATE,
            PERMISSIONS.CUSTOMER_EDIT,
            PERMISSIONS.SUPPLIER_VIEW,
            PERMISSIONS.SUPPLIER_CREATE,
            PERMISSIONS.SUPPLIER_EDIT,
            PERMISSIONS.PAYMENT_VIEW,
            PERMISSIONS.PAYMENT_CREATE,
            PERMISSIONS.REPORT_VIEW,
            PERMISSIONS.REPORT_EXPORT,
            PERMISSIONS.REPORT_FINANCIAL,
            PERMISSIONS.LEDGER_VIEW,
            PERMISSIONS.SETTINGS_VIEW
        ]
    },

    STAFF: {
        name: 'staff',
        displayName: 'Staff',
        description: 'Create and edit transactions',
        permissions: [
            PERMISSIONS.INVENTORY_VIEW,
            PERMISSIONS.INVENTORY_CREATE,
            PERMISSIONS.INVENTORY_EDIT,
            PERMISSIONS.PURCHASE_VIEW,
            PERMISSIONS.PURCHASE_CREATE,
            PERMISSIONS.SALES_VIEW,
            PERMISSIONS.SALES_CREATE,
            PERMISSIONS.CUSTOMER_VIEW,
            PERMISSIONS.CUSTOMER_CREATE,
            PERMISSIONS.SUPPLIER_VIEW,
            PERMISSIONS.PAYMENT_VIEW,
            PERMISSIONS.PAYMENT_CREATE,
            PERMISSIONS.REPORT_VIEW
        ]
    },

    VIEWER: {
        name: 'viewer',
        displayName: 'Viewer',
        description: 'Read-only access',
        permissions: [
            PERMISSIONS.INVENTORY_VIEW,
            PERMISSIONS.PURCHASE_VIEW,
            PERMISSIONS.SALES_VIEW,
            PERMISSIONS.CUSTOMER_VIEW,
            PERMISSIONS.SUPPLIER_VIEW,
            PERMISSIONS.PAYMENT_VIEW,
            PERMISSIONS.REPORT_VIEW,
            PERMISSIONS.LEDGER_VIEW
        ]
    }
};

/**
 * Check if user has permission
 * @param {Array} userPermissions - User's permissions
 * @param {String} requiredPermission - Required permission
 * @returns {Boolean}
 */
export function hasPermission(userPermissions, requiredPermission) {
    return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has any of the permissions
 * @param {Array} userPermissions - User's permissions
 * @param {Array} requiredPermissions - Required permissions (any)
 * @returns {Boolean}
 */
export function hasAnyPermission(userPermissions, requiredPermissions) {
    return requiredPermissions.some(perm => userPermissions.includes(perm));
}

/**
 * Check if user has all permissions
 * @param {Array} userPermissions - User's permissions
 * @param {Array} requiredPermissions - Required permissions (all)
 * @returns {Boolean}
 */
export function hasAllPermissions(userPermissions, requiredPermissions) {
    return requiredPermissions.every(perm => userPermissions.includes(perm));
}

export default {
    PERMISSIONS,
    ROLES,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
};
