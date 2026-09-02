"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsController = exports.SettingsController = void 0;
const database_1 = __importDefault(require("../../config/database"));
const ApiError_1 = require("../../utils/ApiError");
const DEFAULT_SETTINGS = [
    { key: "similarityThresholdLow", value: "20", description: "Low similarity limit (0-20%)" },
    { key: "similarityThresholdMedium", value: "40", description: "Medium similarity limit (21-40%)" },
    { key: "similarityThresholdHigh", value: "60", description: "High similarity limit (41-60%)" },
    { key: "institutionName", value: "University of Lagos", description: "Name of the academic institution" },
    { key: "institutionEmail", value: "info@unilag.edu.ng", description: "Institutional support email" },
    { key: "allowStudentReportView", value: "true", description: "Whether students can view similarity reports" },
    { key: "maxUploadSize", value: "20971520", description: "Maximum allowed file size in bytes (20MB)" },
    { key: "allowedFileTypes", value: "pdf,docx", description: "Comma-separated allowed file extensions" },
];
class SettingsController {
    async getSettings(req, res, next) {
        let settings = await database_1.default.systemSetting.findMany({ orderBy: { key: "asc" } });
        // Seed defaults if none exist
        if (settings.length === 0) {
            for (const s of DEFAULT_SETTINGS) {
                await database_1.default.systemSetting.create({ data: s });
            }
            settings = await database_1.default.systemSetting.findMany({ orderBy: { key: "asc" } });
        }
        // Return as a flat object for easy frontend consumption
        const settingsObj = settings.reduce((acc, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {});
        res.status(200).json({ settings: settingsObj, raw: settings });
    }
    async updateSettings(req, res, next) {
        const updates = req.body;
        if (!updates || typeof updates !== "object") {
            return next(new ApiError_1.ApiError(400, "Invalid settings payload. Expected a key-value object."));
        }
        const results = {};
        for (const [key, value] of Object.entries(updates)) {
            const updated = await database_1.default.systemSetting.upsert({
                where: { key },
                update: { value: String(value) },
                create: {
                    key,
                    value: String(value),
                    description: `Setting: ${key}`,
                },
            });
            results[key] = updated.value;
        }
        res.status(200).json({ message: "Settings updated successfully.", settings: results });
    }
}
exports.SettingsController = SettingsController;
exports.settingsController = new SettingsController();
exports.default = exports.settingsController;
