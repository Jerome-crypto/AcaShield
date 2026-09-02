"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokens = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const generateTokens = (user) => {
    const accessToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, env_1.env.jwtSecret, { expiresIn: env_1.env.jwtExpiresIn });
    const refreshToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, env_1.env.jwtRefreshSecret, { expiresIn: env_1.env.jwtRefreshExpiresIn });
    return { accessToken, refreshToken };
};
exports.generateTokens = generateTokens;
