import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AppearanceSettings = {
  mode: ThemeMode;
  primary: string;
  accentStyle: 'soft' | 'vivid';
  fontAr: 'IBM Plex Sans Arabic' | 'Cairo' | 'Tajawal' | 'Almarai';
  fontEn: 'Inter' | 'Poppins' | 'DM Sans';
  fontSize: 14 | 15 | 16 | 17;
  radius: 12 | 20 | 28;
  density: 'comfortable' | 'compact';
  sidebarStyle: 'glass' | 'solid' | 'tinted';
};

const STORAGE_KEY = 'biznova-appearance-v1';
export const DEFAULT_APPEARANCE: AppearanceSettings = {
  mode: 'light',
  primary: '#14B8A6',
  accentStyle: 'soft',
  fontAr: 'IBM Plex Sans Arabic',
  fontEn: 'Inter',
  fontSize: 15,
  radius: 20,
  density: 'comfortable',
  sidebarStyle: 'glass',
};

const AppearanceContext = createContext<{
  settings: AppearanceSettings;
  update: (patch: Partial<AppearanceSettings>) => void;
  reset: () => void;
} | null>(null);

function readSettings(): AppearanceSettings {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!stored || typeof stored !== 'object') return DEFAULT_APPEARANCE;
    const data = stored as Partial<AppearanceSettings>;
    return {
      ...DEFAULT_APPEARANCE,
      ...data,
      primary: typeof data.primary === 'string' && /^#[\da-f]{6}$/i.test(data.primary) ? data.primary : DEFAULT_APPEARANCE.primary,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>(readSettings);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = settings.mode === 'system' ? (systemDark ? 'dark' : 'light') : settings.mode;
    root.dataset.accentStyle = settings.accentStyle;
    root.dataset.density = settings.density;
    root.dataset.sidebarStyle = settings.sidebarStyle;
    root.style.setProperty('--primary', settings.primary);
    root.style.setProperty('--primary-soft', `color-mix(in srgb, ${settings.primary} ${settings.accentStyle === 'soft' ? '12%' : '22%'}, var(--surface))`);
    root.style.setProperty('--focus-ring', `color-mix(in srgb, ${settings.primary} 56%, white)`);
    root.style.setProperty('--font-ar', `'${settings.fontAr}', sans-serif`);
    root.style.setProperty('--font-en', `'${settings.fontEn}', sans-serif`);
    root.style.setProperty('--font-size-base', `${settings.fontSize}px`);
    root.style.setProperty('--radius-card', `${settings.radius}px`);
    root.style.setProperty('--radius-control', `${Math.min(settings.radius, 16)}px`);
    root.style.setProperty('--radius-pill', '999px');
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      window.localStorage.setItem('biznova-theme', root.dataset.theme ?? 'light');
    } catch {
      // Settings stay active in memory if browser storage is unavailable.
    }
  }, [settings]);

  useEffect(() => {
    if (settings.mode !== 'system') return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = query.matches ? 'dark' : 'light'; };
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [settings.mode]);

  const update = (patch: Partial<AppearanceSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const reset = () => setSettings(DEFAULT_APPEARANCE);

  return <AppearanceContext.Provider value={{ settings, update, reset }}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used within ThemeProvider');
  return context;
}