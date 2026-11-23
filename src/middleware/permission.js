import { USER_TYPE_ADMIN, USER_TYPE_USER } from '../core/enums.js';

const ROLES = {
    [USER_TYPE_ADMIN]: [
        // ── User management ────────────────────────────────────────────────────
        'CREATE_ADMIN',
        'GET_ALL_USERS',
        'GET_USER_BY_ID',
        'UPDATE_USER',
        'DELETE_USER',
        'RESET_PASSWORD',
        'CHANGE_PASSWORD',
        'RESTORE_USER',
        'UPLOAD_USER_PROFILE_PHOTO',
        'UPDATE_USER_STATUS',
        'MANAGE_PAYMENT_METHODS',

        // ── Campaign management ────────────────────────────────────────────────
        'CREATE_CAMPAIGN',
        'GET_ALL_CAMPAIGNS',
        'UPDATE_CAMPAIGN',
        'DELETE_CAMPAIGN',

        // ── Offer management ──────────────────────────────────────────────────
        'CREATE_OFFER',
        'GET_ALL_OFFERS',
        'UPDATE_OFFER',
        'DELETE_OFFER',
        'TOGGLE_OFFER_STATUS',

        // ── Conversion / approval ─────────────────────────────────────────────
        'GET_CAMPAIGN_CONVERSIONS',
        'MANAGE_CONVERSIONS',
        'UPDATE_CONVERSION_STATUS',
        'APPROVE_CONVERSION',
        'REJECT_CONVERSION',

        // ── Dashboard & Postback logs ─────────────────────────────────────────
        'VIEW_DASHBOARD',
        'GET_POSTBACK_LOGS',

        // ── Referral management ───────────────────────────────────────────────
        'CREATE_REFERRAL',
        'GET_ALL_REFERRALS',
        'UPDATE_REFERRAL',
        'DELETE_REFERRAL',
    ],
    [USER_TYPE_USER]: [
        'UPDATE_USER',
        'GET_USER_BY_ID',
        'RESET_PASSWORD',
        'CHANGE_PASSWORD',
        'UPLOAD_USER_PROFILE_PHOTO',
    ],
};

export function hasPermission(userRole, permission) {
    if (!userRole) return false;
    const normalizedRole = String(userRole).toLowerCase();
    return ROLES[normalizedRole]?.includes(permission) || false;
}

export { ROLES };
export default { hasPermission, ROLES };
