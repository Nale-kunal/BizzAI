import mongoose from 'mongoose';

/**
 * Organization - Multi-tenant support
 * Root entity for tenant isolation
 */
const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        subdomain: {
            type: String,
            unique: true,
            sparse: true,
            lowercase: true,
            trim: true
        },

        // Subscription management
        subscription: {
            plan: {
                type: String,
                enum: ['free', 'basic', 'professional', 'enterprise'],
                default: 'free'
            },
            status: {
                type: String,
                enum: ['active', 'trial', 'suspended', 'cancelled'],
                default: 'trial'
            },
            startDate: {
                type: Date,
                default: Date.now
            },
            expiresAt: Date,
            features: {
                maxUsers: { type: Number, default: 5 },
                maxBranches: { type: Number, default: 1 },
                maxWarehouses: { type: Number, default: 1 },
                advancedReporting: { type: Boolean, default: false },
                apiAccess: { type: Boolean, default: false }
            }
        },

        // Organization settings
        settings: {
            currency: { type: String, default: 'INR' },
            timezone: { type: String, default: 'Asia/Kolkata' },
            dateFormat: { type: String, default: 'DD/MM/YYYY' },
            fiscalYearStart: { type: Number, default: 4 }, // April
            gstEnabled: { type: Boolean, default: true },
            multiWarehouse: { type: Boolean, default: false },
            multiBranch: { type: Boolean, default: false }
        },

        // Contact information
        contactInfo: {
            email: String,
            phone: String,
            address: String,
            city: String,
            state: String,
            country: { type: String, default: 'India' },
            pincode: String
        },

        // Business details
        businessInfo: {
            gstNumber: String,
            panNumber: String,
            registrationType: {
                type: String,
                enum: ['proprietorship', 'partnership', 'llp', 'private_limited', 'public_limited', 'other']
            },
            industry: String
        },

        // Status management
        status: {
            type: String,
            enum: ['active', 'inactive', 'suspended'],
            default: 'active'
        },

        // Audit fields
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    { timestamps: true }
);

// Indexes
organizationSchema.index({ subdomain: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ 'subscription.status': 1 });

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
