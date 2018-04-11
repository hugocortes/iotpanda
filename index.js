require('dotenv').config();
const env = process.env;

const _ = require('lodash');
const Panda = require('@commaai/pandajs').default;
const Cayenne = require('cayennejs');

const Log = require('./log');

// Toyota Prius '16-'18 CAN Bus
const TOYOTA = {
  SPEED: {
    // hex code: b4
    address: 180,
    // byte 4, encoder
    // byte 5, 6 contain speed
    // byte 7, checksum
    bus: {
      start: 5,
      end: 6,
      length: 2
    }
  }
};

/** Globals **/
let messageCounter = 0;
const MAX_MESSAGE = 1;
const WIFI_ENABLED = true;

/** Cayenne Channel Constants **/
const PANDA_VOLTAGE = 100;
const PANDA_CURRENT = 101;
const PANDA_GAS_INTERCEPTOR_DETECTED = 102;
const PANDA_START_SIGNAL_DETECTED = 103;
const PANDA_CONTROLS_ALLOWED = 104;
const PANDA_SPEED = 0;

/** Cayenne Values */
let speed_kph = 0;
let speed_mph = 0;

const PANDA_HEALTH_INTERVAL = 60000 * 5;
const PANDA_MESSAGE_INTERVAL = 1000;

/** Initiate **/
const panda = new Panda();
const cayenne = new Cayenne.MQTT({
  username: env.MQTT_USER,
  password: env.MQTT_PASS,
  clientId: env.MQTT_CLIENT,
  broker: env.MQTT_HOST
});

/** Event Handlers **/
let stopOnMessage = panda.onMessage(pandaMessage);
panda.onError(pandaError);

// Useful for local debugging
if (WIFI_ENABLED) {
  Log.debug('connecting to cayenne');
  cayenne.connect(CayennePanda);
} else {
  Log.debug('data will not be published');
  pandaStart();
}

/**
 * Handles Cayenne MQTT connection
 * @param {Object} err  Error object on mqtt connect failure
 * @param {Object} mqtt The Cayenne MQTT object
 */
function CayennePanda(err, mqtt) {
  if (err) {
    Log.error(err);
    process.exit(1);
  }
  Log.verbose('connected to cayenne');

  pandaStart();
}

/**
 * Publishes panda data to Cayenne
 */
function publishPanda() {
  Log.debug('publishing to cayenne');
  Log.debug(`channel: ${PANDA_SPEED}, value: ${speed_mph}`);
  cayenne.rawWrite(PANDA_SPEED, speed_mph);
}

/**
 * Start the panda!
 */
function pandaStart() {
  Log.info('connecting to panda...');
  panda.start()
    .then((isConnected) => {
      if (isConnected) {
        Log.debug('panda connection successful');
      } else {
        throw new Error('panda connect failed :\'(');
      }
      return panda.connect();
    })
    .then((pandaId) => {
      Log.verbose(`panda usb id: ${pandaId}`);

      if (WIFI_ENABLED) {
        setInterval(pandaHealthCheck, PANDA_HEALTH_INTERVAL);
      }
    })
    .catch(err => Log.error(err));
}

/**
 * Publishes panda health status info to Cayenne
 */
function pandaHealthCheck() {
  return panda.getHealth()
    .then((healthStatus) => {
      Log.debug(`healthStatus: ${JSON.stringify(healthStatus)}`);
      Log.debug('writing panda health check to cayenne');
      cayenne.rawWrite(PANDA_VOLTAGE, healthStatus.voltage, 'voltage', 'v');
      cayenne.rawWrite(PANDA_CURRENT, healthStatus.current, 'current', 'ma');
      cayenne.rawWrite(PANDA_GAS_INTERCEPTOR_DETECTED, healthStatus.isGasInterceptorDetector, 'digital_sensor', 'd');
      cayenne.rawWrite(PANDA_START_SIGNAL_DETECTED, healthStatus.isStartSignalDetected, 'digital_sensor', 'd');
      cayenne.rawWrite(PANDA_CONTROLS_ALLOWED, healthStatus.controlsAreAllowed, 'digital_sensor', 'd');
    });
}

/**
 * Panda onMessage event handler and stops listener after every X reads
 * @listens panda:onMessage
 * @param   {Object}        msg
 * @param   {Number}        msg.time
 * @param   {Array}         msg.canMessages
 * @param   {Number}        msg.canMessages[].bus
 * @param   {Number}        msg.canMessages[].address
 * @param   {Number}        msg.canMessages[].busTime
 * @param   {ByteArray}     msg.canMessages[].data
 */
function pandaMessage(msg) {
  messageCounter++;
  Log.debug(`message counter: ${messageCounter}`);
  Log.debug('Message count:', msg.length);

  _.forEach(msg, (canMsg) => {
    _.forEach(canMsg.canMessages, (message) => {
      if (message.address === TOYOTA.SPEED.address) {
        speed_kph = message.data.readUIntBE(TOYOTA.SPEED.bus.start, TOYOTA.SPEED.bus.length) * 0.01;
        speed_mph = speed_kph * 0.621371;
        Log.debug(`speed kph: ${speed_kph}`);
        Log.debug(`speed mph: ${speed_mph}`);
      }
    })
  });

  if (messageCounter >= MAX_MESSAGE) {
    stopOnMessage();
    setTimeout(
      () => {
        messageCounter = 0;
        stopOnMessage = panda.onMessage(pandaMessage);
        Log.debug('panda resumed');
        if (WIFI_ENABLED) {
          publishPanda();
        }
      },
      PANDA_MESSAGE_INTERVAL
    );
    Log.debug('panda is paused');
  }
}

/**
 * Panda onError event handler
 * @listens panda:onError
 * @param {Object} err 
 */
function pandaError(err) {
  Log.error(`Event error: ${err.event}`);
  Log.error(`Error: ${err.error}`);
  return process.exit(1); 
}
