import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const generateTokens = (user: { id: string; role: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as any }
  );

  const refreshToken = jwt.sign(
    { id: user.id, role: user.role },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn as any }
  );

  return { accessToken, refreshToken };
};
