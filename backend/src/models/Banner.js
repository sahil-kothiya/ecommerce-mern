

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

bannerSchema.index({ status: 1, sortOrder: 1 });

bannerSchema.index({ status: 1, startDate: 1, endDate: 1 });

bannerSchema.index({ createdAt: -1, clickCount: -1, viewCount: -1 });
bannerSchema.index({ title: 1 });

bannerSchema.virtual('isActive').get(function () {
    if (this.status === 'inactive') return false;
    if (this.status === 'active') return true;
    
        if (this.status === 'scheduled') {
        const now = new Date();
        const isAfterStart = !this.startDate || now >= this.startDate;
        const isBeforeEnd = !this.endDate || now <= this.endDate;
        return isAfterStart && isBeforeEnd;
    }
    
    return false;
});

bannerSchema.virtual('ctr').get(function () {
    if (this.viewCount === 0) return 0;
    return ((this.clickCount / this.viewCount) * 100).toFixed(2);
});

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

bannerSchema.pre('save', function (next) {
        if (!this.slug && this.title) {
        this.slug = toSlug(this.title);
    }

        if (!this.linkType && this.link_type) {
        this.linkType = this.link_type;
    }

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

bannerSchema.methods.incrementViewCount = async function () {
    this.viewCount += 1;
    return this.save({ timestamps: false, validateBeforeSave: false });
};

bannerSchema.methods.incrementClickCount = async function () {
    this.clickCount += 1;
    return this.save({ timestamps: false, validateBeforeSave: false });
};

bannerSchema.methods.activate = async function () {
    this.status = 'active';
    return this.save();
};

bannerSchema.methods.deactivate = async function () {
    this.status = 'inactive';
    return this.save();
};

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

export const Banner = mongoose.model('Banner', bannerSchema);
