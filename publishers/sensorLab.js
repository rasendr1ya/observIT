const { createClient } = require('../common/mqttClient');

// MQTT Feature 7: Last Will and Testament (LWT)
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

  // MQTT Feature 7: LWT — publish online status on connect
  client.publish(
    'its/dti/lab/status',
    JSON.stringify({ status: 'online', device: 'SensorLab', timestamp: new Date().toISOString() }),
    { qos: 1, retain: true }
  );

  setInterval(() => {
    const now = new Date().toISOString();

    // --- Suhu (Temperature) — QoS 0 ---
    const suhuValue = (20 + Math.random() * 20).toFixed(1); // 20-40°C
    const suhuPayload = JSON.stringify({ value: parseFloat(suhuValue), timestamp: now });

    // MQTT Feature 1: QoS 0 — fire and forget for routine telemetry
    client.publish('its/dti/lab/suhu', suhuPayload, {
      qos: 0,
      retain: true,
      // MQTT Feature 4: User Properties
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

    // --- CO2 (ppm) — QoS 1 ---
    const co2Value = Math.floor(400 + Math.random() * 1101); // 400-1500 ppm
    const co2Payload = JSON.stringify({ value: co2Value, timestamp: now });

    // MQTT Feature 1: QoS 1 for alert-worthy data
    // MQTT Feature 6: Message Expiry Interval — CO2 stale after 60s
    client.publish('its/dti/lab/co2', co2Payload, {
      qos: 1,
      retain: true,
      // MQTT Feature 4: User Properties
      // MQTT Feature 6: messageExpiryInterval
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

    // --- Peralatan (Equipment Status) — QoS 1 ---
    const statuses = ['active', 'idle', 'error'];
    const peralatanValue = statuses[Math.floor(Math.random() * statuses.length)];
    const peralatanPayload = JSON.stringify({ value: peralatanValue, timestamp: now });

    client.publish('its/dti/lab/peralatan', peralatanPayload, {
      qos: 1,
      retain: true,
      // MQTT Feature 4: User Properties
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
