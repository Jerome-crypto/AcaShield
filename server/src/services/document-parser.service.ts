import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { ApiError } from "../utils/ApiError";

export class DocumentParserService {
  /**
   * Extract plain text from a document buffer (PDF or DOCX)
   */
  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      let rawText = "";

      if (mimeType === "application/pdf") {
        const data = await pdfParse(buffer);
        rawText = data.text;
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
      ) {
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value;
      } else {
        throw new ApiError(400, `Unsupported MIME type for text extraction: ${mimeType}`);
      }

      // Normalize and clean up text
      return this.normalizeText(rawText);
    } catch (error: any) {
      console.error("Error during document parsing:", error);
      throw new ApiError(500, `Failed to parse document: ${error.message}`);
    }
  }

  /**
   * Normalize text by removing extra spaces, newlines, and converting to a clean format
   */
  private normalizeText(text: string): string {
    if (!text) return "";
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}

export const documentParserService = new DocumentParserService();
export default documentParserService;
