import { IStorageService } from "./storage.interface";
import prisma from "../../config/database";
import { ApiError } from "../../utils/ApiError";

export class DatabaseStorageService implements IStorageService {
  async uploadFile(documentId: string, fileData: Buffer, mimeType: string): Promise<string> {
    try {
      await prisma.projectDocument.update({
        where: { id: documentId },
        data: {
          fileData,
        },
      });
      return documentId;
    } catch (error: any) {
      throw new ApiError(500, `Failed to store file in database: ${error.message}`);
    }
  }

  async getFile(documentId: string): Promise<{ data: Buffer; mimeType: string }> {
    const doc = await prisma.projectDocument.findUnique({
      where: { id: documentId },
      select: { fileData: true, mimeType: true },
    });

    if (!doc || !doc.fileData) {
      throw new ApiError(404, "File not found in database.");
    }

    return {
      data: doc.fileData,
      mimeType: doc.mimeType,
    };
  }

  async deleteFile(documentId: string): Promise<void> {
    try {
      await prisma.projectDocument.update({
        where: { id: documentId },
        data: {
          fileData: Buffer.alloc(0), // Set to empty buffer or clear it
        },
      });
    } catch (error: any) {
      throw new ApiError(500, `Failed to delete file in database: ${error.message}`);
    }
  }
}
