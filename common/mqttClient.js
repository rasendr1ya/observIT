const mqtt = require('mqtt');
require('dotenv').config();

const BROKER_PORT = process.env.BROKER_PORT || 1883;
const BROKER_URL = `mqtt://localhost:${BROKER_PORT}`;

function createClient(clientId, extraOptions = {}) {
  const options = {
    protocolVersion: 5,
    clientId,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 10000,
    queueQoSZero: false,
    ...extraOptions,
    properties: {
      topicAliasMaximum: 10,
      ...(extraOptions.properties || {}),
    },
  };
  const client = mqtt.connect(BROKER_URL, options);

  client.on('connect', (connack) => {
    console.log(`[${clientId}] Connected to broker (sessionPresent: ${connack.sessionPresent})`);
  });

  client.on('reconnect', () => {
    console.log(`[${clientId}] Reconnecting...`);
  });

  client.on('error', (err) => {
    console.error(`[${clientId}] ERROR:`, err.message);
  });

  client.on('offline', () => {
    console.log(`[${clientId}] Offline`);
  });

  client.on('close', () => {
    console.log(`[${clientId}] Connection closed`);
  });

  return client;
}

module.exports = { createClient };
