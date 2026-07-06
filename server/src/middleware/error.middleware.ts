import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let { statusCode, message, errors } = err;

  if (!(err instanceof ApiError)) {
    statusCode = err.statusCode || 500;
    message = err.message || "Internal Server Error";
    errors = [];
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(errors.length > 0 && { errors }),
    ...(env.nodeEnv === "development" && { stack: err.stack }),
  };

  if (env.nodeEnv === "development") {
    console.error(err);
  }

  res.status(statusCode).json(response);
};
