"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentParserService = exports.DocumentParserService = void 0;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
const ApiError_1 = require("../utils/ApiError");
class DocumentParserService {
    /**
     * Extract plain text from a document buffer (PDF or DOCX)
     */
    async extractText(buffer, mimeType) {
        try {
            let rawText = "";
            if (mimeType === "application/pdf") {
                const data = await (0, pdf_parse_1.default)(buffer);
                rawText = data.text;
            }
            else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                mimeType === "application/msword") {
                const result = await mammoth_1.default.extractRawText({ buffer });
                rawText = result.value;
            }
            else {
                throw new ApiError_1.ApiError(400, `Unsupported MIME type for text extraction: ${mimeType}`);
            }
            // Normalize and clean up text
            return this.normalizeText(rawText);
        }
        catch (error) {
            console.error("Error during document parsing:", error);
            throw new ApiError_1.ApiError(500, `Failed to parse document: ${error.message}`);
        }
    }
    /**
     * Normalize text by removing extra spaces, newlines, and converting to a clean format
     */
    normalizeText(text) {
        if (!text)
            return "";
        return text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/\t/g, " ")
            .replace(/\n+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }
}
exports.DocumentParserService = DocumentParserService;
exports.documentParserService = new DocumentParserService();
exports.default = exports.documentParserService;
