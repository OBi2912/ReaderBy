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
const STATIC_ONLY_HOSTS = [
  'netlify.app',
  'netlify.com',
  'vercel.app',
  'github.io',
  'cloudflarepages.dev',
  'pages.dev',
  'web.app',
  'firebaseapp.com',
  'surge.sh',
  'loca.lt',
  'ngrok.io',
  'trycloudflare.com'
];

function isStaticOnlyHost(hostname) {
  return STATIC_ONLY_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
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
  if (port === '5173' || port === '4173') {
    return `${protocol}//${hostname}:3001`;
  }
  return `${protocol}//${hostname}:3001`;
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
        if (configHost && (configHost === currentHost || isStaticOnlyHost(configHost))) {
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
    modalBtn: "Launch Dashboard"
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
    modalBtn: "Iniciar Panel"
  }
};

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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

const App = () => {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [showModal, setShowModal] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [resolvedBackendUrl, setResolvedBackendUrl] = useState(null);
  const [staticHostNeedsBackend, setStaticHostNeedsBackend] = useState(false);
  const [isClientOnlyMode, setIsClientOnlyMode] = useState(false);
  const clientStatsIntervalRef = useRef(null);
  const socketRef = useRef(null);
  const { width } = useWindowSize();
  const isMobile = width < 768;

  const t = translations[lang];

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

    let socket = null;

    (async () => {
      const backendUrl = await resolveBackendUrl();
      setResolvedBackendUrl(backendUrl || '');

      if (!backendUrl) {
        // No backend configured: use client-side stats so the app works (Netlify, Vercel, etc.)
        setStaticHostNeedsBackend(isStaticOnlyHost(window.location.hostname));
        setIsClientOnlyMode(true);
        setConnectionStatus('connected');
        const tick = () => {
          collectClientStats().then(data => {
            setStats(data);
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
                {staticHostNeedsBackend ? (
                  <>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '12px', fontWeight: '600' }}>
                      Backend required
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                      This site is hosted on a static host (e.g. Netlify, Vercel). It only serves the frontend. The <strong>backend</strong> (Node.js server) must run on a different service.
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      1. Deploy the backend to <strong>Railway</strong>, <strong>Render</strong>, <strong>Fly.io</strong>, or any Node.js host.
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      2. In your repo, set <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>public/config.json</code> → <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>backendUrl</code> to that backend URL, then redeploy this frontend.
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                      Example: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', wordBreak: 'break-all' }}>{'"backendUrl": "https://your-app.railway.app"'}</code>
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Backend: {resolvedBackendUrl || 'not set'}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                      Set your backend URL in <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>config.json</code> (backendUrl) or ensure the backend server is running and port 3001 is reachable.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', position: 'relative' }}>
      <button className="theme-toggle" onClick={toggleTheme} title="Switch Theme">
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
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
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '1.1rem' }}>{t.subtitle}</p>
            <div style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {stats.device?.hostname} • {stats.device?.model}
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

          {/* Network Block */}
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
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
              {formatBytes(stats.disk?.[0]?.size * (stats.disk?.[0]?.used / 100) || 0)} <span style={{ opacity: 0.4 }}>/</span> {formatBytes(stats.disk?.[0]?.size || 0)}
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${stats.disk?.[0]?.used || 0}%`,
                  background: 'linear-gradient(to right, #10b981, #059669)'
                }}
              ></div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace', opacity: 0.8 }}>
              {stats.disk?.[0]?.fs} • {stats.disk?.[0]?.mount}
            </div>
          </motion.div>

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
          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleLang}
              className="badge"
              style={{
                cursor: 'pointer',
                background: 'var(--liquid-glass)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-primary)',
                gap: '8px'
              }}
            >
              <Globe size={14} color="var(--accent-primary)" />
              {t.langButton}
            </motion.button>
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
