require('dotenv').config();
const aedes = require('aedes')();
const net = require('net');
const http = require('http');
const { WebSocketServer } = require('ws');
const { Duplex } = require('stream');

const BROKER_PORT = process.env.BROKER_PORT || 1883;
const WS_PORT = process.env.WS_PORT || 8883;

function timestamp() {
  return new Date().toLocaleTimeString('id-ID', { hour12: false });
}

function log(event, client) {
  const clientId = client ? (client.id || 'unknown') : 'system';
  console.log(`[${timestamp()}] [BROKER] ${event} - ${clientId}`);
}

aedes.on('client', (client) => {
  log('client connected', client);
});

aedes.on('clientDisconnect', (client) => {
  log('client disconnected', client);
});

aedes.on('publish', (packet, client) => {
  if (client) {
    const topic = packet.topic;
    const payload = packet.payload ? packet.payload.toString() : '';
    const truncated = payload.length > 80 ? payload.substring(0, 80) + '...' : payload;
    log(`publish → ${topic}`, client);
    console.log(`         payload: ${truncated}`);
  }
});

aedes.on('subscribe', (subscriptions, client) => {
  const topics = Array.isArray(subscriptions) ? subscriptions.map(s => s.topic) : [subscriptions.topic];
  log(`subscribe → ${topics.join(', ')}`, client);
});

aedes.on('unsubscribe', (subscriptions, client) => {
  const topics = Array.isArray(subscriptions) ? subscriptions : [subscriptions];
  log(`unsubscribe → ${topics.join(', ')}`, client);
});

aedes.on('clientError', (client, err) => {
  log(`ERROR: ${err.message}`, client);
});

const tcpServer = net.createServer(aedes.handle);
tcpServer.listen(BROKER_PORT, () => {
  console.log(`\n====================================`);
  console.log(`  observIT MQTT Broker (Aedes)`);
  console.log(`  TCP listening on port ${BROKER_PORT}`);
  console.log(`====================================\n`);
});

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('observIT MQTT WebSocket endpoint');
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const clientId = req.headers['sec-websocket-key'] || 'ws-client';
  log('ws client connected', { id: clientId });

  const stream = new Duplex({
    write(chunk, encoding, callback) {
      if (ws.readyState === ws.OPEN) {
        ws.send(chunk);
      }
      callback();
    },
    final(callback) {
      ws.close();
      callback();
    },
    read() {},
  });

  ws.on('message', (data) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    stream.push(buf);
  });

  ws.on('close', () => {
    stream.push(null);
    log('ws client disconnected', { id: clientId });
  });

  ws.on('error', (err) => {
    log(`WS ERROR: ${err.message}`, { id: clientId });
  });

  aedes.handle(stream);
});

httpServer.listen(WS_PORT, () => {
  console.log(`  WebSocket listening on port ${WS_PORT}`);
  console.log(`====================================\n`);
});
