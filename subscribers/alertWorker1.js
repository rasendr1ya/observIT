const { createClient } = require('../common/mqttClient');

const WORKER_NAME = 'AlertWorker-1';

const client = createClient('alert-worker-1', {
  properties: {
    receiveMaximum: 5,
  },
});

const SHARED_TOPIC = '$share/alert-group/its/dti/#';

function timestamp() {
  return new Date().toLocaleTimeString('id-ID', { hour12: false });
}

client.on('connect', () => {
  console.log(`[${WORKER_NAME}] Connected — shared subscription group: alert-group`);
  console.log(`[${WORKER_NAME}] Flow control: receiveMaximum = 5`);

  client.subscribe(SHARED_TOPIC, { qos: 1 }, (err) => {
    if (err) {
      console.error(`[${WORKER_NAME}] Subscribe error:`, err.message);
    } else {
      console.log(`[${WORKER_NAME}] Subscribed to ${SHARED_TOPIC}`);
    }
  });
});

client.on('message', (topic, message, packet) => {
  let data;
  try {
    data = JSON.parse(message.toString());
  } catch (e) {
    return;
  }

  const value = data.value;
  const now = new Date().toISOString();

  if (topic.includes('suhu') && typeof value === 'number' && value > 35) {
    const level = value > 38 ? 'critical' : 'warning';
    const alertPayload = JSON.stringify({
      level,
      source: WORKER_NAME,
      message: `Suhu tinggi terdeteksi: ${value}°C (${topic})`,
      timestamp: now,
    });

    client.publish('its/dti/alert', alertPayload, { qos: 0 });
    console.log(`[${timestamp()}] [${WORKER_NAME}] ${level === 'critical' ? '🔴 CRITICAL' : '⚠️  WARNING'}: Suhu ${value}°C (${topic})`);
  }

  if (topic.includes('co2') && typeof value === 'number' && value > 1000) {
    const level = value > 1200 ? 'critical' : 'warning';
    const alertPayload = JSON.stringify({
      level,
      source: WORKER_NAME,
      message: `CO2 tinggi terdeteksi: ${value} ppm (${topic})`,
      timestamp: now,
    });

    client.publish('its/dti/alert', alertPayload, { qos: 0 });
    console.log(`[${timestamp()}] [${WORKER_NAME}] ${level === 'critical' ? '🔴 CRITICAL' : '⚠️  WARNING'}: CO2 ${value} ppm (${topic})`);
  }

  if (topic.includes('gerak') && value === true) {
    const alertPayload = JSON.stringify({
      level: 'warning',
      source: WORKER_NAME,
      message: `Gerakan terdeteksi! (${topic})`,
      timestamp: now,
    });

    client.publish('its/dti/alert', alertPayload, { qos: 0 });
    console.log(`[${timestamp()}] [${WORKER_NAME}] ⚠️  WARNING: Gerak terdeteksi! (${topic})`);
  }

  if (topic.includes('pintu') && value === 'open') {
    const alertPayload = JSON.stringify({
      level: 'info',
      source: WORKER_NAME,
      message: `Pintu terbuka! (${topic})`,
      timestamp: now,
    });

    client.publish('its/dti/alert', alertPayload, { qos: 0 });
    console.log(`[${timestamp()}] [${WORKER_NAME}] ℹ️  INFO: Pintu terbuka (${topic})`);
  }
});
