const { createClient } = require('../common/mqttClient');

const client = createClient('sensor-keamanan-01', {
  will: {
    topic: 'its/dti/keamanan/status',
    payload: JSON.stringify({ status: 'offline', device: 'SensorKeamanan' }),
    qos: 1,
    retain: true,
  },
});

client.on('connect', () => {
  console.log('[SensorKeamanan] Publisher started — Pintu Utama Gedung A');

  client.publish(
    'its/dti/keamanan/status',
    JSON.stringify({ status: 'online', device: 'SensorKeamanan', timestamp: new Date().toISOString() }),
    { qos: 1, retain: true }
  );

  client.subscribe('its/dti/keamanan/request', { qos: 1 }, (err) => {
    if (err) {
      console.error('[SensorKeamanan] Failed to subscribe to request topic:', err.message);
    } else {
      console.log('[SensorKeamanan] Listening for door commands on its/dti/keamanan/request');
    }
  });

  setInterval(() => {
    const now = new Date().toISOString();

    const gerakValue = Math.random() < 0.3;
    const gerakPayload = JSON.stringify({ value: gerakValue, timestamp: now });

    client.publish('its/dti/keamanan/gerak', gerakPayload, {
      qos: 1,
      retain: true,
      properties: {
        userProperties: {
          'device-id': 'sensor-keamanan-01',
          location: 'Pintu Utama Gedung A',
          unit: 'boolean',
          firmware: '2.0.1',
        },
      },
    });
    console.log(`[SensorKeamanan] gerak → ${gerakValue}${gerakValue ? ' (⚠ motion!)' : ''}`);

    const doorStatuses = ['locked', 'open', 'closed'];
    const pintuValue = doorStatuses[Math.floor(Math.random() * doorStatuses.length)];
    const pintuPayload = JSON.stringify({ value: pintuValue, timestamp: now });

    client.publish('its/dti/keamanan/pintu', pintuPayload, {
      qos: 2,
      retain: true,
      properties: {
        messageExpiryInterval: 30,
        userProperties: {
          'device-id': 'sensor-keamanan-01',
          location: 'Pintu Utama Gedung A',
          unit: 'status',
          firmware: '2.0.1',
        },
      },
    });
    console.log(`[SensorKeamanan] pintu → ${pintuValue} [expiry: 30s, QoS 2]`);

    const accessEvent = Math.random() < 0.4 ? 'granted' : 'denied';
    const userId = Math.floor(1000 + Math.random() * 9000);
    const aksesPayload = JSON.stringify({
      value: accessEvent,
      userId: userId,
      timestamp: now,
    });

    client.publish('its/dti/keamanan/akses', aksesPayload, {
      qos: 1,
      retain: true,
      properties: {
        userProperties: {
          'device-id': 'sensor-keamanan-01',
          location: 'Pintu Utama Gedung A',
          unit: 'event',
          firmware: '2.0.1',
        },
      },
    });
    console.log(`[SensorKeamanan] akses → ${accessEvent} (user: ${userId})`);
  }, 5000);
});

client.on('message', (topic, message, packet) => {
  if (topic === 'its/dti/keamanan/request') {
    let requestData;
    try {
      requestData = JSON.parse(message.toString());
    } catch (e) {
      requestData = { raw: message.toString() };
    }

    console.log(`\n[SensorKeamanan] [REQUEST RECEIVED]`, requestData);

    const responseTopic = packet.properties?.responseTopic;
    const correlationData = packet.properties?.correlationData;

    if (!responseTopic) {
      console.log('[SensorKeamanan] No responseTopic in request — ignoring');
      return;
    }

    const responsePayload = JSON.stringify({
      device: 'SensorKeamanan',
      doorStatus: ['locked', 'open', 'closed'][Math.floor(Math.random() * 3)],
      motionDetected: Math.random() < 0.3,
      lastAccess: Math.random() < 0.5 ? 'granted' : 'denied',
      timestamp: new Date().toISOString(),
      type: 'response',
    });

    const responseOpts = {
      qos: 1,
    };

    if (correlationData) {
      responseOpts.properties = { correlationData };
    }

    client.publish(responseTopic, responsePayload, responseOpts);
    console.log(`[SensorKeamanan] [RESPONSE SENT] → ${responseTopic}`, responsePayload);
  }
});
