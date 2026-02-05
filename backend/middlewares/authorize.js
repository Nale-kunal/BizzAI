import Role from '../models/Role.js';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '../config/permissions.js';

/**
 * Authorization middleware
 * Checks if user has required permissions
 * 
 * Usage:
 * - authorize('inventory:create') - Single permission
 * - authorize(['inventory:create', 'inventory:edit']) - Any permission
 * - authorize(['inventory:create', 'inventory:edit'], 'all') - All permissions
 */
export function authorize(requiredPermissions, mode = 'any') {
    return async (req, res, next) => {
        try {
            // User must be authenticated
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Get user's roles and permissions
            const userRoles = req.user.roles || [];

            // If no roles assigned, deny access (except for legacy users)
            if (userRoles.length === 0 && !req.user.role) {
                return res.status(403).json({
                    success: false,
                    message: 'No roles assigned. Access denied.'
                });
            }

            // Fetch all role permissions
            const roles = await Role.find({ _id: { $in: userRoles } });
            const userPermissions = roles.reduce((perms, role) => {
                return [...perms, ...role.permissions];
            }, []);

            // Remove duplicates
            const uniquePermissions = [...new Set(userPermissions)];

            // Normalize required permissions to array
            const required = Array.isArray(requiredPermissions)
                ? requiredPermissions
                : [requiredPermissions];

            // Check permissions based on mode
            let hasAccess = false;

            if (mode === 'all') {
                hasAccess = hasAllPermissions(uniquePermissions, required);
            } else {
                hasAccess = hasAnyPermission(uniquePermissions, required);
            }

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    required: required,
                    mode
                });
            }

            // Attach permissions to request for further use
            req.userPermissions = uniquePermissions;

            next();

        } catch (error) {
            console.error('Authorization error:', error);
            res.status(500).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };
}

/**
 * Check if current user has permission (for use in controllers)
 * @param {Object} req - Express request
 * @param {String|Array} permission - Permission(s) to check
 * @returns {Boolean}
 */
export function checkPermission(req, permission) {
    if (!req.userPermissions) {
        return false;
    }

    if (Array.isArray(permission)) {
        return hasAnyPermission(req.userPermissions, permission);
    }

    return hasPermission(req.userPermissions, permission);
}

export default {
    authorize,
    checkPermission
};
