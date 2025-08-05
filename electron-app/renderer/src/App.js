import React, { useEffect, useState, useCallback } from 'react';
import './App.css';

const SORT_OPTIONS = [
  { value: 'uid', label: '按UID排序 (升序)' },
  { value: 'damage', label: '按总伤害排序 (降序)' },
  { value: 'dps', label: '按总DPS排序 (降序)' },
  { value: 'realtimeDpsMax', label: '按最大瞬时DPS排序 (降序)' },
];

function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [logLevel, setLogLevel] = useState('info');
  const [started, setStarted] = useState(false);
  const [data, setData] = useState({ user: {} });
  const [sortMode, setSortMode] = useState(localStorage.getItem('sortMode') || 'uid');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  // 获取网卡列表
  useEffect(() => {
    window.electron.getDevices().then(setDevices);
  }, []);

  // 监听数据推送
  useEffect(() => {
    window.electron.onDataUpdate((d) => setData(d));
  }, []);

  // 主题切换
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  // 排序模式持久化
  useEffect(() => {
    localStorage.setItem('sortMode', sortMode);
  }, [sortMode]);

  // 启动抓包
  const start = useCallback(async () => {
    if (selectedDevice == null) return;
    await window.electron.setLogLevel(logLevel);
    await window.electron.startCapture(selectedDevice);
    setStarted(true);
  }, [selectedDevice, logLevel]);

  // 清空数据
  const clearData = async () => {
    await window.electron.clearData();
  };

  // 排序
  const getSortedUsers = () => {
    const arr = Object.keys(data.user || {}).map(id => ({ id: Number(id), ...data.user[id] }));
    switch (sortMode) {
      case 'damage':
        arr.sort((a, b) => b.total_damage.total - a.total_damage.total); break;
      case 'uid':
        arr.sort((a, b) => a.id - b.id); break;
      case 'dps':
        arr.sort((a, b) => b.total_dps - a.total_dps); break;
      case 'realtimeDpsMax':
        arr.sort((a, b) => b.realtime_dps_max - a.realtime_dps_max); break;
      default:
        arr.sort((a, b) => a.id - b.id);
    }
    return arr;
  };

  // UI
  if (!started) {
    return (
      <div className="card" style={{ marginTop: 60 }}>
        <h1>🎯 星痕共鸣实时战斗数据展示 V2.1</h1>
        <h3>请选择网络设备和日志级别后启动抓包</h3>
        <div style={{ margin: '20px 0' }}>
          <label style={{ marginRight: 10, fontWeight: 'bold' }}>网络设备:</label>
          <select value={selectedDevice ?? ''} onChange={e => setSelectedDevice(Number(e.target.value))}>
            <option value="" disabled>请选择</option>
            {devices.map(d => <option key={d.index} value={d.index}>{d.description || d.name}</option>)}
          </select>
        </div>
        <div style={{ margin: '20px 0' }}>
          <label style={{ marginRight: 10, fontWeight: 'bold' }}>日志级别:</label>
          <select value={logLevel} onChange={e => setLogLevel(e.target.value)}>
            <option value="info">info</option>
            <option value="debug">debug</option>
          </select>
        </div>
        <button onClick={start} disabled={selectedDevice == null}>🚀 启动抓包</button>
      </div>
    );
  }

  return (
    <div>
      <h1>🎯 星痕共鸣实时战斗数据展示 V2.1</h1>
      <h3>⚠ 暂未区分治疗量与伤害量，将合并计算，数据仅供参考</h3>
      <div style={{ margin: '20px 0' }}>
        <label htmlFor="sortSelect" style={{ marginRight: 10, fontWeight: 'bold' }}>排序方式:</label>
        <select id="sortSelect" value={sortMode} onChange={e => setSortMode(e.target.value)} style={{ padding: '8px 12px', fontSize: 14, borderRadius: 5, border: '1px solid #ddd', backgroundColor: 'white' }}>
          {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <button onClick={clearData}>✨ 清空统计数据</button>
      <button onClick={() => setDarkMode(d => !d)} style={{ marginLeft: 10 }}>{darkMode ? '☀️ 日间模式' : '🌙 夜间模式'}</button>
      <div className="card">
        <table id="damageTable">
          <thead>
            <tr>
              <th title="角色唯一标识符">角色 ID</th>
              <th title="角色在战斗中造成的总伤害和治疗量">总伤害/治疗</th>
              <th title="角色在战斗中造成的非幸运的暴击伤害和治疗量">纯暴击</th>
              <th title="角色在战斗中造成的非暴击的幸运伤害和治疗量">纯幸运</th>
              <th title="角色在战斗中造成的暴击的幸运伤害和治疗量">暴击幸运</th>
              <th title="角色在战斗中的暴击触发率">暴击率</th>
              <th title="角色在战斗中的幸运触发率">幸运率</th>
              <th title="角色在战斗中的最近一秒造成的伤害和治疗量">瞬时DPS/HPS</th>
              <th title="角色在战斗中的最大瞬时DPS/HPS">最大瞬时</th>
              <th title="角色在战斗中的总DPS/HPS（以第一次技能与最后一次技能之间的时间作为有效战斗时间计算）">总DPS/HPS</th>
            </tr>
          </thead>
          <tbody>
            {getSortedUsers().map(user => {
              const crit_rate = user.total_count.total ? user.total_count.critical / user.total_count.total : 0;
              const lucky_rate = user.total_count.total ? user.total_count.lucky / user.total_count.total : 0;
              return (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.total_damage.total}</td>
                  <td>{user.total_damage.critical}</td>
                  <td>{user.total_damage.lucky}</td>
                  <td>{user.total_damage.crit_lucky}</td>
                  <td>{(crit_rate * 100).toFixed(2)}%</td>
                  <td>{(lucky_rate * 100).toFixed(2)}%</td>
                  <td>{user.realtime_dps}</td>
                  <td>{user.realtime_dps_max}</td>
                  <td>{user.total_dps.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="watermark"></div>
      <footer style={{ marginTop: 40, fontSize: 14, color: '#888' }}>Copyright © 2025 Made with ❤️ by <a href="https://dml.ink" target="_blank" rel="noopener noreferrer">Dimole</a></footer>
    </div>
  );
}

export default App;
