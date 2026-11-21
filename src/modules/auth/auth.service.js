import authRepo from "./auth.repo.js";
import { generateToken } from "../../middleware/auth.middleware.js";
import logger from "../../core/logger.js";

class AuthService {
    login = async (credentials) => {
        try {
            const { email, password } = credentials || {};

            if (!email || !password) {
                throw new Error("Please provide email and password");
            }

            // Decode password if base64 encoded by panel (btoa)
            let decodedPassword = password;
            try {
                const decoded = Buffer.from(password, 'base64').toString('utf8');
                if (decoded && decoded !== password && !password.includes(' ')) {
                    decodedPassword = decoded;
                }
            } catch (e) {
                decodedPassword = password;
            }

            const user = await authRepo.findUserByEmailWithPassword(email);
            if (!user) {
                const err = new Error("Invalid email or password");
                err.statusCode = 401;
                throw err;
            }

            let isMatch = await user.comparePassword(decodedPassword);
            if (!isMatch && decodedPassword !== password) {
                isMatch = await user.comparePassword(password);
            }

            if (!isMatch) {
                const err = new Error("Invalid email or password");
                err.statusCode = 401;
                throw err;
            }

            if (!user.isActive || user.isDeleted) {
                const err = new Error("Account is disabled or deleted");
                err.statusCode = 403;
                throw err;
            }

            await authRepo.updateLastLogin(user._id);

            const token = generateToken({ id: user._id, role: user.userType });
            const { password: _, ...userObj } = user.toObject();
            return { token, user: userObj };
        } catch (error) {
            logger.error(`auth.service.js << login() << ${error.message}`);
            throw error;
        }
    };
}

export default new AuthService();
