"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
const database_storage_service_1 = require("./database-storage.service");
exports.storageService = new database_storage_service_1.DatabaseStorageService();
exports.default = exports.storageService;
