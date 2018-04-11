const Winston = require('winston');

const options = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    verbose: 3,
    debug: 4
  }
};

const logger = new (Winston.Logger)({
  levels: options.levels,
  transports: [
    new (Winston.transports.Console)({
      timestamp: true,
      colorize: true,
      level: process.env.LOG_LEVEL || 'error',
      stderrLevels: ['error']
    })
  ]
});

module.exports = logger;
