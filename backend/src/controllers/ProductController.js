import { BaseController } from "../core/BaseController.js";
import { ProductService } from "../services/ProductService.js";

export class ProductController extends BaseController {
  constructor() {
    super(new ProductService());
  }

  index = this.catchAsync(async (req, res) => {
    const bypass =
      String(req.query.noCache || "")
        .trim()
        .toLowerCase() === "true";
    const cacheKey = bypass ? null : `products:index:${req.originalUrl}`;

    const result = await this.service.listProducts(req.query, cacheKey);
    res.set("X-Cache", result.cacheHit ? "HIT" : bypass ? "BYPASS" : "MISS");
    this.sendSuccess(res, result.data);
  });

  featured = this.catchAsync(async (req, res) => {
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10),
    );
    const data = await this.service.getFeaturedProducts(limit);
    this.sendSuccess(res, data);
  });

  search = this.catchAsync(async (req, res) => {
    const { q, page, limit, ...filters } = req.query;
    const result = await this.service.searchProducts(q, filters, page, limit);
    this.sendSuccess(res, result);
  });

  show = this.catchAsync(async (req, res) => {
    const data = await this.service.getProductBySlugOrId(req.params.slug, true);
    this.sendSuccess(res, data);
  });

  adminShow = this.catchAsync(async (req, res) => {
    const data = await this.service.getProductAdmin(req.params.id);
    this.sendSuccess(res, data);
  });

  store = this.catchAsync(async (req, res) => {
    const product = await this.service.storeProduct(req.body, req.files || []);
    this.logAction("Product Created", {
      productId: product._id,
      userId: this.getUserId(req),
    });
    this.sendCreated(res, product, "Product created successfully");
  });

  update = this.catchAsync(async (req, res) => {
    const product = await this.service.updateFullProduct(
      req.params.id,
      req.body,
      req.files || [],
    );
    this.logAction("Product Updated", {
      productId: req.params.id,
      userId: this.getUserId(req),
    });
    this.sendSuccess(res, product, 200, "Product updated successfully");
  });

  appendImages = this.catchAsync(async (req, res) => {
    const product = await this.service.appendImages(
      req.params.id,
      req.files || [],
    );
    this.logAction("Product Images Appended", {
      productId: req.params.id,
      userId: this.getUserId(req),
    });
    this.sendSuccess(res, product, 200, "Images uploaded successfully");
  });

  destroy = this.catchAsync(async (req, res) => {
    await this.service.deleteProduct(req.params.id);
    this.logAction("Product Deleted", {
      productId: req.params.id,
      userId: this.getUserId(req),
    });
    this.sendNoContent(res);
  });
}
