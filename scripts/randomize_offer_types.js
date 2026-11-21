#!/usr/bin/env node
/**
 * randomize_offer_types.js
 *
 * Sets `type` on all existing offers (Offer schema enum) so app filters can be tested.
 *
 * Usage (from Reward_api/):
 *   node scripts/randomize_offer_types.js
 *
 * Env:
 *   DRY_RUN=true       — only print what would change, no DB writes
 *   BALANCED=true      — cycle through types in order (good for small DBs so each filter has rows)
 *                        default: uniform random per offer
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Offer from '../src/models/offer.model.js';
import config from '../src/config/config.js';

const TYPES = ['app_install', 'survey', 'video', 'quiz', 'registration', 'purchase'];

const randomType = () => TYPES[Math.floor(Math.random() * TYPES.length)];

/** Fisher–Yates shuffle copy */
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * First min(n, 6) offers get one of each type in random order; rest cycle through TYPES.
 * So when n ≥ 6, every filter chip has at least one row.
 */
function balancedTypes(n) {
    if (n === 0) return [];
    const out = [];
    const order = shuffle([...TYPES]);
    for (let i = 0; i < n; i++) {
        if (i < TYPES.length) {
            out.push(order[i]);
        } else {
            out.push(TYPES[i % TYPES.length]);
        }
    }
    return out;
}

async function main() {
    const dryRun = process.env.DRY_RUN === 'true';
    const balanced = process.env.BALANCED === 'true';

    console.log('🎲 Randomize offer types');
    console.log(`   DRY_RUN=${dryRun}  BALANCED=${balanced}\n`);

    await mongoose.connect(config.MONGO_URI, { maxPoolSize: 10 });
    console.log('✅ MongoDB connected\n');

    const offers = await Offer.find({ isDeleted: false }).select('_id type offerName').lean();
    const n = offers.length;
    console.log(`Found ${n} non-deleted offers.\n`);

    if (n === 0) {
        await mongoose.disconnect();
        process.exit(0);
    }

    let assignments;
    if (balanced) {
        assignments = balancedTypes(n);
    } else {
        assignments = Array.from({ length: n }, () => randomType());
    }

    const counts = {};
    TYPES.forEach((t) => { counts[t] = 0; });

    const ops = offers.map((o, i) => {
        const newType = assignments[i];
        counts[newType]++;
        return {
            updateOne: {
                filter: { _id: o._id },
                update: { $set: { type: newType } }
            }
        };
    });

    console.log('Distribution after update:');
    Object.entries(counts).forEach(([t, c]) => console.log(`   ${t}: ${c}`));
    console.log('');

    if (dryRun) {
        console.log('DRY_RUN — no writes. Sample (first 10):');
        offers.slice(0, 10).forEach((o, i) => {
            console.log(`   ${String(o._id)}  "${o.offerName || ''}"  ${o.type ?? '(unset)'} → ${assignments[i]}`);
        });
        await mongoose.disconnect();
        console.log('\n👋 Done (dry run).');
        return;
    }

    const BATCH = 500;
    let updated = 0;
    for (let i = 0; i < ops.length; i += BATCH) {
        const chunk = ops.slice(i, i + BATCH);
        const res = await Offer.bulkWrite(chunk, { ordered: false });
        updated += res.modifiedCount ?? res.nModified ?? chunk.length;
    }

    console.log(`✅ Updated ${updated} offers.\n`);
    await mongoose.disconnect();
    console.log('👋 Done.');
}

main().catch((err) => {
    console.error('💥 Fatal:', err);
    process.exit(1);
});
