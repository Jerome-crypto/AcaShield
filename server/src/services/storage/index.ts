import { DatabaseStorageService } from "./database-storage.service";
import { IStorageService } from "./storage.interface";

export const storageService: IStorageService = new DatabaseStorageService();
export default storageService;
