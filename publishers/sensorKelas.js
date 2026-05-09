const { createClient } = require('../common/mqttClient');

// MQTT Feature 7: Last Will and Testament (LWT)
const client = createClient('sensor-kelas-01', {
  will: {
    topic: 'its/dti/kelas/status',
    payload: JSON.stringify({ status: 'offline', device: 'SensorKelas' }),
    qos: 1,
    retain: true,
  },
});

// MQTT Feature 3: Topic Alias — track whether alias has been registered
let suhuAliasRegistered = false;
let publishInterval = null;

client.on('connect', () => {
  console.log('[SensorKelas] Publisher started — Gedung A Lt.3');

  // Reset alias state on reconnect (mqtt.js clears topicAliasSend on connect)
  suhuAliasRegistered = false;

  // MQTT Feature 7: LWT — publish online status on connect
  client.publish(
    'its/dti/kelas/status',
    JSON.stringify({ status: 'online', device: 'SensorKelas', timestamp: new Date().toISOString() }),
    { qos: 1, retain: true }
  );

  // Avoid duplicate intervals on reconnect
  if (publishInterval) {
    clearInterval(publishInterval);
  }

  let firstPublish = true;

  publishInterval = setInterval(() => {
    const now = new Date().toISOString();

    // --- Suhu (Temperature) — QoS 0, Topic Alias ---
    const suhuValue = (22 + Math.random() * 13).toFixed(1); // 22-35°C
    const suhuPayload = JSON.stringify({ value: parseFloat(suhuValue), timestamp: now });

    // MQTT Feature 5: Retain Message — retain on first publish only
    const retainOpt = firstPublish;

    // MQTT Feature 3: Topic Alias
    const publishCb = (err) => {
      if (err) console.error(`[SensorKelas] Publish error:`, err.message);
    };

    if (!suhuAliasRegistered) {
      // First publish: register topic alias 1
      client.publish('its/dti/kelas/suhu', suhuPayload, {
        qos: 0,
        retain: retainOpt,
        // MQTT Feature 4: User Properties (metadata)
        properties: {
          topicAlias: 1,
          userProperties: {
            'device-id': 'sensor-kelas-01',
            location: 'Gedung A Lt.3',
            unit: 'celsius',
            firmware: '1.2.0',
          },
        },
      }, publishCb);
      console.log(`[SensorKelas] [REGISTER ALIAS] suhu → ${suhuValue}°C`);
      suhuAliasRegistered = true;
    } else {
      // MQTT Feature 3: Use topic alias — empty topic string + alias integer
      client.publish('', suhuPayload, {
        qos: 0,
        retain: retainOpt,
        properties: {
          topicAlias: 1,
          // MQTT Feature 4: User Properties
          userProperties: {
            'device-id': 'sensor-kelas-01',
            location: 'Gedung A Lt.3',
            unit: 'celsius',
            firmware: '1.2.0',
          },
        },
      }, publishCb);
      console.log(`[SensorKelas] [USE ALIAS] suhu → ${suhuValue}°C`);
    }

    // --- Kelembapan (Humidity) — QoS 1 ---
    const kelembapanValue = (40 + Math.random() * 50).toFixed(1); // 40-90%
    const kelembapanPayload = JSON.stringify({ value: parseFloat(kelembapanValue), timestamp: now });

    // MQTT Feature 1: Publish/Subscribe — QoS 1 for important data
    client.publish('its/dti/kelas/kelembapan', kelembapanPayload, {
      qos: 1,
      retain: true,
      // MQTT Feature 4: User Properties
      properties: {
        userProperties: {
          'device-id': 'sensor-kelas-01',
          location: 'Gedung A Lt.3',
          unit: 'percent',
          firmware: '1.2.0',
        },
      },
    }, publishCb);
    console.log(`[SensorKelas] kelembapan → ${kelembapanValue}%`);

    // --- Okupansi (Occupancy) — QoS 1 ---
    const okupansiValue = Math.floor(Math.random() * 41); // 0-40
    const okupansiPayload = JSON.stringify({ value: okupansiValue, timestamp: now });

    // MQTT Feature 1: QoS 1 — at least once delivery
    client.publish('its/dti/kelas/okupansi', okupansiPayload, {
      qos: 1,
      retain: true,
      // MQTT Feature 4: User Properties
      properties: {
        userProperties: {
          'device-id': 'sensor-kelas-01',
          location: 'Gedung A Lt.3',
          unit: 'people',
          firmware: '1.2.0',
        },
      },
    }, publishCb);
    console.log(`[SensorKelas] okupansi → ${okupansiValue} orang`);

    firstPublish = false;
  }, 3000);
});

client.on('close', () => {
  if (publishInterval) {
    clearInterval(publishInterval);
    publishInterval = null;
  }
});
