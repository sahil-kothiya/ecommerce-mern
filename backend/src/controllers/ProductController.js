import { ProductService } from "../services/ProductService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const productService = new ProductService();

export class ProductController {
  index = asyncHandler(async (req, res) => {
    const bypass = String(req.query.noCache || "").trim().toLowerCase() === "true";
    const cacheKey = bypass ? null : `products:index:${req.originalUrl}`;

    const result = await productService.listProducts(req.query, cacheKey);
    res.set("X-Cache", result.cacheHit ? "HIT" : bypass ? "BYPASS" : "MISS");
    res.json(result);
  });

  featured = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const data = await productService.getFeaturedProducts(limit);
    res.json({ success: true, data });
  });

  search = asyncHandler(async (req, res) => {
    const { q, ...filters } = req.query;
    const result = await productService.searchProducts(q, filters);
    res.json({ success: true, data: result });
  });

  show = asyncHandler(async (req, res) => {
    const data = await productService.getProductBySlugOrId(req.params.slug, true);
    res.json({ success: true, data });
  });

  adminShow = asyncHandler(async (req, res) => {
    const data = await productService.getProductAdmin(req.params.id);
    res.json({ success: true, data });
  });

  store = asyncHandler(async (req, res) => {
    const product = await productService.storeProduct(req.body, req.files || []);
    res.status(201).json({ success: true, message: "Product created successfully", data: product });
  });

  update = asyncHandler(async (req, res) => {
    const product = await productService.updateFullProduct(req.params.id, req.body, req.files || []);
    res.json({ success: true, message: "Product updated successfully", data: product });
  });

  destroy = asyncHandler(async (req, res) => {
    await productService.deleteProduct(req.params.id);
    res.json({ success: true, message: "Product deleted successfully" });
  });
}

export const productController = new ProductController();
