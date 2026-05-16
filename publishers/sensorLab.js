const { createClient } = require('../common/mqttClient');

const client = createClient('sensor-lab-01', {
  will: {
    topic: 'its/dti/lab/status',
    payload: JSON.stringify({ status: 'offline', device: 'SensorLab' }),
    qos: 1,
    retain: true,
  },
});

client.on('connect', () => {
  console.log('[SensorLab] Publisher started — Lab Jaringan Lt.2');

  client.publish(
    'its/dti/lab/status',
    JSON.stringify({ status: 'online', device: 'SensorLab', timestamp: new Date().toISOString() }),
    { qos: 1, retain: true }
  );

  setInterval(() => {
    const now = new Date().toISOString();

    const suhuValue = (20 + Math.random() * 20).toFixed(1);
    const suhuPayload = JSON.stringify({ value: parseFloat(suhuValue), timestamp: now });

    client.publish('its/dti/lab/suhu', suhuPayload, {
      qos: 0,
      retain: true,
      properties: {
        userProperties: {
          'device-id': 'sensor-lab-01',
          location: 'Lab Jaringan Lt.2',
          unit: 'celsius',
          firmware: '1.1.5',
        },
      },
    });
    console.log(`[SensorLab] suhu → ${suhuValue}°C`);

    const co2Value = Math.floor(400 + Math.random() * 1101);
    const co2Payload = JSON.stringify({ value: co2Value, timestamp: now });

    client.publish('its/dti/lab/co2', co2Payload, {
      qos: 1,
      retain: true,
      properties: {
        messageExpiryInterval: 60,
        userProperties: {
          'device-id': 'sensor-lab-01',
          location: 'Lab Jaringan Lt.2',
          unit: 'ppm',
          firmware: '1.1.5',
        },
      },
    });
    console.log(`[SensorLab] co2 → ${co2Value} ppm [expiry: 60s]`);

    const statuses = ['active', 'idle', 'error'];
    const peralatanValue = statuses[Math.floor(Math.random() * statuses.length)];
    const peralatanPayload = JSON.stringify({ value: peralatanValue, timestamp: now });

    client.publish('its/dti/lab/peralatan', peralatanPayload, {
      qos: 1,
      retain: true,
      properties: {
        userProperties: {
          'device-id': 'sensor-lab-01',
          location: 'Lab Jaringan Lt.2',
          unit: 'status',
          firmware: '1.1.5',
        },
      },
    });
    console.log(`[SensorLab] peralatan → ${peralatanValue}`);
  }, 4000);
});
