import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { ThemeMode, DarkNuance, ThemePreferences, User } from '../types';

export interface ColorPreset {
  id: string;
  name: string;
  nameEn: string;
  hex: string;
  hoverHex: string;
  lightHex: string;
  description: string;
  descriptionEn: string;
  iconBg: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'sky',
    name: 'SkyOps Azul Clásico',
    nameEn: 'SkyOps Classic Blue',
    hex: '#0284c7',
    hoverHex: '#0369a1',
    lightHex: '#e0f2fe',
    description: 'Tono aeronáutico estándar de operaciones de vuelo y crucero.',
    descriptionEn: 'Standard aeronautical tone for flight operations and cruise.',
    iconBg: 'bg-sky-600'
  },
  {
    id: 'emerald',
    name: 'Verde Radar & IFR',
    nameEn: 'Radar Green & IFR',
    hex: '#059669',
    hoverHex: '#047857',
    lightHex: '#d1fae5',
    description: 'Inspirado en pantallas de radar meteorológico y aviónica de precisión.',
    descriptionEn: 'Inspired by weather radar screens and precision avionics.',
    iconBg: 'bg-emerald-600'
  },
  {
    id: 'amber',
    name: 'Pista Ámbar & Atardecer',
    nameEn: 'Runway Amber & Sunset',
    hex: '#d97706',
    hoverHex: '#b45309',
    lightHex: '#fef3c7',
    description: 'Iluminación de pista de aproximación y vuelos visuales VFR al atardecer.',
    descriptionEn: 'Approach runway lighting and sunset VFR visual flights.',
    iconBg: 'bg-amber-600'
  },
  {
    id: 'indigo',
    name: 'Estratosfera Índigo',
    nameEn: 'Stratosphere Indigo',
    hex: '#4f46e5',
    hoverHex: '#4338ca',
    lightHex: '#e0e7ff',
    description: 'Azul nocturno profundo para navegación de gran altitud.',
    descriptionEn: 'Deep night blue for high-altitude navigation.',
    iconBg: 'bg-indigo-600'
  },
  {
    id: 'teal',
    name: 'Rutas Oceánicas (Teal)',
    nameEn: 'Oceanic Routes (Teal)',
    hex: '#0d9488',
    hoverHex: '#0f766e',
    lightHex: '#ccfbf1',
    description: 'Planificación de rutas transoceánicas y costas del Caribe / Pacífico.',
    descriptionEn: 'Transoceanic route planning and Caribbean / Pacific coastlines.',
    iconBg: 'bg-teal-600'
  },
  {
    id: 'rose',
    name: 'Halcón Carmesí',
    nameEn: 'Crimson Falcon',
    hex: '#e11d48',
    hoverHex: '#be123c',
    lightHex: '#ffe4e6',
    description: 'Enfoque de alto rendimiento, alerta visual y entrenamiento avanzado.',
    descriptionEn: 'High performance focus, visual alertness and advanced training.',
    iconBg: 'bg-rose-600'
  },
  {
    id: 'violet',
    name: 'Aviónica Aurora',
    nameEn: 'Avionics Aurora',
    hex: '#7c3aed',
    hoverHex: '#6d28d9',
    lightHex: '#ede9fe',
    description: 'Sistemas de instrumentos digitales modernos y cabinas de cristal (Glass Cockpit).',
    descriptionEn: 'Modern glass cockpit instruments and digital avionics.',
    iconBg: 'bg-purple-600'
  },
  {
    id: 'cyan',
    name: 'Horizonte Celeste',
    nameEn: 'Cyan Horizon',
    hex: '#0891b2',
    hoverHex: '#0e7490',
    lightHex: '#cffafe',
    description: 'Referencia del indicador de actitud y horizonte artificial diurno.',
    descriptionEn: 'Attitude indicator reference and daytime artificial horizon.',
    iconBg: 'bg-cyan-600'
  },
  {
    id: 'slate',
    name: 'Titanio Táctico / Stealth',
    nameEn: 'Tactical Titanium / Stealth',
    hex: '#475569',
    hoverHex: '#334155',
    lightHex: '#f1f5f9',
    description: 'Diseño minimalista monocromático de máxima concentración.',
    descriptionEn: 'Monochromatic minimalist design for maximum focus.',
    iconBg: 'bg-slate-600'
  }
];

export interface DarkNuanceOption {
  id: DarkNuance;
  name: string;
  nameEn: string;
  canvas: string;
  card: string;
  border: string;
  description: string;
}

export const DARK_NUANCES: DarkNuanceOption[] = [
  {
    id: 'slate',
    name: 'Slate Táctico (Recomendado)',
    nameEn: 'Tactical Slate (Recommended)',
    canvas: '#0f172a',
    card: '#1e293b',
    border: '#334155',
    description: 'Equilibrio óptimo de contraste y legibilidad con matices azul grafito.'
  },
  {
    id: 'midnight',
    name: 'Estratosfera Midnight',
    nameEn: 'Midnight Stratosphere',
    canvas: '#090d16',
    card: '#111827',
    border: '#1f2937',
    description: 'Profundidad ultra oscura para operaciones nocturnas continuas.'
  },
  {
    id: 'oled',
    name: 'Negro Puro OLED',
    nameEn: 'Pure Black OLED',
    canvas: '#000000',
    card: '#0d0d11',
    border: '#27272a',
    description: 'Negro absoluto sin emisión de luz en píxeles negros para pantallas OLED.'
  },
  {
    id: 'cockpit',
    name: 'Cabina IFR Nocturna',
    nameEn: 'Night IFR Cockpit',
    canvas: '#091310',
    card: '#0f1f1a',
    border: '#1d382f',
    description: 'Tono verde aviónica oscuro diseñado para proteger la adaptación a la oscuridad.'
  }
];

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  accentColor: string;
  setAccentColor: (colorIdOrHex: string) => void;
  customHex: string;
  setCustomHex: (hex: string) => void;
  darkNuance: DarkNuance;
  setDarkNuance: (nuance: DarkNuance) => void;
  currentPreset: ColorPreset | null;
  activeHex: string;
  activeHoverHex: string;
  activeLightHex: string;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  resetToDefaults: () => void;
  savePreferencesForUser: (user: User) => Promise<void>;
  applyUserPreferences: (preferences?: ThemePreferences) => void;
}

const STORAGE_KEY = 'skyops_theme_preferences_v1';

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(2, 132, 199, ${alpha})`;
}

function adjustBrightness(hex: string, percent: number): string {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load saved preferences
  const getInitialPreferences = (): ThemePreferences => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error reading theme preferences from storage:', e);
    }
    return {
      mode: 'light',
      accentColor: 'sky',
      customHex: '#0284c7',
      darkNuance: 'slate'
    };
  };

  const initial = getInitialPreferences();
  const [mode, setModeState] = useState<ThemeMode>(initial.mode || 'light');
  const [accentColor, setAccentColorState] = useState<string>(initial.accentColor || 'sky');
  const [customHex, setCustomHexState] = useState<string>(initial.customHex || '#0284c7');
  const [darkNuance, setDarkNuanceState] = useState<DarkNuance>(initial.darkNuance || 'slate');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Compute if dark is effectively active
  const isDark = useMemo(() => {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return systemPrefersDark;
  }, [mode, systemPrefersDark]);

  // Compute color details
  const currentPreset = useMemo(() => {
    return COLOR_PRESETS.find(p => p.id === accentColor) || null;
  }, [accentColor]);

  const activeHex = useMemo(() => {
    if (currentPreset) return currentPreset.hex;
    if (accentColor.startsWith('#')) return accentColor;
    return customHex || '#0284c7';
  }, [currentPreset, accentColor, customHex]);

  const activeHoverHex = useMemo(() => {
    if (currentPreset) return currentPreset.hoverHex;
    return adjustBrightness(activeHex, -15);
  }, [currentPreset, activeHex]);

  const activeLightHex = useMemo(() => {
    if (currentPreset) return currentPreset.lightHex;
    return adjustBrightness(activeHex, 85);
  }, [currentPreset, activeHex]);

  // Persist to localStorage
  const saveCurrentPreferences = (newPrefs: Partial<ThemePreferences>) => {
    try {
      const current: ThemePreferences = {
        mode: newPrefs.mode ?? mode,
        accentColor: newPrefs.accentColor ?? accentColor,
        customHex: newPrefs.customHex ?? customHex,
        darkNuance: newPrefs.darkNuance ?? darkNuance,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to persist theme to localStorage:', e);
    }
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    saveCurrentPreferences({ mode: newMode });
  };

  const toggleTheme = () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    setMode(nextMode);
  };

  const setAccentColor = (colorIdOrHex: string) => {
    setAccentColorState(colorIdOrHex);
    saveCurrentPreferences({ accentColor: colorIdOrHex });
  };

  const setCustomHex = (hex: string) => {
    setCustomHexState(hex);
    setAccentColorState('custom');
    saveCurrentPreferences({ accentColor: 'custom', customHex: hex });
  };

  const setDarkNuance = (nuance: DarkNuance) => {
    setDarkNuanceState(nuance);
    saveCurrentPreferences({ darkNuance: nuance });
  };

  const resetToDefaults = () => {
    setModeState('light');
    setAccentColorState('sky');
    setCustomHexState('#0284c7');
    setDarkNuanceState('slate');
    saveCurrentPreferences({
      mode: 'light',
      accentColor: 'sky',
      customHex: '#0284c7',
      darkNuance: 'slate'
    });
  };

  const applyUserPreferences = (preferences?: ThemePreferences) => {
    if (!preferences) return;
    if (preferences.mode) setModeState(preferences.mode);
    if (preferences.accentColor) setAccentColorState(preferences.accentColor);
    if (preferences.customHex) setCustomHexState(preferences.customHex);
    if (preferences.darkNuance) setDarkNuanceState(preferences.darkNuance);
    saveCurrentPreferences(preferences);
  };

  const savePreferencesForUser = async (user: User) => {
    try {
      const prefs: ThemePreferences = {
        mode,
        accentColor,
        customHex,
        darkNuance,
        updatedAt: new Date().toISOString()
      };
      // Dynamically import to prevent circular dependency
      const { saveUserThemePreferencesInFirestore } = await import('../firebase/firestoreService');
      await saveUserThemePreferencesInFirestore(user.id, prefs);
    } catch (e) {
      console.warn('Could not save theme preferences to user account:', e);
    }
  };

  // Inject CSS Variables & Classes to Document Root
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // 1. Dark Mode Class on Root
    if (isDark) {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }

    // 2. Data Attributes
    root.setAttribute('data-theme-mode', isDark ? 'dark' : 'light');
    root.setAttribute('data-accent-theme', 'true');
    root.setAttribute('data-dark-nuance', darkNuance);

    // 3. Current Dark Nuance Colors
    const nuanceConfig = DARK_NUANCES.find(n => n.id === darkNuance) || DARK_NUANCES[0];

    // 4. Set CSS Custom Properties
    root.style.setProperty('--color-accent', activeHex);
    root.style.setProperty('--color-accent-hover', activeHoverHex);
    root.style.setProperty('--color-accent-light', activeLightHex);
    root.style.setProperty('--color-accent-ring', hexToRgba(activeHex, 0.35));
    root.style.setProperty('--color-accent-subtle', hexToRgba(activeHex, 0.15));

    if (isDark) {
      root.style.setProperty('--app-bg', nuanceConfig.canvas);
      root.style.setProperty('--app-card-bg', nuanceConfig.card);
      root.style.setProperty('--app-card-border', nuanceConfig.border);
      root.style.setProperty('--app-text', '#f8fafc');
      root.style.setProperty('--app-text-muted', '#94a3b8');
      root.style.setProperty('--header-bg', hexToRgba(nuanceConfig.card, 0.95));
      body.style.backgroundColor = nuanceConfig.canvas;
      body.style.color = '#f8fafc';
    } else {
      root.style.setProperty('--app-bg', '#f1f5f9');
      root.style.setProperty('--app-card-bg', '#ffffff');
      root.style.setProperty('--app-card-border', '#e2e8f0');
      root.style.setProperty('--app-text', '#0f172a');
      root.style.setProperty('--app-text-muted', '#64748b');
      root.style.setProperty('--header-bg', 'rgba(255, 255, 255, 0.95)');
      body.style.backgroundColor = '#f1f5f9';
      body.style.color = '#0f172a';
    }
  }, [isDark, activeHex, activeHoverHex, activeLightHex, darkNuance]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        setMode,
        toggleTheme,
        accentColor,
        setAccentColor,
        customHex,
        setCustomHex,
        darkNuance,
        setDarkNuance,
        currentPreset,
        activeHex,
        activeHoverHex,
        activeLightHex,
        isModalOpen,
        openModal: () => setIsModalOpen(true),
        closeModal: () => setIsModalOpen(false),
        resetToDefaults,
        savePreferencesForUser,
        applyUserPreferences
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
