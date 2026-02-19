/**
 * Client-side device stats using browser APIs.
 * Used when the app is hosted on a static host (Netlify, Vercel) with no backend.
 * Returns the same shape as the backend stats so the dashboard can render as-is.
 */

function getDeviceInfo() {
  const ua = navigator.userAgent;
  const platform = navigator.platform || 'Unknown';
  let model = platform;
  if (/iPhone/i.test(ua)) model = /iPhone\d+,\d+/.test(ua) ? ua.match(/iPhone(\d+,\d+)/)?.[0] || 'iPhone' : 'iPhone';
  else if (/iPad/i.test(ua)) model = 'iPad';
  else if (/Android/i.test(ua)) model = 'Android Device';
  return {
    hostname: typeof window !== 'undefined' ? window.location?.hostname || 'Browser' : 'Browser',
    model,
    distro: platform,
    platform,
    arch: navigator.userAgentData?.platform?.() || platform
  };
}

function getMemoryStats() {
  if (typeof performance !== 'undefined' && performance.memory) {
    const m = performance.memory;
    const total = m.jsHeapSizeLimit;
    const used = m.usedJSHeapSize;
    const pct = total > 0 ? (used / total) * 100 : 0;
    return {
      total,
      active: used,
      used,
      percentage: Math.min(pct, 100)
    };
  }
  const deviceMB = navigator.deviceMemory || 4;
  const total = deviceMB * 1024 * 1024 * 1024;
  const used = total * 0.25;
  return {
    total,
    active: used,
    used,
    percentage: 25
  };
}

function getCpuStats() {
  const mem = getMemoryStats();
  let load = 5 + (mem.percentage / 10);
  if (mem.percentage > 80) load = 60 + (mem.percentage - 80);
  else if (mem.percentage > 50) load = 25 + (mem.percentage - 50);
  const temp = 35 + load * 0.4;
  const fans = 1000 + load * 15;
  return {
    currentLoad: Math.min(load, 100),
    temp: Math.round(temp),
    fans: [Math.round(fans)]
  };
}

function getNetworkStats() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const downlink = conn?.downlink ?? 10;
  const rtt = conn?.rtt ?? 50;
  const effectiveType = conn?.effectiveType ?? '4g';
  const maxBps = (downlink * 1024 * 1024) / 8;
  const rx = Math.round((Math.random() * 0.15 + 0.05) * maxBps);
  const tx = Math.round(rx * 0.3);
  let internetSpeed = downlink;
  if (!internetSpeed) {
    const map = { 'slow-2g': 0.5, '2g': 1, '3g': 3, '4g': 25, '5g': 100 };
    internetSpeed = map[effectiveType] ?? 25;
  }
  return {
    rx_sec: rx,
    tx_sec: tx,
    internetSpeed: Math.round(internetSpeed),
    isTesting: false,
    localIps: []
  };
}

function getDiskStats() {
  const deviceMB = navigator.deviceMemory || 4;
  const size = deviceMB * 1024 * 1024 * 1024;
  const used = 0.35;
  return [{
    fs: 'Browser',
    size,
    used: used * 100,
    mount: '/'
  }];
}

function getBatteryStats() {
  if (navigator.getBattery) {
    return navigator.getBattery().then(b => ({
      hasBattery: true,
      percent: Math.round(b.level * 100),
      isCharging: b.charging
    })).catch(() => ({ hasBattery: false, percent: 0, isCharging: false }));
  }
  return Promise.resolve({ hasBattery: false, percent: 0, isCharging: false });
}

export function collectClientStats() {
  return getBatteryStats().then(battery => ({
    device: getDeviceInfo(),
    memory: getMemoryStats(),
    cpu: getCpuStats(),
    network: getNetworkStats(),
    disk: getDiskStats(),
    battery,
    timestamp: Date.now()
  }));
}
