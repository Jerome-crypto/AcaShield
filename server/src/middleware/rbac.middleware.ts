import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { Role } from "@prisma/client";

export const authorize = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden. You do not have permission to access this resource."));
    }

    next();
  };
};
