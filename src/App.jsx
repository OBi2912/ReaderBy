import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Activity,
  Cpu,
  Database,
  Download,
  Upload,
  Zap,
  Clock,
  Globe,
  Wifi,
  Thermometer,
  Wind,
  ShieldCheck,
  MousePointer2,
  Sun,
  Moon,
  HardDrive,
  Battery,
  BatteryCharging,
  Smartphone
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useWindowSize } from 'react-use';
import { collectClientStats } from './utils/clientStats';

// Hosts that only serve static files and cannot run the Node.js backend
// Note: Tunnel hosts (loca.lt, ngrok.io, trycloudflare.com) are NOT included here
// because they can forward to the production server which serves both frontend and backend
const STATIC_ONLY_HOSTS = [
  'netlify.app',
  'netlify.com',
  'vercel.app',
  'github.io',
  'cloudflarepages.dev',
  'pages.dev',
  'web.app',
  'firebaseapp.com',
  'surge.sh'
];

function isStaticOnlyHost(hostname) {
  return STATIC_ONLY_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
}

// Tunnel hosts that forward to a single port (frontend + backend on same server)
const TUNNEL_HOSTS = [
  'loca.lt',
  'ngrok.io',
  'trycloudflare.com',
  'ngrok-free.app',
  'ngrok.app'
];

function isTunnelHost(hostname) {
  return TUNNEL_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
}

// Resolve backend URL: config.json (runtime) > env (build time) > auto-detect
const getBackendUrlFallback = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  const { protocol, hostname, port } = window.location;

  // On static-only hosts (Netlify, Vercel, etc.) do NOT guess backend URL
  if (isStaticOnlyHost(hostname)) {
    return null;
  }

  // On tunnel hosts accessing production server, backend is at same URL (same port)
  // Production server serves both frontend and backend on port 3001
  if (isTunnelHost(hostname)) {
    // The tunnel forwards to the production server which handles both
    return `${protocol}//${hostname}`;
  }

  // Development mode: frontend on 517x/4173, backend on 3001
  if (port.startsWith('517') || port === '4173') {
    return `${protocol}//${hostname}:3001`;
  }

  // Production mode: same server serves both (port 3001 or any custom port)
  return `${protocol}//${hostname}${port ? ':' + port : ''}`;
};

function urlHostname(urlStr) {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return '';
  }
}

async function resolveBackendUrl() {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const configUrl = `${base}config.json`;
    const res = await fetch(configUrl, { cache: 'no-store' });
    if (res.ok) {
      const config = await res.json();
      if (config.backendUrl && typeof config.backendUrl === 'string' && config.backendUrl.trim() !== '') {
        const url = config.backendUrl.trim().replace(/\/$/, '');
        const configHost = urlHostname(url);
        const currentHost = window.location.hostname;
        // If config points at same host (e.g. Netlify URL with :3001), treat as no backend and use browser mode
        // Exception: tunnel hosts can serve both frontend and backend on same URL
        if (configHost && (configHost === currentHost || isStaticOnlyHost(configHost)) && !isTunnelHost(configHost)) {
          console.log('🔌 Backend URL is same/static host, using browser mode');
          return null;
        }
        console.log('🔌 Backend URL from config.json:', url);
        return url;
      }
    }
  } catch (e) {
    console.log('No config.json or invalid, using auto-detect');
  }
  const url = getBackendUrlFallback();
  if (url) console.log('🔌 Backend URL (auto):', url);
  return url;
}

function createSocket(backendUrl) {
  return io(backendUrl, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['polling', 'websocket'],
    upgrade: true,
    rememberUpgrade: true,
    forceNew: false
  });
}

const translations = {
  en: {
    title: "System Resources",
    subtitle: "Premium real-time telemetry and resource usage tracking",
    liveStatus: "Active Stream",
    memory: "Dynamic RAM",
    cpu: "Processor Load",
    cpuSubtitle: "Real-time system-wide processing",
    network: "Network Flow",
    networkSubtitle: "Current high-speed throughput",
    chartTitle: "Data Trajectory",
    chartSubtitle: "Visualizing upload and download history",
    footer: "ReaderBy LiquidOS v2.0 • Designed by OBi • Status: Protected",
    initializing: "Synchronizing Liquid Core...",
    download: "Downlink",
    upload: "Uplink",
    langButton: "ES",
    internetSpeed: "Connectivity Velocity",
    testing: "Probing...",
    mbps: "Mbps",
    temperature: "Thermal",
    fanSpeed: "Ventilation",
    disk: "Storage Capacity",
    battery: "Energy Level",
    charging: "Charging",
    discharging: "On Battery",
    remoteTitle: "Cross-Device Sync",
    browserMode: "Browser mode",
    remoteDesc: "Access this dashboard from any device on your network:",
    modalTitle: "System Synchronization",
    modalBody: "To enable real-time telemetry and resource reading across your network, please authorize data stream synchronization.",
    modalBtn: "Launch Dashboard",
    // New Interface
    gamePerformanceTitle: "Game Performance",
    gameSettingsLabel: "Settings:",
    pcRatingTitle: "PC Rating Interface",
    selectCpu: "Select CPU",
    selectCpuPlaceholder: "-- Select CPU --",
    selectGpu: "Select GPU",
    selectGpuPlaceholder: "-- Select GPU --",
    selectRam: "Select RAM",
    selectRamPlaceholder: "-- Select RAM --",
    calcScoreBtn: "Calculate Performance Score",
    perfScoreLabel: "Performance Score",
    userConfigsTitle: "User Configurations",
    scoreColumn: "Score",
    perfExcellent: "Excellent",
    perfGood: "Good",
    perfAverage: "Average",
    perfPoor: "Below Average",
    gameUltra: "Ultra",
    gameHigh: "High",
    gameMedium: "Medium",
    gameLow: "Low",
    gameUnplayable: "Unplayable",
    // Performance Score section
    perfScoreTitle: "Performance Score",
    perfScoreDesc: "System benchmark based on live hardware data",
    perfBreakdownTitle: "Score Breakdown",
    perfCpuLabel: "CPU",
    perfGpuLabel: "GPU",
    perfRamLabel: "RAM",
    perfTierLabel: "Tier",
    perfTierGaming: "Gaming Ready",
    perfTierWorkstation: "Workstation",
    perfTierBasic: "Basic Use",
    perfTierEntry: "Entry Level",
    perfMaxScore: "out of 100"
  },
  es: {
    title: "Recursos del Sistema",
    subtitle: "Telemetría premium en tiempo real y seguimiento de recursos",
    liveStatus: "Transmisión Activa",
    memory: "RAM Dinámica",
    cpu: "Carga del Procesador",
    cpuSubtitle: "Procesamiento del sistema en tiempo real",
    network: "Flujo de Red",
    networkSubtitle: "Rendimiento actual de alta velocidad",
    chartTitle: "Trayectoria de Datos",
    chartSubtitle: "Visualizando historial de subida y bajada",
    footer: "ReaderBy LiquidOS v2.0 • Diseñado por OBi • Estado: Protegido",
    initializing: "Sincronizando Núcleo Líquido...",
    download: "Bajada",
    upload: "Subida",
    langButton: "EN",
    internetSpeed: "Velocidad de Conexión",
    testing: "Sondeando...",
    mbps: "Mbps",
    temperature: "Térmico",
    fanSpeed: "Ventilación",
    disk: "Capacidad de Disco",
    battery: "Nivel de Batería",
    charging: "Cargando",
    discharging: "Con Batería",
    remoteTitle: "Sincronización Multi-Dispositivo",
    browserMode: "Modo navegador",
    remoteDesc: "Acceda a este panel desde cualquier dispositivo en su red:",
    modalTitle: "Sincronización del Sistema",
    modalBody: "Para habilitar la telemetría en tiempo real y la lectura de recursos en su red, autorice la sincronización del flujo de datos.",
    modalBtn: "Iniciar Panel",
    // New Interface
    gamePerformanceTitle: "Rendimiento en Juegos",
    gameSettingsLabel: "Ajustes:",
    pcRatingTitle: "Interfaz de Calificación PC",
    selectCpu: "Seleccionar CPU",
    selectCpuPlaceholder: "-- Seleccionar CPU --",
    selectGpu: "Seleccionar GPU",
    selectGpuPlaceholder: "-- Seleccionar GPU --",
    selectRam: "Seleccionar RAM",
    selectRamPlaceholder: "-- Seleccionar RAM --",
    calcScoreBtn: "Calcular Puntuación de Rendimiento",
    perfScoreLabel: "Puntuación de Rendimiento",
    userConfigsTitle: "Configuraciones de Usuario",
    scoreColumn: "Puntuación",
    perfExcellent: "Excelente",
    perfGood: "Bueno",
    perfAverage: "Promedio",
    perfPoor: "Por Debajo del Promedio",
    gameUltra: "Ultra",
    gameHigh: "Alto",
    gameMedium: "Medio",
    gameLow: "Bajo",
    gameUnplayable: "Injugable",
    // Performance Score section
    perfScoreTitle: "Puntuación de Rendimiento",
    perfScoreDesc: "Benchmark del sistema basado en datos de hardware en vivo",
    perfBreakdownTitle: "Desglose de Puntuación",
    perfCpuLabel: "CPU",
    perfGpuLabel: "GPU",
    perfRamLabel: "RAM",
    perfTierLabel: "Nivel",
    perfTierGaming: "Listo para Gaming",
    perfTierWorkstation: "Estación de Trabajo",
    perfTierBasic: "Uso Básico",
    perfTierEntry: "Nivel Inicial",
    perfMaxScore: "de 100"
  }
};

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const calculatePerformanceScore = (cpu, gpu, memory) => {
  let score = 0;

  // CPU scoring (max 50 points)
  if (cpu) {
    let cpuScore = 15; // Base score

    // Cores and threads (max 15)
    const cores = cpu.cores || 0;
    const threads = cpu.threads || 0;
    let coreScore = (cores * 1.5) + ((threads - cores) * 0.5);
    cpuScore += Math.min(coreScore, 15);

    // Clock speed (max 5 points)
    const speed = cpu.speed || 0;
    cpuScore += Math.min(speed, 5);

    // Model-based scoring (max 15 points)
    const cpuModel = (cpu.model || '').toLowerCase();
    if (cpuModel.includes('i9') || cpuModel.includes('ryzen 9') || cpuModel.includes('m1 ultra') || cpuModel.includes('m2 ultra')) {
      cpuScore += 15;
    } else if (cpuModel.includes('i7') || cpuModel.includes('ryzen 7') || cpuModel.includes('m1 pro') || cpuModel.includes('m2 pro')) {
      cpuScore += 12;
    } else if (cpuModel.includes('i5') || cpuModel.includes('ryzen 5') || cpuModel.includes('m1') || cpuModel.includes('m2')) {
      cpuScore += 8;
    } else {
      cpuScore += 4;
    }

    score += Math.min(cpuScore, 50);
  }

  // GPU scoring (max 30 points)
  if (gpu) {
    let gpuScore = 5; // Base score

    // VRAM scoring (max 10 points)
    const vram = gpu.vram || 0;
    let vramGB = vram / (1024 * 1024 * 1024);
    gpuScore += Math.min(vramGB * 0.5, 10);

    // Vendor and model scoring (max 15 points)
    const gpuVendor = (gpu.vendor || '').toLowerCase();
    const gpuModel = (gpu.model || '').toLowerCase();

    if (gpuVendor.includes('nvidia')) {
      if (gpuModel.includes('rtx 4090') || gpuModel.includes('rtx 3090')) gpuScore += 15;
      else if (gpuModel.includes('rtx 4080') || gpuModel.includes('rtx 3080')) gpuScore += 13;
      else if (gpuModel.includes('rtx 4070') || gpuModel.includes('rtx 3070')) gpuScore += 11;
      else if (gpuModel.includes('rtx 4060') || gpuModel.includes('rtx 3060')) gpuScore += 9;
      else gpuScore += 5;
    } else if (gpuVendor.includes('amd')) {
      if (gpuModel.includes('rx 7900') || gpuModel.includes('rx 6900')) gpuScore += 14;
      else if (gpuModel.includes('rx 7800') || gpuModel.includes('rx 6800')) gpuScore += 12;
      else if (gpuModel.includes('rx 7700') || gpuModel.includes('rx 6700')) gpuScore += 10;
      else if (gpuModel.includes('rx 7600') || gpuModel.includes('rx 6600')) gpuScore += 8;
      else gpuScore += 4;
    } else if (gpuVendor.includes('intel')) {
      if (gpuModel.includes('arc a7') || gpuModel.includes('uhd 770')) gpuScore += 8;
      else gpuScore += 3;
    }

    score += Math.min(gpuScore, 30);
  }

  // Memory scoring (max 20 points)
  if (memory) {
    const memoryGB = (memory.total || 0) / (1024 * 1024 * 1024);
    let memScore = 0;
    if (memoryGB >= 64) memScore = 20;
    else if (memoryGB >= 32) memScore = 18;
    else if (memoryGB >= 16) memScore = 14;
    else if (memoryGB >= 8) memScore = 8;
    else if (memoryGB >= 4) memScore = 4;

    score += Math.min(memScore, 20);
  }

  // Normalize score to 0-100 scale
  return Math.min(Math.max(Math.round(score), 0), 100);
};

const generateMockConfigurations = () => {
  return [
    {
      id: 1,
      cpu_model: 'Intel Core i9-12900K',
      cpu_cores: 16,
      cpu_threads: 24,
      cpu_speed: 3.2,
      gpu_model: 'NVIDIA GeForce RTX 4090',
      gpu_vendor: 'NVIDIA',
      gpu_vram: 24 * 1024 * 1024 * 1024,
      memory_total: 32 * 1024 * 1024 * 1024,
      performance_score: 95,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()
    },
    {
      id: 2,
      cpu_model: 'AMD Ryzen 9 5900X',
      cpu_cores: 12,
      cpu_threads: 24,
      cpu_speed: 3.7,
      gpu_model: 'NVIDIA GeForce RTX 3080',
      gpu_vendor: 'NVIDIA',
      gpu_vram: 10 * 1024 * 1024 * 1024,
      memory_total: 16 * 1024 * 1024 * 1024,
      performance_score: 85,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
    },
    {
      id: 3,
      cpu_model: 'Intel Core i7-11700K',
      cpu_cores: 8,
      cpu_threads: 16,
      cpu_speed: 3.6,
      gpu_model: 'NVIDIA GeForce RTX 3070',
      gpu_vendor: 'NVIDIA',
      gpu_vram: 8 * 1024 * 1024 * 1024,
      memory_total: 16 * 1024 * 1024 * 1024,
      performance_score: 75,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
    },
    {
      id: 4,
      cpu_model: 'AMD Ryzen 5 5600X',
      cpu_cores: 6,
      cpu_threads: 12,
      cpu_speed: 3.7,
      gpu_model: 'NVIDIA GeForce RTX 3060',
      gpu_vendor: 'NVIDIA',
      gpu_vram: 12 * 1024 * 1024 * 1024,
      memory_total: 16 * 1024 * 1024 * 1024,
      performance_score: 65,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString()
    },
    {
      id: 5,
      cpu_model: 'Intel Core i5-10400',
      cpu_cores: 6,
      cpu_threads: 12,
      cpu_speed: 2.9,
      gpu_model: 'NVIDIA GeForce GTX 1660',
      gpu_vendor: 'NVIDIA',
      gpu_vram: 6 * 1024 * 1024 * 1024,
      memory_total: 16 * 1024 * 1024 * 1024,
      performance_score: 55,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
    }
  ];
};

const calculateGamePerformance = (performanceScore) => {
  // Games and their recommended performance scores for different settings
  const games = [
    {
      name: 'Fortnite',
      low: 40,
      medium: 60,
      high: 80,
      ultra: 95
    },
    {
      name: 'Call of Duty: Warzone',
      low: 45,
      medium: 65,
      high: 85,
      ultra: 98
    },
    {
      name: 'Cyberpunk 2077',
      low: 50,
      medium: 70,
      high: 90,
      ultra: 100
    },
    {
      name: 'Minecraft',
      low: 30,
      medium: 50,
      high: 70,
      ultra: 90
    },
    {
      name: 'Valorant',
      low: 35,
      medium: 55,
      high: 75,
      ultra: 90
    },
    {
      name: 'Grand Theft Auto V',
      low: 40,
      medium: 60,
      high: 80,
      ultra: 95
    }
  ];

  // Calculate performance level for each game
  return games.map(game => {
    let settings;
    if (performanceScore >= game.ultra) {
      settings = 'Ultra';
    } else if (performanceScore >= game.high) {
      settings = 'High';
    } else if (performanceScore >= game.medium) {
      settings = 'Medium';
    } else if (performanceScore >= game.low) {
      settings = 'Low';
    } else {
      settings = 'Unplayable';
    }

    return {
      name: game.name,
      settings,
      performance: performanceScore
    };
  });
};

const getGameSettingsColor = (settings) => {
  switch (settings) {
    case 'Ultra':
      return '#fbbf24'; // Yellow
    case 'High':
      return '#10b981'; // Green
    case 'Medium':
      return '#3b82f6'; // Blue
    case 'Low':
      return '#f59e0b'; // Orange
    case 'Unplayable':
      return '#ef4444'; // Red
    default:
      return 'var(--text-secondary)';
  }
};

const getScoreColor = (score) => {
  if (score >= 90) return '#10b981'; // Green (Excellent)
  if (score >= 70) return '#3b82f6'; // Blue (Good)
  if (score >= 50) return '#f59e0b'; // Orange (Average)
  return '#ef4444'; // Red (Below Average)
};

const formatSpeed = (bytes) => {
  return formatBytes(bytes) + '/s';
};

const PermissionModal = ({ onGrant, t }) => (
  <motion.div
    className="modal-overlay"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <motion.div
      className="glass-card modal-content"
      initial={{ scale: 0.85, y: 50 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.85, y: 50, opacity: 0 }}
    >
      <div style={{ marginBottom: '32px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 0 30px var(--glow)'
          }}
        >
          <ShieldCheck size={40} color="white" />
        </motion.div>
        <h2 style={{ fontSize: '2rem', marginBottom: '16px', color: 'var(--text-primary)' }}>{t.modalTitle}</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '1rem' }}>{t.modalBody}</p>
      </div>
      <button className="btn-primary" onClick={onGrant}>
        {t.modalBtn}
      </button>
    </motion.div>
  </motion.div>
);

const getClientDeviceName = () => {
  const ua = navigator.userAgent;
  let device = "Browser Client";

  if (/android/i.test(ua)) {
    device = "Android Device";
    const androidMatch = ua.match(/Android.*?; (.*?) (Build|AppleWebKit)/);
    if (androidMatch && androidMatch[1]) device = `Android (${androidMatch[1].trim()})`;
  } else if (/iPad|iPhone|iPod/.test(ua)) {
    device = /iPad/.test(ua) ? "iPad" : "iPhone";
  } else if (/Macintosh/.test(ua)) {
    device = "Mac";
  } else if (/Windows/.test(ua)) {
    device = "Windows PC";
  } else if (/Linux/.test(ua)) {
    device = "Linux PC";
  }

  return device;
};

const getClientGPU = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return { vendor, renderer };
      }
    }
  } catch (e) { }
  return { vendor: 'Mobile GPU', renderer: 'Integrated Graphics' };
};

const isMobileClient = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const App = () => {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [showModal, setShowModal] = useState(false);
  const [performanceScore, setPerformanceScore] = useState(0);
  const [gamePerformance, setGamePerformance] = useState([]);
  const [configurations, setConfigurations] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [resolvedBackendUrl, setResolvedBackendUrl] = useState(null);
  const [isClientOnlyMode, setIsClientOnlyMode] = useState(false);
  const [clientDeviceName, setClientDeviceName] = useState('Browser Client');
  const [clientHardware, setClientHardware] = useState({ gpu: null, cpu: null });
  const [clientDiskStats, setClientDiskStats] = useState(null);
  const clientStatsIntervalRef = useRef(null);
  const socketRef = useRef(null);
  const { width } = useWindowSize();
  const isMobile = width < 768;

  const t = translations[lang];

  // Handler for CPU selection
  const handleCpuChange = (cpuModel) => {
    if (!cpuModel) {
      setSelectedConfig(prev => ({ ...prev, cpu: null, cpu_model: '' }));
      return;
    }

    // Get CPU details based on model
    let cpuDetails = {
      model: cpuModel,
      cores: 8,
      threads: 16,
      speed: 3.6
    };

    if (cpuModel === 'Intel Core i9-12900K') {
      cpuDetails = {
        model: cpuModel,
        cores: 16,
        threads: 24,
        speed: 3.2
      };
    } else if (cpuModel === 'AMD Ryzen 9 5900X') {
      cpuDetails = {
        model: cpuModel,
        cores: 12,
        threads: 24,
        speed: 3.7
      };
    } else if (cpuModel === 'Intel Core i7-11700K') {
      cpuDetails = {
        model: cpuModel,
        cores: 8,
        threads: 16,
        speed: 3.6
      };
    } else if (cpuModel === 'AMD Ryzen 5 5600X') {
      cpuDetails = {
        model: cpuModel,
        cores: 6,
        threads: 12,
        speed: 3.7
      };
    } else if (cpuModel === 'Intel Core i5-10400') {
      cpuDetails = {
        model: cpuModel,
        cores: 6,
        threads: 12,
        speed: 2.9
      };
    }

    setSelectedConfig(prev => ({
      ...prev,
      cpu: cpuDetails,
      cpu_model: cpuModel
    }));
  };

  // Handler for GPU selection
  const handleGpuChange = (gpuModel) => {
    if (!gpuModel) {
      setSelectedConfig(prev => ({ ...prev, gpu: null, gpu_model: '' }));
      return;
    }

    // Get GPU details based on model
    let gpuDetails = {
      model: gpuModel,
      vendor: 'NVIDIA',
      vram: 8 * 1024 * 1024 * 1024
    };

    if (gpuModel === 'NVIDIA GeForce RTX 4090') {
      gpuDetails = {
        model: gpuModel,
        vendor: 'NVIDIA',
        vram: 24 * 1024 * 1024 * 1024
      };
    } else if (gpuModel === 'NVIDIA GeForce RTX 3080') {
      gpuDetails = {
        model: gpuModel,
        vendor: 'NVIDIA',
        vram: 10 * 1024 * 1024 * 1024
      };
    } else if (gpuModel === 'NVIDIA GeForce RTX 3070') {
      gpuDetails = {
        model: gpuModel,
        vendor: 'NVIDIA',
        vram: 8 * 1024 * 1024 * 1024
      };
    } else if (gpuModel === 'NVIDIA GeForce RTX 3060') {
      gpuDetails = {
        model: gpuModel,
        vendor: 'NVIDIA',
        vram: 12 * 1024 * 1024 * 1024
      };
    } else if (gpuModel === 'NVIDIA GeForce GTX 1660') {
      gpuDetails = {
        model: gpuModel,
        vendor: 'NVIDIA',
        vram: 6 * 1024 * 1024 * 1024
      };
    }

    setSelectedConfig(prev => ({
      ...prev,
      gpu: gpuDetails,
      gpu_model: gpuModel
    }));
  };

  // Handler for RAM selection
  const handleRamChange = (ramGB) => {
    if (!ramGB) {
      setSelectedConfig(prev => ({ ...prev, memory: null, memory_total: null }));
      return;
    }
    const totalMemory = parseInt(ramGB) * 1024 * 1024 * 1024;
    setSelectedConfig(prev => ({
      ...prev,
      memory: {
        total: totalMemory
      },
      memory_total: totalMemory
    }));
  };

  // Calculate performance score for selected config
  const calculateConfigScore = () => {
    if (selectedConfig && selectedConfig.cpu && selectedConfig.gpu && selectedConfig.memory) {
      const score = calculatePerformanceScore(selectedConfig.cpu, selectedConfig.gpu, selectedConfig.memory);

      const newConfigWithScore = {
        ...selectedConfig,
        performance_score: score
      };

      setSelectedConfig(newConfigWithScore);

      // Add to configurations table at the top
      setConfigurations(prev => [
        {
          id: Date.now(),
          cpu_model: selectedConfig.cpu_model,
          cpu_cores: selectedConfig.cpu.cores,
          cpu_threads: selectedConfig.cpu.threads,
          gpu_model: selectedConfig.gpu_model,
          gpu_vram: selectedConfig.gpu.vram,
          memory_total: selectedConfig.memory_total,
          performance_score: score
        },
        ...prev
      ]);
    }
  };

  // Get performance level based on score
  const getPerformanceLevel = (score, t) => {
    if (score >= 90) return t.perfExcellent;
    if (score >= 70) return t.perfGood;
    if (score >= 50) return t.perfAverage;
    return t.perfPoor;
  };

  useEffect(() => {
    // Theme initialization
    const savedTheme = localStorage.getItem('readerby_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const hasPermission = localStorage.getItem('readerby_permission');
    if (hasPermission === 'true') {
      setPermissionGranted(true);
    } else {
      setShowModal(true);
    }

    const deviceName = getClientDeviceName();
    setClientDeviceName(deviceName);

    if (isMobileClient()) {
      const gpuInfo = getClientGPU();
      setClientHardware({
        gpu: gpuInfo,
        cpu: { model: `${deviceName} SOC`, cores: navigator.hardwareConcurrency || 'Unknown' }
      });

      // Fetch real browser storage estimate for mobile devices
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
          const quota = estimate.quota || 0;
          const usage = estimate.usage || 0;
          setClientDiskStats({
            quota,
            usage,
            available: quota - usage,
            pct: quota > 0 ? (usage / quota) * 100 : 0
          });
        }).catch(() => { });
      }
    }

    // Initialize configurations with mock data
    const mockConfigs = generateMockConfigurations();
    setConfigurations(mockConfigs);

    let socket = null;

    (async () => {
      const backendUrl = await resolveBackendUrl();
      setResolvedBackendUrl(backendUrl || '');

      if (!backendUrl) {
        // No backend configured: use client-side stats so the app works (Netlify, Vercel, etc.)
        // Browser mode works on any host - no need to show "backend required" error
        setIsClientOnlyMode(true);
        setConnectionStatus('connected');
        const tick = () => {
          collectClientStats().then(data => {
            setStats(data);
            const score = calculatePerformanceScore(data.cpu, data.gpu, data.memory);
            setPerformanceScore(score);
            const gamePerf = calculateGamePerformance(score);
            setGamePerformance(gamePerf);
            setHistory(prev => {
              const next = [...prev, {
                time: new Date(data.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                download: data.network.rx_sec,
                upload: data.network.tx_sec,
                cpu: data.cpu.currentLoad,
                memory: data.memory.percentage
              }];
              return next.slice(-20);
            });
          }).catch(err => {
            console.error('Failed to collect client stats:', err);
          });
        };
        tick();
        clientStatsIntervalRef.current = setInterval(tick, 1000);
        return;
      }

      socket = createSocket(backendUrl);
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Connected to server:', backendUrl);
        setConnectionStatus('connected');
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from server:', reason);
        setConnectionStatus('disconnected');
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error.message);
        setConnectionStatus('error');
        if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch')) {
          console.warn('💡 For access from another network, set backend URL in public/config.json (backendUrl) or forward port 3001.');
        }
      });

      socket.on('reconnect_attempt', () => setConnectionStatus('connecting'));
      socket.on('reconnect', () => setConnectionStatus('connected'));
      socket.on('reconnect_failed', () => setConnectionStatus('error'));

      socket.on('stats', (data) => {
        setStats(data);
        const score = calculatePerformanceScore(data.cpu, data.gpu, data.memory);
        setPerformanceScore(score);
        const gamePerf = calculateGamePerformance(score);
        setGamePerformance(gamePerf);
        setHistory(prev => {
          const newHistory = [...prev, {
            time: new Date(data.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            download: data.network.rx_sec,
            upload: data.network.tx_sec,
            cpu: data.cpu.currentLoad,
            memory: data.memory.percentage
          }];
          return newHistory.slice(-20);
        });
      });
    })();

    return () => {
      if (clientStatsIntervalRef.current) {
        clearInterval(clientStatsIntervalRef.current);
        clientStatsIntervalRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.off('stats');
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
        socketRef.current.off('reconnect_attempt');
        socketRef.current.off('reconnect');
        socketRef.current.off('reconnect_failed');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);


  const toggleLang = () => {
    setLang(prev => prev === 'en' ? 'es' : 'en');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('readerby_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const grantPermission = () => {
    localStorage.setItem('readerby_permission', 'true');
    setPermissionGranted(true);
    setShowModal(false);
  };

  if (!permissionGranted) {
    return (
      <div style={{ position: 'relative', overflow: 'hidden', height: '100vh', background: 'var(--background)' }}>
        <div className="bg-blob" style={{ top: '10%', left: '10%' }}></div>
        <div className="bg-blob-2"></div>
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <AnimatePresence>
            {showModal && <PermissionModal t={t} onGrant={grantPermission} />}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (!stats) {
    const getStatusMessage = () => {
      switch (connectionStatus) {
        case 'connecting':
          return t.initializing;
        case 'error':
          return 'Connection Error - Check backend server';
        case 'disconnected':
          return 'Disconnected - Reconnecting...';
        default:
          return t.initializing;
      }
    };

    const getStatusColor = () => {
      switch (connectionStatus) {
        case 'error':
          return '#ef4444';
        case 'disconnected':
          return '#f59e0b';
        default:
          return 'var(--accent-primary)';
      }
    };

    return (
      <div style={{ background: 'var(--background)', minHeight: '100vh' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <div className="header">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Activity size={80} color={getStatusColor()} />
            </motion.div>
            <p style={{ marginTop: '32px', color: 'var(--text-secondary)', letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.8rem' }}>
              {getStatusMessage()}
            </p>
            {connectionStatus === 'error' && (
              <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid var(--card-border)', maxWidth: '420px', textAlign: 'left' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Backend: {resolvedBackendUrl || 'not set'}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                  Set your backend URL in <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>config.json</code> (backendUrl) or ensure the backend server is running and port 3001 is reachable.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', position: 'relative' }}>


      <div className="bg-blob" style={{ top: '5%', left: '5%' }}></div>
      <div className="bg-blob-2" style={{ bottom: '10%', right: '5%' }}></div>
      <div className="bg-blob" style={{ top: '60%', left: '40%', width: '300px', height: '300px', opacity: 0.1, background: 'radial-gradient(circle, var(--accent-secondary) 0%, transparent 70%)' }}></div>

      <div className="container">
        <header className="header">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div className="badge">
                <span className="live-indicator"></span>
                {t.liveStatus}
              </div>
              {isClientOnlyMode && (
                <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.15)', borderColor: 'rgba(6, 182, 212, 0.3)', color: 'var(--accent-secondary)', fontSize: '0.65rem' }}>
                  {t.browserMode}
                </span>
              )}
            </div>
            <h1>{t.title}</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '1.1rem' }}>{t.subtitle}</p>
            {/* Device Info Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '8px' }}>
              {/* Server info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--liquid-glass)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '8px 14px' }}>
                <Activity size={13} color="var(--accent-primary)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Server</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>{stats.device?.hostname}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{stats.device?.model} • {stats.device?.distro}</div>
                </div>
              </div>
              {/* Client info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--liquid-glass)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '8px 14px' }}>
                <Smartphone size={13} color="var(--accent-secondary)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Client</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>{clientDeviceName}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    {navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} Cores` : ''}
                    {navigator.deviceMemory ? ` • ${navigator.deviceMemory} GB RAM` : ''}
                    {navigator.connection?.effectiveType ? ` • ${navigator.connection.effectiveType.toUpperCase()}` : ''}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </header>

        <div className="grid">
          {/* RAM Block */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-label">{t.memory}</div>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.1)' }}>
                <Database size={20} color="var(--accent-primary)" />
              </div>
            </div>
            <div className="stat-value">{stats.memory?.percentage?.toFixed(1) || '0.0'}%</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500' }}>
              {formatBytes(stats.memory?.active || 0)} <span style={{ opacity: 0.5 }}>/</span> {formatBytes(stats.memory?.total || 0)}
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${stats.memory?.percentage || 0}%` }}
              ></div>
            </div>
          </motion.div>

          {/* CPU Block */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-label">{t.cpu}</div>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)' }}>
                <Cpu size={20} color="var(--accent-secondary)" />
              </div>
            </div>
            <div className="stat-value" style={{ background: 'linear-gradient(45deg, var(--text-primary), var(--accent-secondary))', WebkitBackgroundClip: 'text' }}>
              {stats.cpu?.currentLoad?.toFixed(1) || '0.0'}%
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--liquid-glass)', padding: '6px 12px', borderRadius: '12px' }}>
                <Thermometer size={14} color={stats.cpu?.temp > 70 ? "#ef4444" : "var(--accent-secondary)"} />
                <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{stats.cpu?.temp?.toFixed(0)}°</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '800' }}>C</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--liquid-glass)', padding: '6px 12px', borderRadius: '12px' }}>
                <Wind size={14} color="#38bdf8" />
                <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{Math.round(stats.cpu?.fans?.[0] || 0)}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '800' }}>RPM</span>
              </div>
            </div>

            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${stats.cpu?.currentLoad || 0}%`,
                  background: 'linear-gradient(to right, #0ea5e9, var(--accent-secondary))'
                }}
              ></div>
            </div>
          </motion.div>

          {/* CPU Block */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-label">CPU</div>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)' }}>
                <Cpu size={20} color="#ef4444" />
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px' }}>
                {isMobileClient() && clientHardware.cpu?.model !== 'Browser Client SOC' ? clientHardware.cpu?.model : (stats.cpu?.model || 'Unknown')}
              </div>
              <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                {isMobileClient() && clientHardware.cpu?.cores !== 'Unknown' && (
                  <div style={{ color: 'var(--accent-secondary)' }}>{clientHardware.cpu?.cores} Cores (Client)</div>
                )}
                <div>{stats.cpu?.cores || 0} Cores (Server)</div>
                <div>{stats.cpu?.threads || 0} Threads</div>
                <div>{stats.cpu?.speed?.toFixed(1) || 0} GHz</div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${stats.cpu?.currentLoad || 0}%`,
                      background: 'linear-gradient(to right, #ef4444, #dc2626)'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* GPU Block */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-label">GPU</div>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)' }}>
                <Activity size={20} color="#22c55e" />
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px' }}>
                {isMobileClient() && clientHardware.gpu?.renderer !== 'Integrated Graphics' ? clientHardware.gpu?.renderer : (stats.gpu?.model || 'Unknown')}
              </div>
              <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                {isMobileClient() && clientHardware.gpu?.vendor !== 'Mobile GPU' && (
                  <div style={{ color: 'var(--accent-secondary)' }}>{clientHardware.gpu?.vendor} (Client)</div>
                )}
                <div>{stats.gpu?.vendor || 'Unknown'} (Server)</div>
                <div>{formatBytes(stats.gpu?.vram || 0)} VRAM</div>
                {stats.gpu?.bus && stats.gpu.bus !== 'Unknown' && <div>Bus: {stats.gpu.bus}</div>}
              </div>
              {(stats.gpu?.cores || stats.gpu?.temperatureGpu !== undefined) && (
                <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
                  {stats.gpu?.temperatureGpu !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--liquid-glass)', padding: '6px 12px', borderRadius: '12px' }}>
                      <Thermometer size={14} color={stats.gpu?.temperatureGpu > 75 ? "#ef4444" : "#22c55e"} />
                      <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{stats.gpu?.temperatureGpu}°</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '800' }}>C</span>
                    </div>
                  )}
                  {stats.gpu?.cores && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--liquid-glass)', padding: '6px 12px', borderRadius: '12px' }}>
                      <Cpu size={14} color="#22c55e" />
                      <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{stats.gpu?.cores}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '800' }}>CORES</span>
                    </div>
                  )}
                </div>
              )}
              {stats.gpu?.displays && stats.gpu.displays.length > 0 && (
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>Displays</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.gpu.displays.map((display, idx) => (
                      <div key={idx} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '8px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{display.model || `Display ${idx + 1}`}</div>
                        <div style={{ color: 'var(--accent-secondary)' }}>
                          {display.resolutionx}x{display.resolutiony} {display.refreshRate ? `@ ${display.refreshRate}Hz` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Performance Score Block */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{t.perfScoreTitle}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px', letterSpacing: '0.05em' }}>{t.perfScoreDesc}</div>
              </div>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.1)' }}>
                <Zap size={20} color="#fbbf24" />
              </div>
            </div>

            {/* Main score display */}
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'flex-end', gap: '12px', justifyContent: 'center' }}>
              <div style={{ fontSize: '4.5rem', fontWeight: '800', color: getScoreColor(performanceScore), lineHeight: 1, filter: `drop-shadow(0 0 20px ${getScoreColor(performanceScore)}55)` }}>
                {performanceScore}
              </div>
              <div style={{ paddingBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t.perfMaxScore}</div>
            </div>

            {/* Tier badge */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
              <span style={{
                padding: '4px 16px',
                borderRadius: '100px',
                fontSize: '0.75rem',
                fontWeight: '700',
                background: performanceScore >= 85 ? 'rgba(251,191,36,0.15)' : performanceScore >= 65 ? 'rgba(16,185,129,0.15)' : performanceScore >= 45 ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                color: getScoreColor(performanceScore),
                border: `1px solid ${getScoreColor(performanceScore)}44`,
                textTransform: 'uppercase',
                letterSpacing: '0.12em'
              }}>
                {performanceScore >= 85 ? t.perfTierGaming : performanceScore >= 65 ? t.perfTierWorkstation : performanceScore >= 45 ? t.perfTierBasic : t.perfTierEntry}
              </span>
            </div>

            {/* Progress bar */}
            <div className="progress-bar-container" style={{ marginTop: '16px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${performanceScore}%`,
                  background: performanceScore >= 90 ? 'linear-gradient(to right, #fbbf24, #f59e0b)' :
                    performanceScore >= 70 ? 'linear-gradient(to right, #10b981, #059669)' :
                      performanceScore >= 50 ? 'linear-gradient(to right, #3b82f6, #2563eb)' :
                        'linear-gradient(to right, #ef4444, #dc2626)'
                }}
              ></div>
            </div>

            {/* Score Breakdown */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>
                {t.perfBreakdownTitle}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* CPU row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Cpu size={13} color="var(--accent-secondary)" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '32px', flexShrink: 0 }}>{t.perfCpuLabel}</div>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(((performanceScore * 0.5) / 50) * 100, 100)}%`, background: 'linear-gradient(to right, #0ea5e9, var(--accent-secondary))', borderRadius: '100px', transition: 'width 1s ease' }}></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', width: '30px', textAlign: 'right', color: 'var(--accent-secondary)' }}>
                    {Math.round(performanceScore * 0.5)}<span style={{ fontSize: '0.6rem', opacity: 0.6 }}>/50</span>
                  </div>
                </div>
                {/* GPU row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Activity size={13} color="#22c55e" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '32px', flexShrink: 0 }}>{t.perfGpuLabel}</div>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(((performanceScore * 0.3) / 30) * 100, 100)}%`, background: 'linear-gradient(to right, #22c55e, #059669)', borderRadius: '100px', transition: 'width 1s ease' }}></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', width: '30px', textAlign: 'right', color: '#22c55e' }}>
                    {Math.round(performanceScore * 0.3)}<span style={{ fontSize: '0.6rem', opacity: 0.6 }}>/30</span>
                  </div>
                </div>
                {/* RAM row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Database size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '32px', flexShrink: 0 }}>{t.perfRamLabel}</div>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(((performanceScore * 0.2) / 20) * 100, 100)}%`, background: 'linear-gradient(to right, var(--accent-primary), #7c3aed)', borderRadius: '100px', transition: 'width 1s ease' }}></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', width: '30px', textAlign: 'right', color: 'var(--accent-primary)' }}>
                    {Math.round(performanceScore * 0.2)}<span style={{ fontSize: '0.6rem', opacity: 0.6 }}>/20</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live hardware summary */}
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.6 }}>{t.perfCpuLabel}</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.72rem', textAlign: 'right', maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stats.cpu?.model || '—'}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.6 }}>{t.perfGpuLabel}</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.72rem', textAlign: 'right', maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stats.gpu?.model || '—'}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.6 }}>{t.perfRamLabel}</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{formatBytes(stats.memory?.total || 0)}</span>
              </div>
            </div>
          </motion.div>

          {/* Game Performance Block */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-label">{t.gamePerformanceTitle}</div>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)' }}>
                <Activity size={20} color="#a855f7" />
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                {gamePerformance.map((game, index) => (
                  <div key={index} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '4px' }}>{game.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {t.gameSettingsLabel} <span style={{ color: getGameSettingsColor(game.settings) }}>{t['game' + game.settings]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* PC Rating Interface Block */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-label">{t.pcRatingTitle}</div>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)' }}>
                <Activity size={20} color="#f59e0b" />
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px' }}>{t.selectCpu}</div>
                  <select
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                    onChange={(e) => handleCpuChange(e.target.value)}
                    value={selectedConfig?.cpu_model || ''}
                  >
                    <option value="">{t.selectCpuPlaceholder}</option>
                    <option value="Intel Core i9-12900K">Intel Core i9-12900K</option>
                    <option value="AMD Ryzen 9 5900X">AMD Ryzen 9 5900X</option>
                    <option value="Intel Core i7-11700K">Intel Core i7-11700K</option>
                    <option value="AMD Ryzen 5 5600X">AMD Ryzen 5 5600X</option>
                    <option value="Intel Core i5-10400">Intel Core i5-10400</option>
                  </select>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px' }}>{t.selectGpu}</div>
                  <select
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                    onChange={(e) => handleGpuChange(e.target.value)}
                    value={selectedConfig?.gpu_model || ''}
                  >
                    <option value="">{t.selectGpuPlaceholder}</option>
                    <option value="NVIDIA GeForce RTX 4090">NVIDIA GeForce RTX 4090</option>
                    <option value="NVIDIA GeForce RTX 3080">NVIDIA GeForce RTX 3080</option>
                    <option value="NVIDIA GeForce RTX 3070">NVIDIA GeForce RTX 3070</option>
                    <option value="NVIDIA GeForce RTX 3060">NVIDIA GeForce RTX 3060</option>
                    <option value="NVIDIA GeForce GTX 1660">NVIDIA GeForce GTX 1660</option>
                  </select>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px' }}>{t.selectRam}</div>
                  <select
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem'
                    }}
                    onChange={(e) => handleRamChange(e.target.value)}
                    value={selectedConfig?.memory_total ? (selectedConfig.memory_total / (1024 * 1024 * 1024)).toString() : ''}
                  >
                    <option value="">{t.selectRamPlaceholder}</option>
                    <option value="8">8 GB</option>
                    <option value="16">16 GB</option>
                    <option value="32">32 GB</option>
                    <option value="64">64 GB</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <button
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary))',
                    border: 'none',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease'
                  }}
                  onClick={calculateConfigScore}
                  disabled={!selectedConfig || !selectedConfig.cpu_model || !selectedConfig.gpu_model || selectedConfig.memory_total == null}
                >
                  {t.calcScoreBtn}
                </button>
              </div>
              {selectedConfig && selectedConfig.performance_score !== undefined && (
                <div style={{ marginTop: '16px', padding: '16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{t.perfScoreLabel}</div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: getScoreColor(selectedConfig.performance_score) }}>
                    {selectedConfig.performance_score}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {getPerformanceLevel(selectedConfig.performance_score, t)}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* User Configuration Comparison Block */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-label">{t.userConfigsTitle}</div>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)' }}>
                <Globe size={20} color="#3b82f6" />
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>CPU</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>GPU</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>RAM</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{t.scoreColumn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configurations.map((config, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: '600' }}>{config.cpu_model}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {config.cpu_cores} Cores / {config.cpu_threads} Threads
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: '600' }}>{config.gpu_model}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {formatBytes(config.gpu_vram || 0)} VRAM
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}>
                          {formatBytes(config.memory_total || 0)}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: '600', color: getScoreColor(config.performance_score) }}>
                            {config.performance_score}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Network Block */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-label">{t.network}</div>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)' }}>
                <Zap size={20} color="#f59e0b" />
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '6px', borderRadius: '10px' }}>
                  <Download size={14} color="var(--accent-secondary)" />
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{formatSpeed(stats.network?.rx_sec || 0)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '10px' }}>
                  <Upload size={14} color="#f87171" />
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{formatSpeed(stats.network?.tx_sec || 0)}</span>
              </div>

              <div style={{
                borderTop: '1px solid var(--card-border)',
                paddingTop: '16px',
                marginTop: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wifi size={14} color="#f59e0b" />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase' }}>{t.internetSpeed}</span>
                  </div>
                  {stats.network?.isTesting && <span className="live-indicator" style={{ width: '6px', height: '6px' }}></span>}
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '6px', color: '#f59e0b', filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.2))' }}>
                  {stats.network?.isTesting && stats.network?.internetSpeed === 0 ? t.testing : `${stats.network?.internetSpeed || 0} ${t.mbps}`}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Storage Information */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-label">{t.disk}</div>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)' }}>
                <HardDrive size={20} color="#10b981" />
              </div>
            </div>
            <div className="stat-value" style={{ fontSize: '2.5rem', marginTop: '24px' }}>
              {stats.disk?.[0]?.used?.toFixed(1) || '0.0'}%
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {formatBytes((stats.disk?.[0]?.usedBytes ?? (stats.disk?.[0]?.size * (stats.disk?.[0]?.used / 100))) || 0)}
              <span style={{ opacity: 0.4 }}> / </span>
              {formatBytes(stats.disk?.[0]?.size || 0)}
              <span style={{ opacity: 0.4 }}> &nbsp;·&nbsp; </span>
              <span style={{ color: '#10b981' }}>{formatBytes(stats.disk?.[0]?.size - (stats.disk?.[0]?.size * (stats.disk?.[0]?.used / 100)) || 0)} free</span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${stats.disk?.[0]?.used || 0}%`,
                  background: stats.disk?.[0]?.used > 80 ? 'linear-gradient(to right, #f59e0b, #ef4444)' : 'linear-gradient(to right, #10b981, #059669)'
                }}
              ></div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{stats.disk?.[0]?.fs} • {stats.disk?.[0]?.mount}</span>
              {stats.disk?.[0]?.isClientStorage && (
                <span style={{
                  background: 'rgba(6,182,212,0.1)',
                  border: '1px solid rgba(6,182,212,0.2)',
                  color: 'var(--accent-secondary)',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '0.65rem',
                  fontWeight: '700'
                }}>Browser Quota</span>
              )}
            </div>
          </motion.div>

          {/* Client Browser Storage Card — shown when on mobile with backend connected */}
          {isMobileClient() && clientDiskStats && (
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="stat-label">Device Storage</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--accent-secondary)', marginTop: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Browser Quota</div>
                </div>
                <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(6,182,212,0.1)' }}>
                  <Smartphone size={20} color="var(--accent-secondary)" />
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '2.5rem', marginTop: '24px' }}>
                {clientDiskStats.pct.toFixed(1)}%
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {formatBytes(clientDiskStats.usage)}
                <span style={{ opacity: 0.4 }}> / </span>
                {formatBytes(clientDiskStats.quota)}
                <span style={{ opacity: 0.4 }}> &nbsp;·&nbsp; </span>
                <span style={{ color: '#10b981' }}>{formatBytes(clientDiskStats.available)} free</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${clientDiskStats.pct}%`,
                    background: clientDiskStats.pct > 80 ? 'linear-gradient(to right, #f59e0b, #ef4444)' : 'linear-gradient(to right, var(--accent-secondary), #0ea5e9)'
                  }}
                ></div>
              </div>
              <div style={{ marginTop: '12px', fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                Space available for this web app on your device
              </div>
            </motion.div>
          )}

          {/* Device Power Status */}
          {stats.battery?.hasBattery && (
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="stat-label">{t.battery}</div>
                <div style={{ padding: '8px', borderRadius: '12px', background: stats.battery?.isCharging ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)' }}>
                  {stats.battery?.isCharging ? <BatteryCharging size={20} color="#3b82f6" /> : <Battery size={20} color="#f59e0b" />}
                </div>
              </div>
              <div className="stat-value" style={{ color: stats.battery?.percent < 20 ? '#ef4444' : 'inherit' }}>
                {stats.battery?.percent}%
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stats.battery?.isCharging ? '#3b82f6' : '#10b981', animation: stats.battery?.isCharging ? 'pulse 1.5s infinite' : 'none' }}></div>
                {stats.battery?.isCharging ? t.charging : t.discharging}
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${stats.battery?.percent || 0}%`,
                    background: stats.battery?.percent < 20 ? '#ef4444' : 'linear-gradient(to right, #f59e0b, #10b981)'
                  }}
                ></div>
              </div>
            </motion.div>
          )}

          {/* Connectivity Sync Card */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(6, 182, 212, 0.05))', borderColor: 'rgba(139, 92, 246, 0.2)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="stat-label">{t.remoteTitle}</div>
              <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)' }}>
                <Smartphone size={20} color="var(--accent-primary)" />
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                {t.remoteDesc}
              </p>
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '14px',
                borderRadius: '16px',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                color: 'var(--accent-secondary)',
                border: '1px solid var(--card-border)',
                letterSpacing: '0.05em',
                wordBreak: 'break-all'
              }}>
                {window.location.origin}
                {window.location.hostname === 'localhost' && stats.device?.hostname && (
                  <div style={{ marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {lang === 'en' ? 'Or use network IP:' : 'O use la IP de red:'} http://{stats.network?.localIps?.[0] || 'YOUR_IP'}:{window.location.port}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Chart Block */}
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div>
                <div className="stat-label">{t.chartTitle}</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>{t.chartSubtitle}</p>
              </div>
              <div style={{ background: 'var(--liquid-glass)', padding: '10px', borderRadius: '14px' }}>
                <Clock size={20} color="var(--text-secondary)" />
              </div>
            </div>

            <div className="chart-container" style={{ position: 'relative', height: isMobile ? '250px' : '350px' }}>
              {history.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-secondary)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="var(--text-secondary)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="var(--text-secondary)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatBytes(value, 0)}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        backdropFilter: 'blur(10px)',
                        borderColor: 'var(--card-border)',
                        borderRadius: '16px',
                        padding: '12px',
                        color: 'var(--text-primary)'
                      }}
                      itemStyle={{ fontSize: '0.9rem', fontWeight: '600' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="download"
                      stroke="var(--accent-secondary)"
                      fillOpacity={1}
                      fill="url(#colorDown)"
                      strokeWidth={4}
                      name={t.download}
                    />
                    <Area
                      type="monotone"
                      dataKey="upload"
                      stroke="#f87171"
                      fillOpacity={1}
                      fill="url(#colorUp)"
                      strokeWidth={4}
                      name={t.upload}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', letterSpacing: '0.1em' }}>
                  Wait for incoming stream...
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <footer style={{
          textAlign: 'center',
          padding: '40px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Language toggle */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleLang}
              className="badge"
              style={{ cursor: 'pointer', background: 'var(--liquid-glass)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', gap: '8px' }}
            >
              <Globe size={14} color="var(--accent-primary)" />
              {t.langButton}
            </motion.button>
            {/* Theme toggle */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="badge"
              style={{ cursor: 'pointer', background: 'var(--liquid-glass)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', gap: '8px' }}
            >
              {theme === 'dark' ? <Sun size={14} color="#fbbf24" /> : <Moon size={14} color="var(--accent-primary)" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </motion.button>
            {/* Live badge */}
            <div className="badge" style={{ background: 'var(--liquid-glass)', color: 'var(--accent-secondary)', border: '1px solid var(--card-border)' }}>
              <MousePointer2 size={12} style={{ marginRight: '6px' }} />
              Live Interactive
            </div>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '500', letterSpacing: '0.05em' }}>{t.footer}</div>
        </footer>
      </div>
    </div>
  );
};

export default App;
