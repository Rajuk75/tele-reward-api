import referralRepo from './referral.repo.js';

export default async function resolveReferral(offerId, code, session = null) {
    if (code === undefined) return null;
    if (typeof code !== 'string' || !code.trim()) throw new Error('Invalid referral code');

    const referral = await referralRepo.findReferralByCode(code, offerId, session);
    if (!referral) throw new Error('Referral is invalid or inactive for this offer');

    return referral;
}
