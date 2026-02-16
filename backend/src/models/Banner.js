/**
 * @fileoverview Banner Model
 * @description Mongoose schema for managing promotional banners and advertisements
 * @module models/Banner
 * @requires mongoose
 * @author Enterprise E-Commerce Team
 * @version 1.0.0
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const toSlug = (value = '') =>
    value
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

/**
 * Banner Schema Definition
 * @description Defines the structure for promotional banners
 * @property {string} title - Banner title (required, max 200 characters)
 * @property {string} description - Optional banner description (max 500 characters)
 * @property {string} image - Image path/URL (required)
 * @property {string} link - URL to navigate when banner is clicked
 * @property {string} linkTarget - Link target (_blank or _self)
 * @property {number} sortOrder - Display order (lower numbers appear first)
 * @property {string} status - Banner status (active, inactive, scheduled)
 * @property {Date} startDate - Banner start date for scheduled banners
 * @property {Date} endDate - Banner end date for scheduled banners
 * @property {number} clickCount - Number of times banner was clicked
 * @property {number} viewCount - Number of times banner was viewed
 * @property {Object} metadata - Additional custom data
 */
const bannerSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, 'Banner title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        slug: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,
            sparse: true,
            index: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [5000, 'Description cannot exceed 5000 characters'],
        },
        image: {
            type: String,
            trim: true,
            default: null,
        },
        link: {
            type: String,
            trim: true,
            maxlength: [1000, 'Link cannot exceed 1000 characters'],
        },
        linkType: {
            type: String,
            trim: true,
            default: null,
            maxlength: [50, 'Link type cannot exceed 50 characters'],
        },
        linkTarget: {
            type: String,
            enum: ['_blank', '_self'],
            default: '_self',
        },
        sortOrder: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'scheduled'],
            default: 'inactive',
        },
        startDate: {
            type: Date,
            default: null,
        },
        endDate: {
            type: Date,
            default: null,
        },
        clickCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        viewCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
        discountIds: [{
            type: Schema.Types.ObjectId,
            ref: 'Discount',
        }],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ===========================
// Indexes for Performance
// ===========================

/**
 * Compound index for fetching active banners by status and order
 */
bannerSchema.index({ status: 1, sortOrder: 1 });

/**
 * Index for scheduled banner queries
 * Used by cron jobs to activate/deactivate scheduled banners
 */
bannerSchema.index({ status: 1, startDate: 1, endDate: 1 });

/**
 * Index for analytics queries
 */
bannerSchema.index({ createdAt: -1, clickCount: -1, viewCount: -1 });
bannerSchema.index({ title: 1 });

// ===========================
// Virtual Properties
// ===========================

/**
 * Check if banner is currently active based on schedule
 * @returns {boolean} True if banner should be displayed
 */
bannerSchema.virtual('isActive').get(function () {
    if (this.status === 'inactive') return false;
    if (this.status === 'active') return true;
    
    // For scheduled banners
    if (this.status === 'scheduled') {
        const now = new Date();
        const isAfterStart = !this.startDate || now >= this.startDate;
        const isBeforeEnd = !this.endDate || now <= this.endDate;
        return isAfterStart && isBeforeEnd;
    }
    
    return false;
});

/**
 * Calculate click-through rate (CTR)
 * @returns {number} CTR percentage
 */
bannerSchema.virtual('ctr').get(function () {
    if (this.viewCount === 0) return 0;
    return ((this.clickCount / this.viewCount) * 100).toFixed(2);
});

/**
 * Laravel compatibility virtuals
 * photo <-> image, link_type <-> linkType, discounts <-> discountIds
 */
bannerSchema.virtual('photo')
    .get(function () {
        return this.image;
    })
    .set(function (value) {
        this.image = value;
    });

bannerSchema.virtual('link_type')
    .get(function () {
        return this.linkType;
    })
    .set(function (value) {
        this.linkType = value;
    });

bannerSchema.virtual('discounts')
    .get(function () {
        return this.discountIds;
    })
    .set(function (value) {
        this.discountIds = value;
    });

// ===========================
// Pre-save Hooks
// ===========================

/**
 * Validate date ranges before saving
 */
bannerSchema.pre('save', function (next) {
    // Keep slug generated and stable when title changes unless slug is manually provided.
    if (!this.slug && this.title) {
        this.slug = toSlug(this.title);
    }

    // Legacy compatibility: if only link_type is set through raw update payload.
    if (!this.linkType && this.link_type) {
        this.linkType = this.link_type;
    }

    // Validate scheduled banner dates
    if (this.status === 'scheduled') {
        if (!this.startDate && !this.endDate) {
            return next(new Error('Scheduled banners must have start or end date'));
        }
        
        if (this.startDate && this.endDate && this.startDate >= this.endDate) {
            return next(new Error('End date must be after start date'));
        }
    }
    
    next();
});

bannerSchema.pre('validate', function (next) {
    if (!this.slug && this.title) {
        this.slug = toSlug(this.title);
    }
    next();
});

// ===========================
// Instance Methods
// ===========================

/**
 * Increment view count
 * @description Updates view count without triggering full validation
 * @returns {Promise<Banner>} Updated banner
 */
bannerSchema.methods.incrementViewCount = async function () {
    this.viewCount += 1;
    return this.save({ timestamps: false, validateBeforeSave: false });
};

/**
 * Increment click count
 * @description Updates click count without triggering full validation
 * @returns {Promise<Banner>} Updated banner
 */
bannerSchema.methods.incrementClickCount = async function () {
    this.clickCount += 1;
    return this.save({ timestamps: false, validateBeforeSave: false });
};

/**
 * Activate banner
 * @description Sets banner status to active
 * @returns {Promise<Banner>} Updated banner
 */
bannerSchema.methods.activate = async function () {
    this.status = 'active';
    return this.save();
};

/**
 * Deactivate banner
 * @description Sets banner status to inactive
 * @returns {Promise<Banner>} Updated banner
 */
bannerSchema.methods.deactivate = async function () {
    this.status = 'inactive';
    return this.save();
};

// ===========================
// Static Methods
// ===========================

/**
 * Get active banners
 * @param {number} [limit] - Optional limit
 * @returns {Promise<Array<Banner>>} Array of active banners
 */
bannerSchema.statics.getActiveBanners = async function (limit = null) {
    const now = new Date();
    
    const query = {
        $or: [
            { status: 'active' },
            {
                status: 'scheduled',
                $or: [
                    { startDate: null, endDate: { $gte: now } },
                    { startDate: { $lte: now }, endDate: null },
                    { startDate: { $lte: now }, endDate: { $gte: now } },
                ],
            },
        ]
    };
    
    let queryBuilder = this.find(query).sort({ sortOrder: 1, createdAt: -1 });
    
    if (limit) {
        queryBuilder = queryBuilder.limit(limit);
    }
    
    return queryBuilder.lean();
};

/**
 * Get banner analytics
 * @param {Date} startDate - Start date for analytics
 * @param {Date} endDate - End date for analytics
 * @returns {Promise<Object>} Analytics data
 */
bannerSchema.statics.getAnalytics = async function (startDate, endDate) {
    const query = {
        createdAt: {
            $gte: startDate,
            $lte: endDate,
        },
    };
    
    const banners = await this.find(query).lean();
    
    const totalClicks = banners.reduce((sum, b) => sum + b.clickCount, 0);
    const totalViews = banners.reduce((sum, b) => sum + b.viewCount, 0);
    const avgCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : 0;
    
    return {
        totalBanners: banners.length,
        totalClicks,
        totalViews,
        avgCtr,
        topPerformers: banners
            .sort((a, b) => b.clickCount - a.clickCount)
            .slice(0, 5)
            .map((b) => ({
                id: b._id,
                title: b.title,
                clicks: b.clickCount,
                views: b.viewCount,
                ctr: b.viewCount > 0 ? ((b.clickCount / b.viewCount) * 100).toFixed(2) : 0,
            })),
    };
};

/**
 * Activate scheduled banners
 * @description Cron job helper to activate banners based on schedule
 * @returns {Promise<Object>} Result of activation
 */
bannerSchema.statics.activateScheduled = async function () {
    const now = new Date();
    
    const result = await this.updateMany(
        {
            status: 'scheduled',
            startDate: { $lte: now },
            $or: [{ endDate: null }, { endDate: { $gte: now } }],
        },
        { $set: { status: 'active' } }
    );
    
    return result;
};

/**
 * Deactivate expired banners
 * @description Cron job helper to deactivate expired scheduled banners
 * @returns {Promise<Object>} Result of deactivation
 */
bannerSchema.statics.deactivateExpired = async function () {
    const now = new Date();
    
    const result = await this.updateMany(
        {
            status: { $in: ['active', 'scheduled'] },
            endDate: { $lt: now },
        },
        { $set: { status: 'inactive' } }
    );
    
    return result;
};

/**
 * Export Banner Model
 */
export const Banner = mongoose.model('Banner', bannerSchema);
