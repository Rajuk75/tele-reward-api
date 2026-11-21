import jwt from "jsonwebtoken";
import config from "../core/config.js";
import User from "../modules/users/user.model.js";
import { setNotAuthorized, setForbidden } from "../core/responseHelper.js";
import { hasPermission } from "./permission.js";
import logger from "../core/logger.js";

export const generateToken = (payload) => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN || "7d",
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, config.JWT_SECRET);
};

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return setNotAuthorized(res, "Not authorized, token missing");
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id || decoded.userId).select("-password");

    if (!user || user.isDeleted || !user.isActive) {
      return setNotAuthorized(res, "Account inactive or not found");
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error(`auth.middleware.js << protect << ${error.message}`);
    return setNotAuthorized(res, "Token invalid or expired");
  }
};

export const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    await protect(req, res, () => {
      if (requiredPermission && !hasPermission(req.user?.userType, requiredPermission)) {
        return setForbidden(res, "Insufficient permissions");
      }
      return next();
    });
  };
};

export default {
  protect,
  checkPermission,
  generateToken,
  verifyToken,
};
