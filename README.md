# observIT — Smart Campus Environment Monitoring

**Mata Kuliah:** Integrasi Sistem — Departemen Teknologi Informasi, Institut Teknologi Sepuluh Nopember

**Repository:** [https://github.com/rasendr1ya/observIT](https://github.com/rasendr1ya/observIT)

| Nama | NRP |
|---|---|
| Danar Bagus Rasendriya | 5027231055 |
| Salomo | 5027221063 |
| Gandhi | 5027231081 |

---

## Daftar Isi

- [Deskripsi Proyek](#deskripsi-proyek)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Design Topic (Topic Tree)](#design-topic-topic-tree)
- [Fitur MQTT 5.0](#fitur-mqtt-50)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Prerequisites](#prerequisites)
- [Instalasi & Setup](#instalasi--setup)
- [Menjalankan Proyek](#menjalankan-proyek)
- [Alert Thresholds](#alert-thresholds)
- [Dashboard](#dashboard)
- [Implementation Notes](#implementation-notes)

---

## Deskripsi Proyek

**observIT** adalah sistem monitoring lingkungan kampus pintar (*Smart Campus Environment Monitoring*) yang dibangun sebagai tugas mata kuliah Integrasi Sistem di Departemen Teknologi Informasi ITS. Sistem ini mensimulasikan jaringan sensor IoT di lingkungan DTI (Departemen Teknologi Informasi) tanpa memerlukan perangkat keras fisik, dengan fokus mengimplementasikan seluruh 10 fitur protokol **MQTT 5.0**.

Terdapat tiga sensor simulasi yang mempublikasikan data lingkungan secara periodik:

| Sensor | Lokasi | Metrik |
|---|---|---|
| **SensorKelas** | Gedung A Lt.3 | Suhu, Kelembapan, Okupansi |
| **SensorLab** | Lab Jaringan Lt.2 | Suhu, CO2, Status Peralatan |
| **SensorKeamanan** | Pintu Utama Gedung A | Deteksi Gerak, Status Pintu, Akses |

Seluruh data mengalir melalui **Aedes MQTT Broker** (embedded dalam Node.js) menuju **DashboardMonitor** yang menjembatani data ke **React Dashboard** real-time via Socket.io. Sistem alert bekerja secara independen melalui **shared subscription workers** yang mengevaluasi threshold secara otomatis.

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────────┐
│                        observIT System                               │
│                                                                      │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐  │
│  │  Publishers   │     │     Broker       │     │   Subscribers    │  │
│  │               │     │                  │     │                  │  │
│  │ SensorKelas ──┼────►│  Aedes MQTT     ◄─────┼── DashboardMonitor│  │
│  │   (kelas)     │     │   Broker         │     │   (server.js)    │  │
│  │               │     │   Port 1883      │     │                  │  │
│  │ SensorLab ────┼────►│   (TCP)          ◄─────┼── AlertWorker1   │  │
│  │   (lab)       │     │                  │     │   (shared sub)   │  │
│  │               │     │   Port 8883      │     │                  │  │
│  │ SensorKeamanan┼────►│   (WebSocket)    ◄─────┼── AlertWorker2   │  │
│  │   (keamanan)  │     │                  │     │   (shared sub)   │  │
│  └──────────────┘     └──────────────────┘     └──────────────────┘  │
│                               │                                       │
│                               ▼                                       │
│                    ┌──────────────────────┐                           │
│                    │   DashboardMonitor    │                           │
│                    │   Express + Socket.io │                           │
│                    │   Port 3000           │                           │
│                    └──────────┬───────────┘                           │
│                               │ Socket.io                             │
│                               ▼                                       │
│                    ┌──────────────────────┐                           │
│                    │   React Dashboard     │                           │
│                    │   Vite + TypeScript   │                           │
│                    │   Port 5173 (dev)     │                           │
│                    │   Port 3000 (prod)    │                           │
│                    └──────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

**Alur Data:**

1. Publisher sensors mengirim data ke MQTT Broker melalui TCP (port 1883) atau WebSocket (port 8883)
2. DashboardMonitor (MQTT subscriber) menerima semua data via wildcard topic `its/dti/#`
3. DashboardMonitor meneruskan data ke browser React Dashboard melalui Socket.io
4. AlertWorkers menerima data melalui shared subscription `$share/alert-group/its/dti/#`
5. AlertWorkers mengevaluasi threshold dan mempublikasikan alert ke topic `its/dti/alert`
6. Browser dapat mengirim request ke sensor keamanan via REST API → MQTT Request-Response

---

## Design Topic (Topic Tree)

Sistem menggunakan topic tree dengan format: `its/dti/{location}/{metric}`

```
its/
└── dti/                                    # Domain: Departemen Teknologi Informasi
    ├── kelas/                              # Lokasi: Gedung A Lt.3 (Ruangan Kelas)
    │   ├── suhu                            # Temperature sensor
    │   ├── kelembapan                      # Humidity sensor
    │   ├── okupansi                        # Occupancy sensor
    │   └── status                          # LWT device status
    ├── lab/                                # Lokasi: Lab Jaringan Lt.2
    │   ├── suhu                            # Temperature sensor
    │   ├── co2                             # CO2 level sensor
    │   ├── peralatan                       # Equipment status
    │   └── status                          # LWT device status
    ├── keamanan/                           # Lokasi: Pintu Utama Gedung A
    │   ├── gerak                           # Motion detection
    │   ├── pintu                           # Door status
    │   ├── akses                           # Access events
    │   ├── status                          # LWT device status
    │   ├── request                         # Request-Response: incoming requests
    │   └── response                        # Request-Response: outgoing responses
    ├── dashboard/
    │   └── status                          # DashboardMonitor LWT status
    └── alert                               # Alert messages from workers
```

**Topic Wildcards yang digunakan:**

| Wildcard | Subscriber | Keterangan |
|---|---|---|
| `its/dti/#` | DashboardMonitor | Multi-level: subscribe semua topic DTI |
| `its/dti/+/status` | DashboardMonitor | Single-level: hanya subscribe topic status |
| `$share/alert-group/its/dti/#` | AlertWorker 1 & 2 | Shared subscription dengan multi-level wildcard |

---

## Fitur MQTT 5.0

| # | Fitur | Implementasi | Detail |
|---|---|---|---|
| 1 | **Publish / Subscribe + QoS** | Semua publisher & subscriber | QoS 0 (fire-and-forget) untuk suhu rutin, QoS 1 (at least once) untuk data penting (CO2, kelembapan, akses), QoS 2 (exactly once) untuk perintah pintu keamanan |
| 2 | **Topic Wildcards** | DashboardMonitor | Multi-level `its/dti/#` untuk subscribe semua topic DTI. Single-level `its/dti/+/status` untuk melacak status perangkat |
| 3 | **Topic Alias** | SensorKelas → server.js | SensorKelas registrasi alias `1` untuk topic `its/dti/kelas/suhu` di publish pertama. Publish selanjutnya kirim empty topic + alias integer untuk mengurangi overhead bandwidth |
| 4 | **User Properties** | Semua publisher | Setiap pesan menyertakan metadata: `device-id`, `location`, `unit`, `firmware` sebagai user properties MQTT 5.0 |
| 5 | **Retain Message** | Semua publisher | `retain: true` pada publish pertama. Dashboard connection baru langsung menerima data terakhir tanpa harus menunggu publish berikutnya |
| 6 | **Message Expiry** | SensorLab, SensorKeamanan | Data CO2 kedaluwarsa setelah 60 detik. Status pintu kedaluwarsa setelah 30 detik. Broker otomatis menghapus pesan yang expired |
| 7 | **Last Will & Testament (LWT)** | Semua publisher + DashboardMonitor | Setiap publisher daftarkan will payload `{status:"offline"}`. Saat connect, publish `{status:"online"}`. DashboardMonitor melacak health perangkat secara real-time |
| 8 | **Request-Response** | Dashboard → SensorKeamanan | Dashboard POST `/api/request-security` → server publish ke `its/dti/keamanan/request` dengan `responseTopic` + `correlationData` → SensorKeamanan reply → response dikirim ke browser via Socket.io |
| 9 | **Shared Subscription** | AlertWorker 1 & 2 | Kedua worker subscribe `$share/alert-group/its/dti/#`. Setiap pesan hanya dikirim ke satu worker (load balancing round-robin) |
| 10 | **Flow Control** | DashboardMonitor, AlertWorkers | DashboardMonitor set `receiveMaximum: 10`, AlertWorkers set `receiveMaximum: 5` untuk membatasi jumlah pesan QoS\>0 yang diterima secara simultan |

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| MQTT Broker | Aedes 0.51.x (embedded, patched for MQTT 5.0) |
| MQTT Client Library | mqtt v5 (npm package) |
| Backend Bridge | Express + Socket.io |
| Frontend Framework | React 19 + Vite + TypeScript |
| UI Components | shadcn/ui (Radix + Maia preset) |
| Charts | Recharts |
| Runtime | Node.js (CommonJS) |

---

## Struktur Proyek

```
observIT/
├── broker.js                  # Aedes MQTT Broker (port 1883 TCP, 8883 WS)
├── server.js                  # Express + Socket.io + DashboardMonitor
├── package.json               # Root dependencies & scripts
├── .env.example               # Template environment variables
├── patches/                   # Aedes MQTT 5.0 patches (patch-package)
│   ├── aedes+0.51.3.patch
│   └── aedes-packet+3.0.0.patch
├── common/
│   └── mqttClient.js          # Factory MQTT client (protocol v5)
├── publishers/                # Simulasi sensor IoT
│   ├── sensorKelas.js         # Sensor ruang kelas
│   ├── sensorLab.js           # Sensor laboratorium
│   └── sensorKeamanan.js      # Sensor keamanan
├── subscribers/               # Alert workers
│   ├── alertWorker1.js        # Shared subscription worker 1
│   └── alertWorker2.js        # Shared subscription worker 2
├── docs/
│   └── dashboard.png          # Screenshot dashboard
└── dashboard/                 # React monorepo (Turborepo)
    ├── apps/web/              # Frontend app
    │   └── src/
    │       ├── App.tsx                    # Layout utama
    │       ├── main.tsx                   # Entry point
    │       ├── lib/socket.ts              # Socket.io client
    │       ├── hooks/useSensorData.ts     # State management
    │       └── components/
    │           ├── DeviceStatusPanel.tsx   # Panel status perangkat
    │           ├── SensorCard.tsx          # Kartu sensor individual
    │           ├── LiveChart.tsx           # Grafik real-time
    │           ├── AlertLog.tsx            # Log alert
    │           ├── RequestPanel.tsx        # Panel request-response
    │           └── theme-provider.tsx      # Dark/light theme
    └── packages/ui/           # Shared UI library (shadcn/ui)
        └── src/components/
            ├── badge.tsx
            ├── button.tsx
            ├── card.tsx
            ├── dialog.tsx
            └── scroll-area.tsx
```

---

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x

Tidak perlu software tambahan — broker MQTT sudah embedded dalam proyek.

---

## Instalasi & Setup

```bash
# 1. Clone repository
git clone <your-repo-url>
cd observIT

# 2. Install dependencies root (patches otomatis via postinstall)
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Install dan build dashboard
cd dashboard
npm install
cd apps/web
npm run build
cd ../../..
```

---

## Menjalankan Proyek

Dibutuhkan **8 terminal** terpisah. Jalankan secara berurutan:

```bash
# Terminal 1 — MQTT Broker (start pertama)
npm run broker

# Terminal 2 — Express + Socket.io server
npm run server

# Terminal 3 — React Dashboard (dev mode dengan HMR)
npm run dashboard
# Buka http://localhost:5173

# Terminal 4 — Sensor ruang kelas
npm run pub:kelas

# Terminal 5 — Sensor laboratorium
npm run pub:lab

# Terminal 6 — Sensor keamanan
npm run pub:keamanan

# Terminal 7 — Alert worker 1
npm run sub:alert1

# Terminal 8 — Alert worker 2
npm run sub:alert2
```

**Urutan startup penting:** Broker (T1) → Server (T2) → Dashboard (T3) → Publishers (T4-6) → Workers (T7-8).

### NPM Scripts

| Script | Description |
|---|---|
| `npm run broker` | Start Aedes MQTT broker port 1883 |
| `npm run server` | Start Express + Socket.io port 3000 |
| `npm run pub:kelas` | Start classroom sensor publisher |
| `npm run pub:lab` | Start lab sensor publisher |
| `npm run pub:keamanan` | Start security sensor publisher |
| `npm run sub:alert1` | Start alert worker 1 (shared sub) |
| `npm run sub:alert2` | Start alert worker 2 (shared sub) |
| `npm run dashboard` | Start React dashboard (Vite, port 5173) |

---

## Alert Thresholds

| Sensor | Metrik | Warning | Critical |
|---|---|---|---|
| SensorKelas / SensorLab | Suhu (°C) | > 35°C | > 38°C |
| SensorLab | CO2 (ppm) | > 1000 ppm | > 1200 ppm |
| SensorKeamanan | Gerak | Motion detected | — |
| SensorKeamanan | Pintu | Door open | — |

Threshold dievaluasi secara independen oleh **DashboardMonitor** dan **kedua AlertWorker**. Alert dipublikasikan ke topic `its/dti/alert` dan ditampilkan di dashboard.

---

## Dashboard

![observIT Dashboard](docs/dashboard.png)

Dashboard real-time dibangun dengan **React + TypeScript + shadcn/ui** dan terhubung ke server melalui **Socket.io**. Berikut fitur-fitur yang tersedia:

### 1. Device Status Panel
Menampilkan status **online/offline** untuk ketiga sensor secara real-time. Status didorong oleh **LWT (Last Will & Testament)** — ketika sensor terputus, broker otomatis mempublikasikan status offline. Panel menampilkan nama perangkat, lokasi, dan waktu terakhir terlihat.

### 2. Sensor Grid (3 × 3)
Grid 3 kolom yang menampilkan **9 titik data** terkini:
- Suhu Kelas (°C), Kelembapan (%), Okupansi (orang)
- Suhu Lab (°C), CO2 (ppm), Peralatan (status)
- Gerak (boolean), Pintu (status), Akses (event)

Setiap kartu menunjukkan nilai terkini, unit, topic MQTT, dan timestamp. Untuk metrik dengan threshold (suhu, CO2), border kartu berubah warna:
- **Hijau** — Normal
- **Kuning** — Warning (threshold terlampaui)
- **Merah** — Critical

### 3. Live Chart
Dua grafik *time-series* yang menampilkan riwayat **20 data point terakhir**:
- **Chart Suhu** — Perbandingan suhu Kelas (biru) dan Lab (oranye) dalam °C
- **Chart CO2** — Tingkat CO2 Lab (merah) dalam ppm

Data diperbarui setiap 2 detik, memberikan visualisasi tren secara real-time.

### 4. Alert Log
Menampilkan **10 alert terakhir** dengan indikator severity:
- **🔴 CRITICAL** — Suhu > 38°C atau CO2 > 1200 ppm
- **⚠️ WARNING** — Suhu > 35°C, CO2 > 1000 ppm, atau gerakan terdeteksi
- **ℹ️ INFO** — Pintu terbuka

Setiap alert menampilkan pesan, timestamp, dan sumber (DashboardMonitor / AlertWorker).

### 5. Security Request Panel
Panel untuk mengirim **request on-demand** ke SensorKeamanan menggunakan pola **MQTT Request-Response** (Fitur 8):
1. Klik tombol "Request Security Status"
2. Server mengirim request ke topic `its/dti/keamanan/request` dengan `responseTopic` dan `correlationData`
3. SensorKeamanan memproses dan mengirim response
4. Response ditampilkan dalam **dialog modal** berisi:
   - Status pintu (locked/open/closed)
   - Deteksi gerakan
   - Akses terakhir (granted/denied)
   - Nama perangkat
   - Raw JSON untuk debugging

### 6. Connection Status
Indikator **Connected / Disconnected** di header dashboard yang menunjukkan status koneksi Socket.io ke server.

---

## Implementation Notes

### Aedes MQTT 5.0 Compatibility

Aedes 0.51.x awalnya dirancang untuk MQTT 3.1.1. Untuk mendukung fitur MQTT 5.0, beberapa file broker di-*patch* menggunakan `patch-package`:

- `aedes/lib/handlers/connect.js` — Menerima protocol version 5, CONNACK properties
- `aedes/lib/handlers/publish.js` — Topic alias resolution, MQTT 5.0 PubAck
- `aedes/lib/handlers/subscribe.js` — Shared subscription (`$share/`) support
- `aedes/lib/write.js` — Forward protocol version ke packet encoder
- `aedes-packet/packet.js` — Preserve MQTT 5.0 properties saat packet forwarding

### Topic Alias Client-Side Resolution

Karena Aedes tidak selalu meneruskan resolved topic name ke subscribers, `server.js` memelihara `topicAliasMap` lokal untuk me-resolve alias integer kembali ke topic string penuh secara independen dari behavior broker.
