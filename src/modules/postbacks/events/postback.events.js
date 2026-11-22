import { EventEmitter } from 'events';
import logger from '../../../core/logger.js';

export const POSTBACK_EVENTS = {
    CONVERSION_SETTLED: 'postback:conversion_settled'
};

class PostbackEventEmitter extends EventEmitter {}

export const postbackEvents = new PostbackEventEmitter();

// Default error boundary for events so unhandled listener errors don't crash process
postbackEvents.on('error', (err) => {
    logger.error(`postback.events.js << PostbackEvent Error: ${err.message}`);
});
