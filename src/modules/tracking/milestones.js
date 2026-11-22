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

export function matchMilestone(rows, query) {
    const raw = query.event ?? query.goal;
    if (raw === undefined && rows.length === 1) return rows[0];
    const key = normalizeKey(raw);
    const row = rows.find(item => item.eventKey === key);
    if (!row) throw new Error('Missing or unknown offer event');
    return row;
}
