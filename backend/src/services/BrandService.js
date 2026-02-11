import { Brand } from '../models/Brand.js';
import { Product } from '../models/Product.js';
import { BaseService } from '../core/BaseService.js';
import { AppError } from '../middleware/errorHandler.js';

export class BrandService extends BaseService {
    constructor() {
        super(Brand);
    }

    async createBrand(brandData) {
        const existingBrand = await this.model.findOne({ 
            slug: brandData.slug 
        }).lean();

        if (existingBrand) {
            throw new AppError('Brand with this slug already exists', 400);
        }

        return await this.create(brandData);
    }

    async updateBrand(id, updateData) {
        const brand = await this.findByIdOrFail(id);

        if (updateData.slug && updateData.slug !== brand.slug) {
            const existingBrand = await this.model.findOne({ 
                slug: updateData.slug,
                _id: { $ne: id }
            }).lean();

            if (existingBrand) {
                throw new AppError('Brand with this slug already exists', 400);
            }
        }

        // Update brand
        const updatedBrand = await this.update(id, updateData);

        // Update denormalized brand data in products if name or logo changed
        if (updateData.name || updateData.logo) {
            await Product.updateMany(
                { 'brand._id': id },
                { 
                    $set: { 
                        'brand.name': updatedBrand.name,
                        'brand.logo': updatedBrand.logo,
                        'brand.slug': updatedBrand.slug
                    } 
                }
            );
        }

        return updatedBrand;
    }

    async deleteBrand(id) {
        const productCount = await Product.countDocuments({ 'brand._id': id });

        if (productCount > 0) {
            throw new AppError(
                `Cannot delete brand. ${productCount} products are using this brand.`,
                400
            );
        }

        return await this.delete(id);
    }

    async getBrandWithStats(id) {
        const brand = await this.findByIdOrFail(id);
        const productCount = await Product.countDocuments({ 
            'brand._id': id,
            status: 'active'
        });

        return {
            ...brand.toObject(),
            productCount
        };
    }

    async getActiveBrands(options = {}) {
        return await this.findAll({
            ...options,
            filter: { status: 'active', ...options.filter }
        });
    }
}
