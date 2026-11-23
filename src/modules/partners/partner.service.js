import Partner from './partner.model.js';
import logger from '../../core/logger.js';

class PartnerService {

    // =========================================================================
    // GET ALL PARTNERS (For Dropdown & Management)
    // =========================================================================
    async getAllPartners({ search = '', status = 'active' } = {}) {
        try {
            const filter = {};
            if (status) filter.status = status;

            if (search) {
                const clean = search.trim();
                filter.$or = [
                    { name: { $regex: clean, $options: 'i' } },
                    { email: { $regex: clean, $options: 'i' } },
                    { phone: { $regex: clean, $options: 'i' } }
                ];
            }

            const partners = await Partner.find(filter)
                .sort({ name: 1 })
                .select('name email phone category channelOrPageUrl status createdAt')
                .lean();

            return { partners };
        } catch (error) {
            logger.error(`partner.service.js << getAllPartners << ${error.message}`);
            throw error;
        }
    }

    // =========================================================================
    // GET PARTNER BY ID
    // =========================================================================
    async getPartnerById(id) {
        try {
            return await Partner.findById(id).lean();
        } catch (error) {
            logger.error(`partner.service.js << getPartnerById << ${error.message}`);
            throw error;
        }
    }

    // =========================================================================
    // CREATE NEW PARTNER
    // =========================================================================
    async createPartner(data = {}) {
        try {
            const { name, email, phone, category = 'affiliate', channelOrPageUrl } = data;

            if (!name || !name.trim()) {
                throw new Error('Partner name is required');
            }

            if (!email || !email.trim()) {
                throw new Error('Partner email is required');
            }

            const cleanEmail = email.trim().toLowerCase();
            if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
                throw new Error('Invalid email format');
            }

            const existing = await Partner.findOne({ email: cleanEmail });
            if (existing) {
                throw new Error('Partner already registered with this email');
            }

            const partner = await Partner.create({
                name: name.trim(),
                email: cleanEmail,
                phone: phone?.trim() || null,
                category,
                channelOrPageUrl: channelOrPageUrl?.trim() || null
            });

            logger.info(`partner.service.js << createPartner << Registered partner: ${partner._id} (${partner.name})`);
            return partner;
        } catch (error) {
            logger.error(`partner.service.js << createPartner << ${error.message}`);
            throw error;
        }
    }

    // =========================================================================
    // UPDATE PARTNER
    // =========================================================================
    async updatePartner(id, updateData = {}) {
        try {
            const partner = await Partner.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            );
            if (!partner) throw new Error('Partner not found');
            return partner;
        } catch (error) {
            logger.error(`partner.service.js << updatePartner << ${error.message}`);
            throw error;
        }
    }
}

export default new PartnerService();
