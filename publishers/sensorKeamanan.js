const { createClient } = require('../common/mqttClient');

// MQTT Feature 7: Last Will and Testament (LWT)
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

  // MQTT Feature 7: LWT — publish online status on connect
  client.publish(
    'its/dti/keamanan/status',
    JSON.stringify({ status: 'online', device: 'SensorKeamanan', timestamp: new Date().toISOString() }),
    { qos: 1, retain: true }
  );

  // MQTT Feature 8: Request-Response — subscribe to incoming requests
  client.subscribe('its/dti/keamanan/request', { qos: 1 }, (err) => {
    if (err) {
      console.error('[SensorKeamanan] Failed to subscribe to request topic:', err.message);
    } else {
      console.log('[SensorKeamanan] Listening for door commands on its/dti/keamanan/request');
    }
  });

  setInterval(() => {
    const now = new Date().toISOString();

    // --- Gerak (Motion Detection) — QoS 1 ---
    const gerakValue = Math.random() < 0.3; // 30% chance motion detected
    const gerakPayload = JSON.stringify({ value: gerakValue, timestamp: now });

    // MQTT Feature 1: QoS 1 for alert-worthy data
    client.publish('its/dti/keamanan/gerak', gerakPayload, {
      qos: 1,
      retain: true,
      // MQTT Feature 4: User Properties
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

    // --- Pintu (Door Status) — QoS 2 ---
    const doorStatuses = ['locked', 'open', 'closed'];
    const pintuValue = doorStatuses[Math.floor(Math.random() * doorStatuses.length)];
    const pintuPayload = JSON.stringify({ value: pintuValue, timestamp: now });

    // MQTT Feature 1: QoS 2 — exactly once for security commands
    // MQTT Feature 6: Message Expiry Interval — stale door commands expire after 30s
    client.publish('its/dti/keamanan/pintu', pintuPayload, {
      qos: 2,
      retain: true,
      // MQTT Feature 4: User Properties
      // MQTT Feature 6: messageExpiryInterval
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

    // --- Akses (Access Events) — QoS 1 ---
    const accessEvent = Math.random() < 0.4 ? 'granted' : 'denied';
    const userId = Math.floor(1000 + Math.random() * 9000); // 4-digit user ID
    const aksesPayload = JSON.stringify({
      value: accessEvent,
      userId: userId,
      timestamp: now,
    });

    client.publish('its/dti/keamanan/akses', aksesPayload, {
      qos: 1,
      retain: true,
      // MQTT Feature 4: User Properties
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

// MQTT Feature 8: Request-Response handler
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

    // Build response with current sensor state
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

    // MQTT Feature 8: Echo correlationData back to requester
    if (correlationData) {
      responseOpts.properties = { correlationData };
    }

    client.publish(responseTopic, responsePayload, responseOpts);
    console.log(`[SensorKeamanan] [RESPONSE SENT] → ${responseTopic}`, responsePayload);
  }
});
