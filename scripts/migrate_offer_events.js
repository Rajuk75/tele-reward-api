import 'dotenv/config';
import mongoose from 'mongoose';
import Event from '../src/modules/offers/event.model.js';
import Offer from '../src/modules/offers/offer.model.js';

// Run against the target database before starting the updated API.
if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI to the database to migrate');
await mongoose.connect(process.env.MONGO_URI);
try {
    const offers = Offer.collection.find({ events: { $type: 'objectId' } });
    for await (const offer of offers) {
        const definitions = await Event.find({ _id: { $in: offer.events }, campaignId: offer.campaignId }).lean();
        const byId = new Map(definitions.map(event => [String(event._id), event]));
        const events = offer.events.map(id => {
            const event = byId.get(String(id));
            if (!Number.isFinite(event?.userPayout) || event.userPayout < 0) {
                throw new Error(`Cannot recover payout for offer ${offer._id}, event ${id}`);
            }
            return { _id: new mongoose.Types.ObjectId(), campaignEventId: id, userPayout: event.userPayout };
        });
        await Offer.collection.updateOne({ _id: offer._id, events: offer.events }, { $set: {
            events,
            firstEventPayout: events[0].userPayout,
            totalPayout: events.reduce((sum, event) => sum + event.userPayout, 0)
        } });
    }
} finally {
    await mongoose.disconnect();
}
