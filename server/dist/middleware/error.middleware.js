"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const ApiError_1 = require("../utils/ApiError");
const env_1 = require("../config/env");
const errorHandler = (err, req, res, next) => {
    let { statusCode, message, errors } = err;
    if (!(err instanceof ApiError_1.ApiError)) {
        statusCode = err.statusCode || 500;
        message = err.message || "Internal Server Error";
        errors = [];
    }
    res.locals.errorMessage = err.message;
    const response = {
        code: statusCode,
        message,
        ...(errors.length > 0 && { errors }),
        ...(env_1.env.nodeEnv === "development" && { stack: err.stack }),
    };
    if (env_1.env.nodeEnv === "development") {
        console.error(err);
    }
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
