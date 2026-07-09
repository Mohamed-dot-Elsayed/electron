import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UnauthorizedError } from "../Errors";
import { JwtUserPayload } from "../types/custom";

dotenv.config();

// ✅ Token خفيف - بدون permissions
export const generateToken = (payload: {
  _id: string;
  username: string;
  role: string;
  role_id:string | null;
  warehouse_id: string | null;
}) => {
  return jwt.sign(
    {
      id: payload._id.toString(),
      name: payload.username,
      role: payload.role,
      role_id: payload.role_id ? payload.role_id.toString() : null,
      warehouse_id: payload.warehouse_id
        ? payload.warehouse_id.toString()
        : null,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
};

export const verifyToken = (token: string): JwtUserPayload => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as jwt.JwtPayload;

    return {
      id: decoded.id as string,
      name: decoded.name as string,
      role: decoded.role as "superadmin" | "admin",
      role_id: decoded.role_id as string | null,
      warehouse_id: decoded.warehouse_id as string | null,
    };
  } catch {
    throw new UnauthorizedError("Invalid token");
  }
};