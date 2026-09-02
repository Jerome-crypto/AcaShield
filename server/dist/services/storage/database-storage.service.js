"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseStorageService = void 0;
const database_1 = __importDefault(require("../../config/database"));
const ApiError_1 = require("../../utils/ApiError");
class DatabaseStorageService {
    async uploadFile(documentId, fileData, mimeType) {
        try {
            await database_1.default.projectDocument.update({
                where: { id: documentId },
                data: {
                    fileData,
                },
            });
            return documentId;
        }
        catch (error) {
            throw new ApiError_1.ApiError(500, `Failed to store file in database: ${error.message}`);
        }
    }
    async getFile(documentId) {
        const doc = await database_1.default.projectDocument.findUnique({
            where: { id: documentId },
            select: { fileData: true, mimeType: true },
        });
        if (!doc || !doc.fileData) {
            throw new ApiError_1.ApiError(404, "File not found in database.");
        }
        return {
            data: doc.fileData,
            mimeType: doc.mimeType,
        };
    }
    async deleteFile(documentId) {
        try {
            await database_1.default.projectDocument.update({
                where: { id: documentId },
                data: {
                    fileData: Buffer.alloc(0), // Set to empty buffer or clear it
                },
            });
        }
        catch (error) {
            throw new ApiError_1.ApiError(500, `Failed to delete file in database: ${error.message}`);
        }
    }
}
exports.DatabaseStorageService = DatabaseStorageService;
