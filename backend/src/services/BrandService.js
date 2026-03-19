import { Brand } from "../models/Brand.js";
import { Product } from "../models/Product.js";
import { BaseService } from "../core/BaseService.js";
import { AppError } from "../utils/AppError.js";
import slugify from "slugify";
import { BrandRepository } from "../repositories/index.js";

export class BrandService extends BaseService {
  constructor(repository = new BrandRepository()) {
    super();
    this.repository = repository;
  }

  async createBrand(brandData) {
    const existingBrand = await this.repository.model
      .findOne({
        title: brandData.title,
      })
      .lean();

    if (existingBrand) {
      throw new AppError(
        `Brand with title "${brandData.title}" already exists`,
        400,
      );
    }

    return await this.create(brandData);
  }

  async updateBrand(id, updateData) {
    const brand = await this.findByIdOrFail(id);

    if (updateData.title && updateData.title !== brand.title) {
      updateData.slug = slugify(updateData.title, {
        lower: true,
        strict: true,
      });

      const existingBrand = await this.repository.model
        .findOne({
          slug: updateData.slug,
          _id: { $ne: id },
        })
        .lean();

      if (existingBrand) {
        updateData.slug = `${updateData.slug}-${Date.now()}`;
      }
    }

    const updatedBrand = await this.update(id, updateData);

    if (updateData.title || updateData.slug) {
      await Product.updateBrandInfo(id, {
        title: updatedBrand.title,
        slug: updatedBrand.slug,
      });
    }

    return updatedBrand;
  }

  async deleteBrand(id) {
    const hasProducts = await Product.exists({ "brand.id": id });

    if (hasProducts) {
      throw new AppError(
        "Cannot delete brand. Products are using this brand.",
        400,
      );
    }

    return await this.delete(id);
  }

  async getBrandWithStats(id) {
    const brand = await this.findByIdOrFail(id);
    const productCount = await Product.countDocuments({
      "brand.id": id,
      status: "active",
    });

    return {
      ...brand.toObject(),
      productCount,
    };
  }

  async getActiveBrands(options = {}) {
    return await this.findAll({
      ...options,
      filter: { status: "active", ...options.filter },
    });
  }
}
