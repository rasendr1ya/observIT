require('dotenv').config();
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('./common/mqttClient');

const EXPRESS_PORT = process.env.EXPRESS_PORT || 3000;

const app = express();
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const dashboardDist = path.join(__dirname, 'dashboard', 'apps', 'web', 'dist');
app.use(express.static(dashboardDist));

const mqttClient = createClient('dashboard-monitor', {
  properties: {
    receiveMaximum: 10,
  },
  will: {
    topic: 'its/dti/dashboard/status',
    payload: JSON.stringify({ status: 'offline', device: 'DashboardMonitor' }),
    qos: 1,
    retain: true,
  },
});

const latestDataCache = new Map();
const deviceStatusCache = new Map();
const topicAliasMap = new Map();

function timestamp() {
  return new Date().toLocaleTimeString('id-ID', { hour12: false });
}

mqttClient.on('connect', () => {
  console.log(`\n[${timestamp()}] [DashboardMonitor] Connected to broker`);

  mqttClient.publish(
    'its/dti/dashboard/status',
    JSON.stringify({ status: 'online', device: 'DashboardMonitor', timestamp: new Date().toISOString() }),
    { qos: 1, retain: true }
  );

  mqttClient.subscribe('its/dti/#', { qos: 1 }, (err) => {
    if (err) console.error('[DashboardMonitor] Subscribe error (its/dti/#):', err.message);
    else console.log(`[${timestamp()}] [DashboardMonitor] Subscribed to its/dti/#`);
  });

  mqttClient.subscribe('its/dti/+/status', { qos: 1 }, (err) => {
    if (err) console.error('[DashboardMonitor] Subscribe error (its/dti/+/status):', err.message);
    else console.log(`[${timestamp()}] [DashboardMonitor] Subscribed to its/dti/+/status`);
  });

  mqttClient.subscribe('its/dti/keamanan/response/dash', { qos: 1 }, (err) => {
    if (err) console.error('[DashboardMonitor] Subscribe error (response/dash):', err.message);
    else console.log(`[${timestamp()}] [DashboardMonitor] Subscribed to its/dti/keamanan/response/dash`);
  });

  console.log(`[${timestamp()}] [DashboardMonitor] Flow control: receiveMaximum = 10\n`);
});

mqttClient.on('message', (topic, message, packet) => {
  let payload;
  try {
    payload = JSON.parse(message.toString());
  } catch (e) {
    payload = { raw: message.toString() };
  }

  let resolvedTopic = topic;
  const alias = packet.properties?.topicAlias;
  if (alias) {
    if (topic && topic.length > 0) {
      topicAliasMap.set(alias, topic);
      console.log(`[ALIAS] Registered alias ${alias} → "${topic}"`);
    } else {
      resolvedTopic = topicAliasMap.get(alias) || topic;
      console.log(`[ALIAS] Resolved alias ${alias} → "${resolvedTopic}"`);
    }
  }

  const userProperties = packet.properties?.userProperties || null;

  const now = Date.now();
  const event = {
    topic: resolvedTopic,
    payload,
    userProperties,
    timestamp: now,
  };

  if (!resolvedTopic.includes('/status') && resolvedTopic !== 'its/dti/alert' && resolvedTopic !== 'its/dti/keamanan/response/dash') {
    latestDataCache.set(resolvedTopic, event);
  }

  io.emit('sensor:update', event);

  if (resolvedTopic.endsWith('/status')) {
    const deviceStatus = {
      device: payload.device || resolvedTopic.split('/').slice(-2, -1)[0],
      location: resolvedTopic.split('/').slice(0, -1).join('/'),
      status: payload.status,
      timestamp: payload.timestamp || new Date(now).toISOString(),
    };
    io.emit('device:status', deviceStatus);
    deviceStatusCache.set(deviceStatus.device, deviceStatus);
    console.log(`[${timestamp()}] [DashboardMonitor] device:status → ${deviceStatus.device} is ${deviceStatus.status}`);
  }

  if (resolvedTopic === 'its/dti/alert') {
    console.log(`[${timestamp()}] [DashboardMonitor] alert:triggered → ${payload.level}: ${payload.message}`);
  }

  if (resolvedTopic === 'its/dti/keamanan/response/dash') {
    const correlationData = packet.properties?.correlationData;
    const correlationId = correlationData ? correlationData.toString() : null;
    io.emit('request:response', {
      correlationId,
      data: payload,
      timestamp: now,
    });
    console.log(`[${timestamp()}] [DashboardMonitor] request:response → ${correlationId}`);
    return;
  }

  const value = payload.value;
  let alertEmitted = false;

  if (resolvedTopic.includes('suhu') && typeof value === 'number') {
    if (value > 38) {
      io.emit('alert:triggered', {
        level: 'critical',
        source: 'DashboardMonitor',
        message: `Suhu kritis: ${value}°C (${resolvedTopic})`,
        timestamp: new Date(now).toISOString(),
      });
      console.log(`[${timestamp()}] [DashboardMonitor] 🔴 CRITICAL: Suhu ${value}°C (${resolvedTopic})`);
      alertEmitted = true;
    } else if (value > 35) {
      io.emit('alert:triggered', {
        level: 'warning',
        source: 'DashboardMonitor',
        message: `Suhu tinggi: ${value}°C (${resolvedTopic})`,
        timestamp: new Date(now).toISOString(),
      });
      console.log(`[${timestamp()}] [DashboardMonitor] ⚠️  WARNING: Suhu ${value}°C (${resolvedTopic})`);
      alertEmitted = true;
    }
  }

  if (resolvedTopic.includes('co2') && typeof value === 'number') {
    if (value > 1200) {
      io.emit('alert:triggered', {
        level: 'critical',
        source: 'DashboardMonitor',
        message: `CO2 kritis: ${value} ppm (${resolvedTopic})`,
        timestamp: new Date(now).toISOString(),
      });
      alertEmitted = true;
    } else if (value > 1000) {
      io.emit('alert:triggered', {
        level: 'warning',
        source: 'DashboardMonitor',
        message: `CO2 tinggi: ${value} ppm (${resolvedTopic})`,
        timestamp: new Date(now).toISOString(),
      });
      alertEmitted = true;
    }
  }

  if (resolvedTopic.includes('gerak') && value === true) {
    io.emit('alert:triggered', {
      level: 'warning',
      source: 'DashboardMonitor',
      message: `Gerakan terdeteksi! (${resolvedTopic})`,
      timestamp: new Date(now).toISOString(),
    });
    alertEmitted = true;
  }

  if (resolvedTopic.includes('pintu') && value === 'open') {
    io.emit('alert:triggered', {
      level: 'info',
      source: 'DashboardMonitor',
      message: `Pintu terbuka! (${resolvedTopic})`,
      timestamp: new Date(now).toISOString(),
    });
    alertEmitted = true;
  }
});

app.post('/api/request-security', (req, res) => {
  const correlationId = uuidv4();

  console.log(`\n[${timestamp()}] [DashboardMonitor] [REQUEST] Sending security request (correlation: ${correlationId})`);

  const requestPayload = JSON.stringify({
    command: 'get_status',
    timestamp: new Date().toISOString(),
  });

  mqttClient.publish('its/dti/keamanan/request', requestPayload, {
    qos: 1,
    properties: {
      responseTopic: 'its/dti/keamanan/response/dash',
      correlationData: Buffer.from(correlationId),
    },
  });

  res.json({
    success: true,
    correlationId,
    message: 'Request sent. Awaiting response via Socket.io...',
  });
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(dashboardDist, 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

io.on('connection', (socket) => {
  console.log(`[${timestamp()}] [Socket.io] Client connected: ${socket.id}`);

  for (const [topic, event] of latestDataCache.entries()) {
    socket.emit('sensor:update', event);
  }

  for (const [device, status] of deviceStatusCache.entries()) {
    socket.emit('device:status', status);
  }

  if (latestDataCache.size > 0 || deviceStatusCache.size > 0) {
    console.log(`[${timestamp()}] [Socket.io] Sent ${latestDataCache.size} sensor + ${deviceStatusCache.size} device entries to ${socket.id}`);
  }

  socket.on('disconnect', () => {
    console.log(`[${timestamp()}] [Socket.io] Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(EXPRESS_PORT, () => {
  console.log(`\n====================================`);
  console.log(`  observIT Dashboard Server`);
  console.log(`  Express + Socket.io on port ${EXPRESS_PORT}`);
  console.log(`  MQTT DashboardMonitor active`);
  console.log(`====================================\n`);
});
