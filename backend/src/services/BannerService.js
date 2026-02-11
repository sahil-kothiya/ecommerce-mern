import { Banner } from '../models/Banner.js';
import { BaseService } from '../core/BaseService.js';
import { AppError } from '../middleware/errorHandler.js';

export class BannerService extends BaseService {
    constructor() {
        super(Banner);
    }

    async createBanner(bannerData) {
        if (bannerData.startDate && bannerData.endDate) {
            if (new Date(bannerData.startDate) >= new Date(bannerData.endDate)) {
                throw new AppError('End date must be after start date', 400);
            }
        }

        return await this.create(bannerData);
    }

    async updateBanner(id, updateData) {
        if (updateData.startDate && updateData.endDate) {
            if (new Date(updateData.startDate) >= new Date(updateData.endDate)) {
                throw new AppError('End date must be after start date', 400);
            }
        }

        return await this.update(id, updateData);
    }

    async getActiveBanners(position = null) {
        const now = new Date();
        const filter = {
            status: 'active',
            $or: [
                { startDate: { $lte: now }, endDate: { $gte: now } },
                { startDate: null, endDate: null }
            ]
        };

        if (position) {
            filter.position = position;
        }

        return await this.findAll({
            filter,
            sort: { displayOrder: 1, createdAt: -1 }
        });
    }

    async getBannersByPosition(position) {
        return await this.getActiveBanners(position);
    }

    async incrementClicks(id) {
        const banner = await this.findByIdOrFail(id);
        banner.clicks += 1;
        await banner.save();
        return banner;
    }
}
