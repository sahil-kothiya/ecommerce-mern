import { settingService } from "../services/SettingService.js";
import { AppError } from "../middleware/errorHandler.js";
import { deleteUploadedFile } from "../middleware/uploadEnhanced.js";
import { emailService } from "../utils/emailService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

class SettingController {
  index = asyncHandler(async (req, res) => {
    const settings = await settingService.getAllSettings();
    res.json({ success: true, data: settings });
  });

  publicSettings = asyncHandler(async (req, res) => {
    const data = await settingService.getPublicSettings();
    res.json({ success: true, data });
  });

  update = asyncHandler(async (req, res) => {
    const userId = req.user?._id || null;
    const { settings, oldLogo, oldFavicon } =
      await settingService.updateSettings(req.body || {}, req.files, userId);

    if (oldLogo && oldLogo !== settings.logo) await deleteUploadedFile(oldLogo);
    if (oldFavicon && oldFavicon !== settings.favicon)
      await deleteUploadedFile(oldFavicon);

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: settings,
    });
  });

  testEmail = asyncHandler(async (req, res) => {
    const { to } = req.body;
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to).trim())) {
      throw new AppError("A valid recipient email address is required", 400);
    }
    await emailService.sendTestEmail(String(to).trim());
    res.json({ success: true, message: `Test email sent to ${to}` });
  });
}

export const settingController = new SettingController();
