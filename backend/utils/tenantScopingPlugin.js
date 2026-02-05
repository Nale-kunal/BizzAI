/**
 * Tenant Scoping Plugin for Mongoose
 * 
 * Automatically injects organizationId into all queries and creates
 * Prevents cross-tenant data access at the database level
 * 
 * Usage:
 *   import tenantScopingPlugin from './utils/tenantScopingPlugin.js';
 *   schema.plugin(tenantScopingPlugin);
 */

/**
 * Mongoose plugin to add automatic tenant scoping
 * 
 * @param {Schema} schema - Mongoose schema
 * @param {Object} options - Plugin options
 */
export default function tenantScopingPlugin(schema, options = {}) {
    // Skip if schema doesn't have organizationId field
    if (!schema.path('organizationId')) {
        return;
    }

    /**
     * Pre-find hook: Automatically add organizationId to queries
     */
    schema.pre(/^find/, function (next) {
        // Get organizationId from query context
        const organizationId = this.getOptions().organizationId;

        if (organizationId) {
            // Only add filter if not already present
            if (!this.getQuery().organizationId) {
                this.where({ organizationId });
            }
        }

        next();
    });

    /**
     * Pre-save hook: Automatically add organizationId to new documents
     */
    schema.pre('save', function (next) {
        // Only set on new documents
        if (this.isNew && !this.organizationId) {
            const organizationId = this.$locals.organizationId;

            if (organizationId) {
                this.organizationId = organizationId;
            }
        }

        next();
    });

    /**
     * Pre-update hooks: Prevent cross-tenant updates
     */
    const updateHooks = [
        'updateOne',
        'updateMany',
        'findOneAndUpdate',
        'findOneAndReplace'
    ];

    updateHooks.forEach(hook => {
        schema.pre(hook, function (next) {
            const organizationId = this.getOptions().organizationId;

            if (organizationId) {
                // Add organizationId to query filter
                if (!this.getQuery().organizationId) {
                    this.where({ organizationId });
                }

                // Prevent updating organizationId
                const update = this.getUpdate();
                if (update.$set && update.$set.organizationId) {
                    delete update.$set.organizationId;
                }
                if (update.organizationId) {
                    delete update.organizationId;
                }
            }

            next();
        });
    });

    /**
     * Pre-delete hooks: Prevent cross-tenant deletes
     */
    const deleteHooks = [
        'deleteOne',
        'deleteMany',
        'findOneAndDelete',
        'remove'
    ];

    deleteHooks.forEach(hook => {
        schema.pre(hook, function (next) {
            const organizationId = this.getOptions().organizationId;

            if (organizationId) {
                if (!this.getQuery().organizationId) {
                    this.where({ organizationId });
                }
            }

            next();
        });
    });

    /**
     * Static method: Set organization context for queries
     */
    schema.statics.withOrganization = function (organizationId) {
        return this.setOptions({ organizationId });
    };

    /**
     * Static method: Bypass tenant scoping (admin only)
     */
    schema.statics.withoutTenantScope = function () {
        return this.setOptions({ skipTenantScope: true });
    };
}
