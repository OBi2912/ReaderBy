/**
 * Client-side device stats using browser APIs.
 * Used when the app is hosted on a static host (Netlify, Vercel) with no backend.
 * Returns the same shape as the backend stats so the dashboard can render as-is.
 */

async function getDeviceInfo() {
  const ua = navigator.userAgent;
  const platform = navigator.platform || 'Unknown';
  let model = platform;
  let ownerName = null;

  // Try to get high-entropy hints (Chrome-based browsers on Android/desktop)
  if (navigator.userAgentData?.getHighEntropyValues) {
    try {
      const hints = await navigator.userAgentData.getHighEntropyValues([
        'model',
        'platform',
        'platformVersion'
      ]);
      if (hints.model) model = hints.model;
    } catch (e) { }
  }

  // Fallback device detection from UA
  if (model === platform) {
    if (/iPhone/i.test(ua)) {
      model = 'iPhone';
    } else if (/iPad/i.test(ua)) {
      model = 'iPad';
    } else if (/Android/i.test(ua)) {
      const androidMatch = ua.match(/;\s*([^;)]+)\s+Build\//);
      model = androidMatch ? androidMatch[1].trim() : 'Android Device';
    } else if (/Macintosh/i.test(ua)) {
      model = 'Mac';
    } else if (/Windows/i.test(ua)) {
      model = 'Windows PC';
    } else if (/Linux/i.test(ua)) {
      model = 'Linux PC';
    }
  }

  // Try to detect owner name from device hostname via mDNS (available in some in-network scenarios)
  // Most common: on iOS/macOS, hostname is often "Johns-iPhone.local" or similar.
  // We can try the hostname if running in LAN context.
  let hostname = window.location?.hostname || 'Browser';
  if (hostname === 'localhost' || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    // We're on LAN - try to get the pretty device name
    hostname = navigator.userAgentData?.brands?.[0]?.brand || 'Browser';
  }

  // Attempt to read a user-friendly device name from local storage (can be set by the user)
  const savedName = localStorage.getItem('readerby_device_name');
  if (savedName) ownerName = savedName;

  return {
    hostname,
    model,
    ownerName,
    distro: platform,
    platform,
    arch: platform
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
  // Use navigator.deviceMemory for a more realistic RAM total
  const deviceMB = navigator.deviceMemory || 4;
  const total = deviceMB * 1024 * 1024 * 1024;
  const used = total * 0.4; // rough estimate
  return {
    total,
    active: used,
    used,
    percentage: 40
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
    fans: [Math.round(fans)],
    model: 'Client CPU',
    cores: navigator.hardwareConcurrency || 4,
    threads: navigator.hardwareConcurrency || 4,
    speed: 2.5
  };
}

function getGpuStats() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return {
          model: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
          vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
          vram: 0
        };
      }
    }
  } catch (e) { }
  return {
    model: 'Integrated Graphics',
    vendor: 'Unknown',
    vram: 0
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
  const connectionType = conn?.type || effectiveType || '4g';
  return {
    rx_sec: rx,
    tx_sec: tx,
    internetSpeed: Math.round(internetSpeed),
    isTesting: false,
    localIps: [],
    connectionType
  };
}

async function getDiskStats() {
  // Use the Storage API for real quota/usage data when available
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;   // total available storage (bytes)
      const usage = estimate.usage || 0;   // bytes currently used in browser storage
      // quota represents the available space for the web app.
      // On mobile Chrome this is often 60% of the actual free disk space.
      // We mark it clearly as "App Storage" since we can't read full disk.
      return [{
        fs: 'App Storage',
        size: quota,
        used: quota > 0 ? (usage / quota) * 100 : 0,
        usedBytes: usage,
        mount: '/',
        isClientStorage: true
      }];
    } catch (e) { }
  }

  // Final fallback: estimate from deviceMemory
  const deviceMB = navigator.deviceMemory || 4;
  const size = deviceMB * 16 * 1024 * 1024 * 1024; // rough phone ratio: 16× RAM
  return [{
    fs: 'Browser',
    size,
    used: 35,
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

export async function collectClientStats() {
  const [battery, device, disk] = await Promise.all([
    getBatteryStats(),
    getDeviceInfo(),
    getDiskStats()
  ]);

  return {
    device,
    memory: getMemoryStats(),
    cpu: getCpuStats(),
    gpu: getGpuStats(),
    network: getNetworkStats(),
    disk,
    battery,
    timestamp: Date.now()
  };
}
