import userRepo from "./user.repo.js";
import { USER_TYPE_ADMIN } from "../../core/enums.js";
import logger from "../../core/logger.js";

class UserService {
    async createAdmin(data) {
        try {
            const { name, email, password, phone } = data || {};
            if (!email || !password || !name) {
                throw new Error("Name, email and password are required");
            }

            const existing = await userRepo.findByEmail(email);
            if (existing) {
                throw new Error("User with this email already exists");
            }

            const admin = await userRepo.createUser({
                name,
                email: email.toLowerCase().trim(),
                password,
                phone: phone || null,
                userType: USER_TYPE_ADMIN
            });

            const { password: _, ...userObj } = admin.toObject();
            return userObj;
        } catch (error) {
            logger.error(`user.service.js << createAdmin() << ${error.message}`);
            throw error;
        }
    }

    async getAllUsers(queryParams = {}) {
        try {
            const {
                page = 1,
                limit = 15,
                search,
                userType,
                isActive,
                isDeleted,
                userId
            } = queryParams;

            const filter = {};

            if (userId) {
                filter._id = userId;
            }

            if (isDeleted !== undefined) {
                filter.isDeleted = String(isDeleted) === 'true';
            } else {
                filter.isDeleted = false;
            }

            if (isActive !== undefined) {
                filter.isActive = String(isActive) === 'true';
            }

            if (userType && userType !== 'all') {
                filter.userType = userType.toLowerCase();
            }

            if (search && search.trim()) {
                const regex = new RegExp(search.trim(), 'i');
                filter.$or = [
                    { name: regex },
                    { email: regex },
                    { phone: regex }
                ];
            }

            const skip = (Number(page) - 1) * Number(limit);

            const [total, users] = await Promise.all([
                userRepo.countUsers(filter),
                userRepo.findUsers(filter, { skip, limit: Number(limit) })
            ]);

            return {
                users,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)) || 1
                }
            };
        } catch (error) {
            logger.error(`user.service.js << getAllUsers() << ${error.message}`);
            throw error;
        }
    }

    async searchUsers(query = '') {
        try {
            return await userRepo.searchUsers(query, 20);
        } catch (error) {
            logger.error(`user.service.js << searchUsers() << ${error.message}`);
            throw error;
        }
    }

    async deleteUser(id) {
        try {
            const deleted = await userRepo.updateById(id, { isDeleted: true });
            if (!deleted) {
                throw new Error("User not found");
            }
            return deleted;
        } catch (error) {
            logger.error(`user.service.js << deleteUser() << ${error.message}`);
            throw error;
        }
    }
}

export default new UserService();
