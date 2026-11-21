import { X } from 'lucide-react';
import { useAppearance, type AppearanceSettings } from '../../theme/ThemeProvider';
import { uiText } from '../../i18n/ui';

const SWATCHES = ['#14B8A6', '#5B5BF0', '#3B82F6', '#8B5CF6', '#22C55E', '#F5B544', '#F97316', '#EC4899', '#0EA5E9', '#64748B'];

export default function AppearancePanel({ open, onClose, language }: { open: boolean; onClose: () => void; language: 'en' | 'ar' }) {
  const { settings, update, reset } = useAppearance();
  const labels = uiText[language];
  const option = <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K], label: string) => (
    <button type="button" className={`appearance-segment ${settings[key] === value ? 'active' : ''}`} onClick={() => update({ [key]: value } as Pick<AppearanceSettings, K>)} aria-pressed={settings[key] === value}>{label}</button>
  );

  if (!open) return null;
  return (
    <div className="appearance-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="appearance-panel" role="dialog" aria-modal="true" aria-labelledby="appearance-title" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <header className="appearance-header"><div><h2 id="appearance-title">{labels.appearance}</h2><p>{labels.appearanceHint}</p></div><button autoFocus className="appearance-close" onClick={onClose} type="button" aria-label={labels.close}><X size={19} /></button></header>
        <div className="appearance-content">
          <Setting label={labels.mode}><div className="appearance-segments">{option('mode', 'light', labels.light)}{option('mode', 'dark', labels.dark)}{option('mode', 'system', labels.system)}</div></Setting>
          <Setting label={labels.primary}>
            <div className="appearance-swatches">{SWATCHES.map((color, index) => <button key={color} type="button" className={`appearance-swatch ${settings.primary.toLowerCase() === color.toLowerCase() ? 'selected' : ''}`} style={{ background: color }} onClick={() => update({ primary: color })} aria-label={labels.palette[index]} aria-pressed={settings.primary.toLowerCase() === color.toLowerCase()} />)}
              <label className="appearance-custom-color" title={labels.customColor}><input type="color" value={settings.primary} onChange={(event) => update({ primary: event.target.value })} aria-label={labels.customColor} /><span>+</span></label>
            </div>
          </Setting>
          <Setting label={labels.accentStyle}><div className="appearance-segments">{option('accentStyle', 'soft', labels.soft)}{option('accentStyle', 'vivid', labels.vivid)}</div></Setting>
          <div className="appearance-select-grid">
            <Setting label={labels.fontArabic}><select value={settings.fontAr} onChange={(event) => update({ fontAr: event.target.value as AppearanceSettings['fontAr'] })}><option>IBM Plex Sans Arabic</option><option>Cairo</option><option>Tajawal</option><option>Almarai</option></select></Setting>
            <Setting label={labels.fontEnglish}><select value={settings.fontEn} onChange={(event) => update({ fontEn: event.target.value as AppearanceSettings['fontEn'] })}><option>Inter</option><option>Poppins</option><option>DM Sans</option></select></Setting>
            <Setting label={labels.fontSize}><select value={settings.fontSize} onChange={(event) => update({ fontSize: Number(event.target.value) as AppearanceSettings['fontSize'] })}>{[14, 15, 16, 17].map((size) => <option key={size} value={size}>{size}px</option>)}</select></Setting>
          </div>
          <Setting label={labels.radius}><div className="appearance-segments">{option('radius', 12, labels.sharp)}{option('radius', 20, labels.rounded)}{option('radius', 28, labels.round)}</div></Setting>
          <Setting label={labels.density}><div className="appearance-segments">{option('density', 'comfortable', labels.comfortable)}{option('density', 'compact', labels.compact)}</div></Setting>
          <Setting label={labels.sidebarStyle}><div className="appearance-segments">{option('sidebarStyle', 'glass', labels.glass)}{option('sidebarStyle', 'solid', labels.solid)}{option('sidebarStyle', 'tinted', labels.tinted)}</div></Setting>
        </div>
        <footer className="appearance-footer"><button className="appearance-reset" onClick={reset} type="button">{labels.reset}</button></footer>
      </aside>
    </div>
  );
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return <section className="appearance-setting"><h3>{label}</h3>{children}</section>;
}
