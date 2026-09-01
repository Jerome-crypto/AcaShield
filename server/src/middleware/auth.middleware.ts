import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";
import { Role } from "@prisma/client";

interface DecodedToken {
  id: string;
  role: Role;
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query.token && typeof req.query.token === "string") {
      token = req.query.token;
    }

    if (!token) {
      throw new ApiError(401, "Authentication required. Please provide a Bearer token.");
    }

    const decoded = jwt.verify(token, env.jwtSecret) as DecodedToken;
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError(401, "Token expired. Please refresh your session."));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(401, "Invalid authentication token."));
    }
    next(error);
  }
};
