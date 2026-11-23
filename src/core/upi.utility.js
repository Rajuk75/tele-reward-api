/**
 * upi.utility.js — UPI ID (VPA) Validator & Bank/App Auto-Detector
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates syntax, blocks email address typos (@gmail, @yahoo, etc.),
 * and detects the UPI Application & Associated Sponsor Bank from NPCI master handles.
 */

// Common email domains to prevent users from entering email IDs by mistake
const EMAIL_DOMAINS = new Set([
    'gmail.com',
    'yahoo.com',
    'yahoo.co.in',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'proton.me',
    'zoho.com',
    'rediffmail.com'
]);

// NPCI Master UPI Handles Mapping: handle -> { app, bank }
const UPI_HANDLES = {
    // Google Pay
    'okaxis':       { app: 'Google Pay', bank: 'Axis Bank' },
    'okhdfcbank':   { app: 'Google Pay', bank: 'HDFC Bank' },
    'okicici':      { app: 'Google Pay', bank: 'ICICI Bank' },
    'oksbi':        { app: 'Google Pay', bank: 'State Bank of India' },

    // PhonePe
    'ybl':          { app: 'PhonePe', bank: 'Yes Bank' },
    'ibl':          { app: 'PhonePe', bank: 'ICICI Bank' },
    'axl':          { app: 'PhonePe', bank: 'Axis Bank' },

    // Paytm
    'paytm':        { app: 'Paytm', bank: 'Paytm Payments Bank' },
    'ptyes':        { app: 'Paytm', bank: 'Yes Bank' },
    'pthdfc':       { app: 'Paytm', bank: 'HDFC Bank' },
    'ptsbi':        { app: 'Paytm', bank: 'State Bank of India' },
    'ptaxis':       { app: 'Paytm', bank: 'Axis Bank' },

    // Amazon Pay
    'apl':          { app: 'Amazon Pay', bank: 'Axis Bank' },
    'rapl':         { app: 'Amazon Pay', bank: 'RBL Bank' },

    // BHIM / Official NPCI
    'upi':          { app: 'BHIM', bank: 'NPCI Central' },

    // Top Public & Private Banks
    'sbi':          { app: 'BHIM SBI Pay', bank: 'State Bank of India' },
    'hdfcbank':     { app: 'HDFC MobileBanking', bank: 'HDFC Bank' },
    'icici':        { app: 'iMobile', bank: 'ICICI Bank' },
    'axisbank':     { app: 'Axis Mobile', bank: 'Axis Bank' },
    'kotak':        { app: 'Kotak 811', bank: 'Kotak Mahindra Bank' },
    'barodampay':   { app: 'bob World', bank: 'Bank of Baroda' },
    'pnb':          { app: 'PNB ONE', bank: 'Punjab National Bank' },
    'cnrb':         { app: 'Canara ai1', bank: 'Canara Bank' },
    'unionbank':    { app: 'Vyom Union Bank', bank: 'Union Bank of India' },
    'indus':        { app: 'IndusMobile', bank: 'IndusInd Bank' },
    'idbi':         { app: 'IDBI Bank Go Mobile+', bank: 'IDBI Bank' },
    'yesbank':      { app: 'iris by YES BANK', bank: 'Yes Bank' },
    'federal':      { app: 'FedMobile', bank: 'Federal Bank' },
    'fbl':          { app: 'FedMobile', bank: 'Federal Bank' },
    'kbl':          { app: 'KBL Mobile Plus', bank: 'Karnataka Bank' },
    'allbank':      { app: 'IndOASIS', bank: 'Indian Bank' },
    'idfcbank':     { app: 'IDFC FIRST Mobile', bank: 'IDFC FIRST Bank' },
    'rbl':          { app: 'MoBank RBL', bank: 'RBL Bank' },
    'aubank':       { app: 'AU 0101', bank: 'AU Small Finance Bank' },
    'equitas':      { app: 'Equitas Mobile', bank: 'Equitas Small Finance Bank' },
    'postbank':     { app: 'IPPB Mobile', bank: 'India Post Payments Bank' },
    'airtel':       { app: 'Airtel Thanks', bank: 'Airtel Payments Bank' },
    'jio':          { app: 'MyJio Pay', bank: 'Jio Payments Bank' },

    // Popular Fintechs & Neo-banks
    'jupiteraxis':  { app: 'Jupiter Money', bank: 'Axis Bank' },
    'freecharge':   { app: 'Freecharge', bank: 'Axis Bank' },
    'cred':         { app: 'CRED', bank: 'Axis Bank' },
    'slice':        { app: 'Slice', bank: 'Axis Bank' },
    'navi':         { app: 'Navi', bank: 'Axis Bank' },
    'fampay':       { app: 'FamPay', bank: 'IDFC FIRST Bank' },
    'superyes':     { app: 'Super.money', bank: 'Yes Bank' },
    'timeaxis':     { app: 'TimePay', bank: 'Axis Bank' },
    'mobikwik':     { app: 'MobiKwik', bank: 'HDFC / Axis Bank' },
    'ikwik':        { app: 'MobiKwik', bank: 'ICICI Bank' },
    'kmbl':         { app: 'Kotak Mahindra', bank: 'Kotak Bank' },
    'citi':         { app: 'Citibank', bank: 'Axis Bank' },
    'sc':           { app: 'Standard Chartered', bank: 'Standard Chartered' },
    'hsbc':         { app: 'HSBC India', bank: 'HSBC' },
    'dbs':          { app: 'digibank', bank: 'DBS Bank' }
};

/**
 * Validates a UPI ID string and resolves its associated App & Bank
 *
 * @param {string} vpa - UPI ID (e.g. "9876543210@paytm", "sagar@okhdfcbank")
 * @returns {{ isValid: boolean, vpa: string, username: string, handle: string, app: string, bank: string, message: string }}
 */
export function validateUpiId(vpa) {
    if (!vpa || typeof vpa !== 'string') {
        throw new Error('UPI ID is required');
    }

    const clean = vpa.trim().toLowerCase();

    // Check basic structure: username@handle
    const parts = clean.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error('Invalid UPI ID format. Must be in username@handle format (e.g. name@okhdfcbank)');
    }

    const [username, handle] = parts;

    // Check for common email typo
    if (EMAIL_DOMAINS.has(handle)) {
        throw new Error(`"@${handle}" is an email domain, not a UPI handle. Please enter a valid UPI address (e.g. @okhdfcbank, @ybl, @paytm)`);
    }

    // Username format check (alphanumeric, dots, hyphens, min 2 chars, max 100)
    if (!/^[\w.-]{2,100}$/.test(username)) {
        throw new Error('Invalid UPI username format. Only letters, numbers, dots, and hyphens are allowed');
    }

    // Handle format check
    if (!/^[a-z\d.-]{2,50}$/.test(handle)) {
        throw new Error('Invalid UPI handle format');
    }

    // Lookup known NPCI handle
    const known = UPI_HANDLES[handle];
    if (known) {
        return {
            isValid: true,
            vpa: clean,
            username,
            handle: `@${handle}`,
            app: known.app,
            bank: known.bank,
            message: `${known.app} (${known.bank})`
        };
    }

    // Generic valid UPI handle (NPCI has hundreds of regional co-op banks)
    return {
        isValid: true,
        vpa: clean,
        username,
        handle: `@${handle}`,
        app: 'UPI App',
        bank: 'NPCI Supported Bank',
        message: 'Valid UPI Format'
    };
}
