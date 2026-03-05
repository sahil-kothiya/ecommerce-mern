import { variantOptionService } from "../services/VariantOptionService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class VariantOptionController {
  index = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
    const search = String(req.query.search || "").trim();
    const status = req.query.status;
    const variantTypeId = String(
      req.query.variantTypeId || req.query.variantType || "",
    ).trim();

    const result = await variantOptionService.list({
      page,
      limit,
      search,
      status,
      variantTypeId,
    });
    res.json({ success: true, data: result });
  });

  show = asyncHandler(async (req, res) => {
    const data = await variantOptionService.getById(req.params.id);
    res.json({ success: true, data });
  });

  create = asyncHandler(async (req, res) => {
    const item = await variantOptionService.createOption(req.body);
    res
      .status(201)
      .json({
        success: true,
        message: "Variant option created successfully",
        data: item,
      });
  });

  update = asyncHandler(async (req, res) => {
    const item = await variantOptionService.updateOption(
      req.params.id,
      req.body,
    );
    res.json({
      success: true,
      message: "Variant option updated successfully",
      data: item,
    });
  });

  destroy = asyncHandler(async (req, res) => {
    await variantOptionService.deleteOption(req.params.id);
    res.json({ success: true, message: "Variant option deleted successfully" });
  });
}

export const variantOptionController = new VariantOptionController();
