import { CategoryService } from "../services/CategoryService.js";
import { asyncHandler, ApiResponse } from "../middleware/errorHandler.js";

const service = new CategoryService();

export class CategoryController {
  index = asyncHandler(async (req, res) => {
    const result = await service.listCategories(req.query);
    res.set("X-Cache", result.cacheHit ? "HIT" : "MISS");
    res.json({ success: true, data: result.data });
  });

  tree = asyncHandler(async (req, res) => {
    const data = await service.getCategoryTree(req.query.maxDepth);
    ApiResponse.success(res, data);
  });

  flat = asyncHandler(async (req, res) => {
    const data = await service.getFlatCategories();
    ApiResponse.success(res, data);
  });

  filters = asyncHandler(async (req, res) => {
    const data = await service.getFilters();
    ApiResponse.success(res, data);
  });

  navigation = asyncHandler(async (req, res) => {
    const data = await service.getNavigationCategories(req.query.maxLevels);
    ApiResponse.success(res, data);
  });

  show = asyncHandler(async (req, res) => {
    const data = await service.getCategoryById(req.params.id, req.query.includeChildren);
    ApiResponse.success(res, data);
  });

  showBySlug = asyncHandler(async (req, res) => {
    const data = await service.getCategoryBySlug(req.params.slug, req.query.includeChildren);
    ApiResponse.success(res, data);
  });

  breadcrumb = asyncHandler(async (req, res) => {
    const data = await service.getBreadcrumb(req.params.id);
    ApiResponse.success(res, data);
  });

  products = asyncHandler(async (req, res) => {
    const { page, limit, sort } = req.query;
    const data = await service.getCategoryProducts(req.params.id, { page: Number(page) || 1, limit: Number(limit) || 20, sort });
    ApiResponse.success(res, data);
  });

  brands = asyncHandler(async (req, res) => {
    const data = await service.getCategoryBrands(req.params.id);
    ApiResponse.success(res, data);
  });

  store = asyncHandler(async (req, res) => {
    const category = await service.createCategory(req.body, req.file, req.user?._id);
    ApiResponse.created(res, category, "Category created successfully");
  });

  update = asyncHandler(async (req, res) => {
    const category = await service.updateCategory(req.params.id, req.body, req.file);
    ApiResponse.success(res, category, "Category updated successfully");
  });

  destroy = asyncHandler(async (req, res) => {
    await service.deleteCategory(req.params.id);
    ApiResponse.success(res, null, "Category deleted successfully");
  });

  bulkReorder = asyncHandler(async (req, res) => {
    await service.bulkReorder(req.body.updates);
    ApiResponse.success(res, null, "Categories reordered successfully");
  });
}

export const categoryController = new CategoryController();
