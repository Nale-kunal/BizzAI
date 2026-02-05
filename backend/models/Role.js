import mongoose from 'mongoose';

/**
 * Role - RBAC role definition
 */
const roleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        displayName: {
            type: String,
            required: true
        },

        description: String,

        // Permissions array
        permissions: [{
            type: String,
            required: true
        }],

        // System roles cannot be deleted
        isSystem: {
            type: Boolean,
            default: false
        },

        // Organization-specific role
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization'
        },

        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
        }
    },
    { timestamps: true }
);

// Indexes
roleSchema.index({ name: 1, organization: 1 }, { unique: true });
roleSchema.index({ organization: 1 });

const Role = mongoose.model('Role', roleSchema);

export default Role;
