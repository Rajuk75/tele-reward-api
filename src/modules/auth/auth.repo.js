import User from "../users/user.model.js";

class AuthRepository {
    findUserByEmailWithPassword = async (email) => {
        return await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    };

    updateLastLogin = async (userId) => {
        return await User.findByIdAndUpdate(userId, { lastLogin: new Date() }, { new: true });
    };
}

export default new AuthRepository();
