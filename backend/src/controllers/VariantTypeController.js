import { variantTypeService } from "../services/VariantTypeService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class VariantTypeController {
  index = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
    const search = String(req.query.search || "").trim();
    const status = req.query.status;

    const result = await variantTypeService.list({
      page,
      limit,
      search,
      status,
    });
    res.json({ success: true, data: result });
  });

  listActive = asyncHandler(async (req, res) => {
    const items = await variantTypeService.listActive();
    res.json({ success: true, data: items });
  });

  show = asyncHandler(async (req, res) => {
    const data = await variantTypeService.getById(req.params.id);
    res.json({ success: true, data });
  });

  create = asyncHandler(async (req, res) => {
    const item = await variantTypeService.createVariantType(req.body);
    res
      .status(201)
      .json({
        success: true,
        message: "Variant type created successfully",
        data: item,
      });
  });

  update = asyncHandler(async (req, res) => {
    const item = await variantTypeService.updateVariantType(
      req.params.id,
      req.body,
    );
    res.json({
      success: true,
      message: "Variant type updated successfully",
      data: item,
    });
  });

  destroy = asyncHandler(async (req, res) => {
    await variantTypeService.deleteVariantType(req.params.id);
    res.json({ success: true, message: "Variant type deleted successfully" });
  });
}

export const variantTypeController = new VariantTypeController();
