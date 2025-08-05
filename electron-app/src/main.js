const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const cap = require('cap');
const winston = require('winston');
const pb = require('./pb');
const Readable = require('stream').Readable;
const Cap = cap.Cap;
const decoders = cap.decoders;
const PROTOCOL = decoders.PROTOCOL;

let mainWindow;
let captureInstance = null;
let logger = null;
let logLevel = 'info';
let selectedDevice = null;
let devices = cap.deviceList();

// 数据统计
let total_damage = {};
let total_count = {};
let dps_window = {};
let damage_time = {};
let realtime_dps = {};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.loadURL(
    process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../renderer/build/index.html')}`
  );
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: 获取网卡列表
ipcMain.handle('get-devices', async () => {
  return devices.map((d, i) => ({ index: i, name: d.name, description: d.description }));
});

// IPC: 设置日志级别
ipcMain.handle('set-log-level', async (event, level) => {
  logLevel = level;
  if (logger) logger.level = level;
  return true;
});

// IPC: 选择网卡并启动抓包
ipcMain.handle('start-capture', async (event, deviceIndex) => {
  if (captureInstance) {
    captureInstance.close();
    captureInstance = null;
  }
  selectedDevice = devices[deviceIndex];
  if (!selectedDevice) throw new Error('Invalid device index');
  logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(info => `[${info.timestamp}] [${info.level}] ${info.message}`)
    ),
    transports: [new winston.transports.Console()]
  });
  startCapture(selectedDevice.name);
  return true;
});

// IPC: 清空数据
ipcMain.handle('clear-data', async () => {
  total_damage = {};
  total_count = {};
  dps_window = {};
  damage_time = {};
  realtime_dps = {};
  return true;
});

// IPC: 获取当前统计数据
ipcMain.handle('get-data', async () => {
  return getCurrentData();
});

// 定时推送数据到前端
setInterval(() => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('data-update', getCurrentData());
  }
}, 200);

function getCurrentData() {
  const user = {};
  for (const uid of Object.keys(total_damage)) {
    if (!user[uid]) user[uid] = {
      realtime_dps: 0,
      realtime_dps_max: 0,
      total_dps: 0,
      total_damage: {
        normal: 0, critical: 0, lucky: 0, crit_lucky: 0, hpLessen: 0, total: 0,
      },
      total_count: {
        normal: 0, critical: 0, lucky: 0, total: 0,
      },
    };
    user[uid].total_damage = total_damage[uid];
    user[uid].total_count = total_count[uid];
    user[uid].total_dps = ((total_damage[uid].total) / (damage_time[uid][1] - damage_time[uid][0]) * 1000) || 0;
    user[uid].realtime_dps = realtime_dps[uid] ? realtime_dps[uid].value : 0;
    user[uid].realtime_dps_max = realtime_dps[uid] ? realtime_dps[uid].max : 0;
  }
  return { code: 0, user };
}

function startCapture(deviceName) {
  // 重置数据
  total_damage = {};
  total_count = {};
  dps_window = {};
  damage_time = {};
  realtime_dps = {};

  let user_uid;
  let current_server = '';
  let _data = Buffer.alloc(0);
  let tcp_next_seq = -1;
  let tcp_cache = {};
  let tcp_cache_size = 0;
  let tcp_last_time = 0;
  class Lock {
    constructor() { this.queue = []; this.locked = false; }
    async acquire() { if (this.locked) return new Promise((resolve) => this.queue.push(resolve)); this.locked = true; }
    release() { if (this.queue.length > 0) { const nextResolve = this.queue.shift(); nextResolve(); } else { this.locked = false; } }
  }
  const tcp_lock = new Lock();

  // 瞬时DPS统计
  setInterval(() => {
    const now = Date.now();
    for (const uid of Object.keys(dps_window)) {
      while (dps_window[uid].length > 0 && now - dps_window[uid][0].time > 1000) {
        dps_window[uid].shift();
      }
      if (!realtime_dps[uid]) {
        realtime_dps[uid] = { value: 0, max: 0 };
      }
      realtime_dps[uid].value = 0;
      for (const b of dps_window[uid]) {
        realtime_dps[uid].value += b.damage;
      }
      if (realtime_dps[uid].value > realtime_dps[uid].max) {
        realtime_dps[uid].max = realtime_dps[uid].value;
      }
    }
  }, 100);

  // 抓包
  const c = new Cap();
  const filter = 'ip and tcp';
  const bufSize = 10 * 1024 * 1024;
  const buffer = Buffer.alloc(65535);
  const linkType = c.open(deviceName, filter, bufSize, buffer);
  c.setMinBytes && c.setMinBytes(0);
  c.on('packet', async function (nbytes, trunc) {
    const buffer1 = Buffer.from(buffer);
    if (linkType === 'ETHERNET') {
      var ret = decoders.Ethernet(buffer1);
      if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
        ret = decoders.IPV4(buffer1, ret.offset);
        const srcaddr = ret.info.srcaddr;
        const dstaddr = ret.info.dstaddr;
        if (ret.info.protocol === PROTOCOL.IP.TCP) {
          var datalen = ret.info.totallen - ret.hdrlen;
          ret = decoders.TCP(buffer1, ret.offset);
          const srcport = ret.info.srcport;
          const dstport = ret.info.dstport;
          const src_server = srcaddr + ':' + srcport + ' -> ' + dstaddr + ':' + dstport;
          datalen -= ret.hdrlen;
          let buf = Buffer.from(buffer1.subarray(ret.offset, ret.offset + datalen));
          if (tcp_last_time && Date.now() - tcp_last_time > 30000) {
            logger.warn('Cannot capture the next packet! Is the game closed or disconnected? seq: ' + tcp_next_seq);
            current_server = '';
            clearTcpCache();
          }
          if (current_server !== src_server) {
            try {
              if (buf[4] == 0) {
                const data = buf.subarray(10);
                if (data.length) {
                  const stream = Readable.from(data, { objectMode: false });
                  let data1;
                  do {
                    const len_buf = stream.read(4);
                    if (!len_buf) break;
                    data1 = stream.read(len_buf.readUInt32BE() - 4);
                    const signature = Buffer.from([0x00, 0x63, 0x33, 0x53, 0x42, 0x00]);
                    if (Buffer.compare(data1.subarray(5, 5 + signature.length), signature)) break;
                    try {
                      let body = pb.decode(data1.subarray(18)) || {};
                      if (current_server !== src_server) {
                        current_server = src_server;
                        clearTcpCache();
                        logger.info('Got Scene Server Address: ' + src_server);
                      }
                      if (data1[17] === 0x2e) {
                        body = body[1];
                        if (body[5]) {
                          if (!user_uid) {
                            user_uid = BigInt(body[5]) >> 16n;
                            logger.info('Got player UID! UID: ' + user_uid);
                          }
                        }
                      }
                    } catch (e) { }
                  } while (data1 && data1.length)
                }
              }
            } catch (e) { }
            return;
          }
          // 已识别服务器包
          await tcp_lock.acquire();
          if (tcp_next_seq === -1 && buf.length > 4 && buf.readUInt32BE() < 999999) {
            tcp_next_seq = ret.info.seqno;
          }
          logger.debug('TCP next seq: ' + tcp_next_seq);
          tcp_cache[ret.info.seqno] = buf;
          tcp_cache_size++;
          while (tcp_cache[tcp_next_seq]) {
            const seq = tcp_next_seq;
            _data = _data.length === 0 ? tcp_cache[seq] : Buffer.concat([_data, tcp_cache[seq]]);
            tcp_next_seq = (seq + tcp_cache[seq].length) >>> 0;
            tcp_cache[seq] = undefined;
            tcp_cache_size--;
            tcp_last_time = Date.now();
            setTimeout(() => {
              if (tcp_cache[seq]) {
                tcp_cache[seq] = undefined;
                tcp_cache_size--;
              }
            }, 10000);
          }
          while (_data.length > 4) {
            let len = _data.readUInt32BE();
            if (_data.length >= len) {
              const packet = _data.subarray(0, len);
              _data = _data.subarray(len);
              processPacket(packet);
            } else {
              if (len > 999999) {
                logger.error(`Invalid Length!! ${_data.length},${len},${_data.toString('hex')},${tcp_next_seq}`);
                return;
              }
              break;
            }
          }
          tcp_lock.release();
        } else {
          logger.error('Unsupported IPv4 protocol: ' + PROTOCOL.IP[ret.info.protocol]);
        }
      } else {
        logger.error('Unsupported Ethertype: ' + PROTOCOL.ETHERNET[ret.info.type]);
      }
    }
  });
  function clearTcpCache() {
    _data = Buffer.alloc(0);
    tcp_next_seq = -1;
    tcp_last_time = 0;
    tcp_cache = {};
    tcp_cache_size = 0;
  }
  function processPacket(buf) {
    try {
      if (buf.length < 32) return;
      const data = buf.subarray(10);
      if (data.length) {
        const stream = Readable.from(data, { objectMode: false });
        let data1;
        do {
          const len_buf = stream.read(4);
          if (!len_buf) break;
          data1 = stream.read(len_buf.readUInt32BE() - 4);
          try {
            let body = pb.decode(data1.subarray(18)) || {};
            if (data1[17] === 0x2e) {
              body = body[1];
              if (body[5]) {
                const uid = BigInt(body[5]) >> 16n;
                if (user_uid !== uid) {
                  user_uid = uid;
                  logger.info('Got player UID! UID: ' + user_uid);
                }
              }
            }
            let body1 = body[1];
            if (body1) {
              if (!Array.isArray(body1)) body1 = [body1];
              for (const b of body1) {
                if (b[7] && b[7][2]) {
                  logger.debug(b.toBase64());
                  const hits = Array.isArray(b[7][2]) ? b[7][2] : [b[7][2]];
                  for (const hit of hits) {
                    const skill = hit[12];
                    if (typeof skill !== 'number') break;
                    const value = hit[6], luckyValue = hit[8], isMiss = hit[2], isCrit = hit[5], hpLessenValue = hit[9] ?? 0;
                    const damage = value ?? luckyValue;
                    const is_player = (BigInt(hit[21] || hit[11]) & 0xffffn) === 640n;
                    if (!is_player) break;
                    const operator_uid = BigInt(hit[21] || hit[11]) >> 16n;
                    if (!operator_uid) break;
                    if (typeof damage !== 'number') break;
                    //初始化
                    if (!total_damage[operator_uid]) total_damage[operator_uid] = { normal: 0, critical: 0, lucky: 0, crit_lucky: 0, hpLessen: 0, total: 0 };
                    if (!total_count[operator_uid]) total_count[operator_uid] = { normal: 0, critical: 0, lucky: 0, total: 0 };
                    if (isCrit) {
                      total_count[operator_uid].critical++;
                      if (luckyValue) {
                        total_damage[operator_uid].crit_lucky += damage;
                        total_count[operator_uid].lucky++;
                      } else {
                        total_damage[operator_uid].critical += damage;
                      }
                    } else if (luckyValue) {
                      total_damage[operator_uid].lucky += damage;
                      total_count[operator_uid].lucky++;
                    } else {
                      total_damage[operator_uid].normal += damage;
                      total_count[operator_uid].normal++;
                    }
                    total_damage[operator_uid].total += damage;
                    total_damage[operator_uid].hpLessen += hpLessenValue;
                    total_count[operator_uid].total++;
                    if (!dps_window[operator_uid]) dps_window[operator_uid] = [];
                    dps_window[operator_uid].push({ time: Date.now(), damage });
                    if (!damage_time[operator_uid]) damage_time[operator_uid] = [];
                    if (damage_time[operator_uid][0]) {
                      damage_time[operator_uid][1] = Date.now();
                    } else {
                      damage_time[operator_uid][0] = Date.now();
                    }
                  }
                }
              }
            }
          } catch (e) { }
        } while (data1 && data1.length)
      }
    } catch (e) { }
  }
}
