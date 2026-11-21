import User from "./user.model.js";
import logger from "../../core/logger.js";

class UserRepository {
    async findByEmail(email) {
        try {
            return await User.findOne({ email: email.toLowerCase().trim() });
        } catch (error) {
            logger.error(`user.repo.js << findByEmail() << ${error.message}`);
            throw error;
        }
    }

    async createUser(userData) {
        try {
            return await User.create(userData);
        } catch (error) {
            logger.error(`user.repo.js << createUser() << ${error.message}`);
            throw error;
        }
    }

    async findUsers(filter = {}, { skip = 0, limit = 15, sort = { createdAt: -1 } } = {}) {
        try {
            return await User.find(filter)
                .select("-password")
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean();
        } catch (error) {
            logger.error(`user.repo.js << findUsers() << ${error.message}`);
            throw error;
        }
    }

    async countUsers(filter = {}) {
        try {
            return await User.countDocuments(filter);
        } catch (error) {
            logger.error(`user.repo.js << countUsers() << ${error.message}`);
            throw error;
        }
    }

    async searchUsers(query = '', limit = 20) {
        try {
            const filter = { isDeleted: false };
            if (query && query.trim()) {
                const regex = new RegExp(query.trim(), 'i');
                filter.$or = [
                    { name: regex },
                    { email: regex },
                    { phone: regex }
                ];
            }
            return await User.find(filter)
                .select("-password")
                .limit(limit)
                .lean();
        } catch (error) {
            logger.error(`user.repo.js << searchUsers() << ${error.message}`);
            throw error;
        }
    }

    async updateById(id, updateData) {
        try {
            return await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password");
        } catch (error) {
            logger.error(`user.repo.js << updateById() << ${error.message}`);
            throw error;
        }
    }
}

export default new UserRepository();
