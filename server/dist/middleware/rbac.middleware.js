"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const ApiError_1 = require("../utils/ApiError");
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError_1.ApiError(401, "Authentication required."));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new ApiError_1.ApiError(403, "Forbidden. You do not have permission to access this resource."));
        }
        next();
    };
};
exports.authorize = authorize;
