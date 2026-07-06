export interface IStorageService {
  uploadFile(fileKey: string, fileData: Buffer, mimeType: string): Promise<string>;
  getFile(fileKey: string): Promise<{ data: Buffer; mimeType: string }>;
  deleteFile(fileKey: string): Promise<void>;
}
