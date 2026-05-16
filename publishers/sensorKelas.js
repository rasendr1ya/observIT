const { createClient } = require('../common/mqttClient');

const client = createClient('sensor-kelas-01', {
  will: {
    topic: 'its/dti/kelas/status',
    payload: JSON.stringify({ status: 'offline', device: 'SensorKelas' }),
    qos: 1,
    retain: true,
  },
});

let suhuAliasRegistered = false;
let publishInterval = null;

client.on('connect', () => {
  console.log('[SensorKelas] Publisher started — Gedung A Lt.3');

  suhuAliasRegistered = false;

  client.publish(
    'its/dti/kelas/status',
    JSON.stringify({ status: 'online', device: 'SensorKelas', timestamp: new Date().toISOString() }),
    { qos: 1, retain: true }
  );

  if (publishInterval) {
    clearInterval(publishInterval);
  }

  let firstPublish = true;

  publishInterval = setInterval(() => {
    const now = new Date().toISOString();

    const suhuValue = (22 + Math.random() * 13).toFixed(1);
    const suhuPayload = JSON.stringify({ value: parseFloat(suhuValue), timestamp: now });

    const retainOpt = firstPublish;

    const publishCb = (err) => {
      if (err) console.error(`[SensorKelas] Publish error:`, err.message);
    };

    if (!suhuAliasRegistered) {
      client.publish('its/dti/kelas/suhu', suhuPayload, {
        qos: 0,
        retain: retainOpt,
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
      client.publish('', suhuPayload, {
        qos: 0,
        retain: retainOpt,
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
      console.log(`[SensorKelas] [USE ALIAS] suhu → ${suhuValue}°C`);
    }

    const kelembapanValue = (40 + Math.random() * 50).toFixed(1);
    const kelembapanPayload = JSON.stringify({ value: parseFloat(kelembapanValue), timestamp: now });

    client.publish('its/dti/kelas/kelembapan', kelembapanPayload, {
      qos: 1,
      retain: true,
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

    const okupansiValue = Math.floor(Math.random() * 41);
    const okupansiPayload = JSON.stringify({ value: okupansiValue, timestamp: now });

    client.publish('its/dti/kelas/okupansi', okupansiPayload, {
      qos: 1,
      retain: true,
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
