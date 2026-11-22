export function normalizeKey(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function snapshotMilestones(offer, percent = 0) {
    const rows = [];
    for (const item of (offer.events || [])) {
        const event = item.campaignEventId;
        if (!event || event.isDeleted || event.status === 'inactive') continue;

        const baseUserPayoutPaise = Math.round((item.userPayout || 0) * 100);
        const referrerSharePaise = Math.round(baseUserPayoutPaise * percent / 100);

        rows.push({
            campaignEventId: event._id,
            offerEventId: item._id,
            eventKey: normalizeKey(event.eventKey || event.name),
            eventName: event.name,
            order: event.order || 1,
            advertiserPayoutPaise: Math.round((event.advertiserPayout || 0) * 100),
            baseUserPayoutPaise,
            referrerSharePaise,
            userSharePaise: baseUserPayoutPaise - referrerSharePaise,
            status: 'pending'
        });
    }

    if (!rows.length) throw new Error('Offer has no active milestones');
    return rows.sort((a, b) => a.order - b.order);
}

/**
 * Robust Multi-Level Offer Event Matcher
 * Handles exact key, event name, event ID, order number, and fuzzy names
 */
export function matchOfferEvent(rows, query = {}) {
    if (!rows || rows.length === 0) {
        throw new Error('No milestones configured for this task');
    }

    // 1. Single-event offer: always matches the only event (even if query.event is omitted or generic)
    if (rows.length === 1) {
        return rows[0];
    }

    const raw = query.event ?? query.goal ?? query.event_name ?? query.action ?? query.event_id ?? query.order;

    // 2. Multi-event offer without event param: picks first pending event in sequence
    if (!raw) {
        const firstPending = rows.find(item => item.status === 'pending');
        if (firstPending) return firstPending;
        return rows[0];
    }

    const rawStr = String(raw).trim();
    const cleanKey = normalizeKey(rawStr);
    const alphanumericKey = cleanKey.replace(/[^a-z0-9]/g, '');

    // Level A: Exact match on eventKey
    let match = rows.find(item => normalizeKey(item.eventKey) === cleanKey);
    if (match) return match;

    // Level B: Match by eventName (e.g. "App Install" matches "app_install" or "appinstall")
    match = rows.find(item => {
        const itemClean = normalizeKey(item.eventName).replace(/[^a-z0-9]/g, '');
        return itemClean === alphanumericKey;
    });
    if (match) return match;

    // Level C: Match by Event ObjectId (if advertiser returns campaignEventId)
    match = rows.find(item => String(item.campaignEventId) === rawStr || String(item.offerEventId) === rawStr);
    if (match) return match;

    // Level D: Match by Step / Order Number (e.g. ?event=1 or ?order=2)
    if (/^[1-6]$/.test(rawStr)) {
        const orderNum = Number(rawStr);
        match = rows.find(item => item.order === orderNum);
        if (match) return match;
    }

    // Level E: Fuzzy Substring Match (e.g. "install" in "app_install", or "deposit" in "first_deposit")
    match = rows.find(item => {
        const itemKey = normalizeKey(item.eventKey);
        return itemKey && (itemKey.includes(cleanKey) || cleanKey.includes(itemKey));
    });
    if (match) return match;

    throw new Error(`Missing or unknown offer event: "${rawStr}"`);
}

// Backward-compatible alias
export const matchMilestone = matchOfferEvent;
