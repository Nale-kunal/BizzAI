/**
 * Tenant Context Middleware
 * Automatically injects organizationId into queries and creates
 */

export function tenantContext(req, res, next) {
    try {
        // Extract organization from authenticated user
        if (req.user && req.user.organizationId) {
            req.tenant = {
                organizationId: req.user.organizationId,
                branchId: req.user.branchId || null,
                warehouseId: req.user.warehouseId || null
            };
        } else {
            // For unauthenticated requests or backward compatibility
            // Set tenant to null - auth middleware will handle authentication
            req.tenant = {
                organizationId: null,
                branchId: null,
                warehouseId: null
            };
        }

        next();
    } catch (error) {
        console.error('Tenant context error:', error);
        // Don't fail the request, just log and continue
        // Auth middleware will handle authentication failures
        next();
    }
}

/**
 * Add tenant filter to query
 * Usage: addTenantFilter(req, { name: 'Item 1' })
 */
export function addTenantFilter(req, query = {}) {
    if (req.tenant && req.tenant.organizationId) {
        return {
            ...query,
            organizationId: req.tenant.organizationId
        };
    }
    return query;
}

/**
 * Add tenant data to document
 * Usage: addTenantData(req, { name: 'Item 1' })
 */
export function addTenantData(req, data = {}) {
    if (req.tenant && req.tenant.organizationId) {
        return {
            ...data,
            organizationId: req.tenant.organizationId,
            branchId: req.tenant.branchId,
            warehouseId: req.tenant.warehouseId
        };
    }
    return data;
}

export default {
    tenantContext,
    addTenantFilter,
    addTenantData
};
