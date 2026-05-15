const EventEmitter = require('events');

const logBus = new EventEmitter();
logBus.setMaxListeners(50);

module.exports = logBus;
