import React, { useState } from 'react';
import { useTheme, COLOR_PRESETS, DARK_NUANCES } from '../context/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { User } from '../types';
import {
  Sun,
  Moon,
  Laptop,
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  Shield,
  Plane,
  X,
  Eye,
  Sliders,
  Paintbrush
} from 'lucide-react';

interface ThemeCustomizerModalProps {
  currentUser?: User;
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  currentUser,
  isOpen,
  onClose
}) => {
  const {
    mode,
    isDark,
    setMode,
    accentColor,
    setAccentColor,
    customHex,
    setCustomHex,
    darkNuance,
    setDarkNuance,
    activeHex,
    activeHoverHex,
    activeLightHex,
    resetToDefaults,
    savePreferencesForUser
  } = useTheme();

  const { language } = useLanguage();
  const [hexInput, setHexInput] = useState(customHex || '#0284c7');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCustomHexChange = (value: string) => {
    let clean = value.trim();
    if (!clean.startsWith('#')) {
      clean = '#' + clean;
    }
    setHexInput(clean);
    if (/^#[0-9A-F]{6}$/i.test(clean)) {
      setCustomHex(clean);
    }
  };

  const handleSaveToProfile = async () => {
    if (currentUser) {
      await savePreferencesForUser(currentUser);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="theme-customizer-modal"
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-modal-title"
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shadow-sky-600/20"
              style={{ backgroundColor: activeHex }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 id="theme-modal-title" className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {language === 'es' ? 'Personalización de Apariencia & Colores' : 'Appearance & Color Customization'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar personalizador"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* SECCIÓN 1: MODO CLARO / OSCURO / SISTEMA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'es' ? '1. Modo de Iluminación' : '1. Illumination Mode'}</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {isDark ? (language === 'es' ? '🌙 Modo Oscuro Activo' : '🌙 Dark Mode Active') : (language === 'es' ? '☀️ Modo Claro Activo' : '☀️ Light Mode Active')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('light')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  mode === 'light'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 text-amber-900 dark:text-amber-300 font-bold shadow-xs ring-2 ring-amber-400/30'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500 mb-1" />
                <span className="text-xs">{language === 'es' ? 'Claro' : 'Light'}</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">{language === 'es' ? 'Día / Alta Luz' : 'Daytime / Sun'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('dark')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  mode === 'dark'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs ring-2 ring-indigo-500/30'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-400 mb-1" />
                <span className="text-xs">{language === 'es' ? 'Oscuro' : 'Dark'}</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">{language === 'es' ? 'Noche / Cabina' : 'Night / Cockpit'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('system')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  mode === 'system'
                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-900 dark:text-sky-200 font-bold shadow-xs ring-2 ring-sky-500/30'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <Laptop className="w-5 h-5 text-sky-500 mb-1" />
                <span className="text-xs">{language === 'es' ? 'Sistema' : 'System'}</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">{language === 'es' ? 'Automático SO' : 'OS Automatic'}</span>
              </button>
            </div>
          </div>

          {/* SECCIÓN 2: MATIZ DE MODO OSCURO (SI ESTÁ ACTIVO) */}
          {isDark && (
            <div className="p-3.5 bg-slate-100/80 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'es' ? 'Matiz del Fondo Nocturno' : 'Night Background Nuance'}</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DARK_NUANCES.map((nuance) => {
                  const isSelected = darkNuance === nuance.id;
                  return (
                    <button
                      key={nuance.id}
                      type="button"
                      onClick={() => setDarkNuance(nuance.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-sky-500 bg-white dark:bg-slate-700 shadow-xs ring-1 ring-sky-500'
                          : 'border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className="w-4 h-4 rounded-full border border-slate-600 inline-block shadow-2xs"
                          style={{ backgroundColor: nuance.canvas }}
                        />
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-500" />}
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-white leading-tight">
                        {language === 'es' ? nuance.name.split(' (')[0] : nuance.nameEn.split(' (')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECCIÓN 3: COLOR DE ACENTO DE LA PLATAFORMA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Paintbrush className="w-3.5 h-3.5 text-sky-500" />
                <span>{language === 'es' ? '2. Color de Acento de la Plataforma' : '2. Platform Accent Color'}</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                {activeHex.toUpperCase()}
              </span>
            </div>

            {/* PRESETS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = accentColor === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setAccentColor(preset.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer group ${
                      isSelected
                        ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 shadow-sm ring-2 ring-slate-900/10 dark:ring-white/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: preset.hex }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {language === 'es' ? preset.name : preset.nameEn}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {preset.hex.toUpperCase()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* COLOR PERSONALIZADO (HEX PICKER) */}
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <label className="relative cursor-pointer">
                  <input
                    type="color"
                    value={activeHex}
                    onChange={(e) => handleCustomHexChange(e.target.value)}
                    className="sr-only"
                    id="theme-custom-color-picker"
                  />
                  <div
                    className="w-9 h-9 rounded-xl border-2 border-white dark:border-slate-700 shadow-md flex items-center justify-center text-white transition-transform hover:scale-105"
                    style={{ backgroundColor: activeHex }}
                    title={language === 'es' ? 'Hacer clic para abrir paleta cromática' : 'Click to open color picker'}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                </label>

                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {language === 'es' ? 'Selector de Color Personalizado' : 'Custom Color Picker'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {language === 'es' ? 'Elige cualquier color hexadecimal de tu agrado' : 'Choose any hex color code'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => handleCustomHexChange(e.target.value)}
                  placeholder="#0284C7"
                  maxLength={7}
                  className="px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-sky-500 w-28 text-center"
                />
                <button
                  type="button"
                  onClick={() => handleCustomHexChange(hexInput)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 cursor-pointer"
                >
                  {language === 'es' ? 'Aplicar' : 'Apply'}
                </button>
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: PREVISUALIZACIÓN EN VIVO (LIVE PREVIEW DECK) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>{language === 'es' ? 'Previsualización en Vivo de Componentes' : 'Live Component Preview'}</span>
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: activeHex }}
              >
                {language === 'es' ? 'Acento Activo' : 'Active Accent'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-1">
              {/* Sample Button */}
              <button
                type="button"
                className="w-full py-2 px-3 text-xs font-bold text-white rounded-xl shadow-sm transition-transform hover:opacity-95 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: activeHex }}
              >
                <Plane className="w-4 h-4" />
                <span>{language === 'es' ? 'Botón Primario' : 'Primary Button'}</span>
              </button>

              {/* Sample Badge & Progress */}
              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Progreso PPL:</span>
                  <span className="font-bold font-mono" style={{ color: activeHex }}>75%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: '75%', backgroundColor: activeHex }}
                  />
                </div>
              </div>

              {/* Sample Tab / Card element */}
              <div
                className="p-2.5 rounded-xl border flex items-center justify-between"
                style={{
                  borderColor: activeHex,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : activeLightHex
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: activeHex }}
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    SkyOps Active
                  </span>
                </div>
                <span
                  className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: activeHex, color: '#ffffff' }}
                >
                  OK
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={resetToDefaults}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Restablecer Predeterminados' : 'Reset Defaults'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentUser && (
              <button
                type="button"
                onClick={handleSaveToProfile}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">{language === 'es' ? '¡Guardado en Perfil!' : 'Saved in Profile!'}</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5 text-sky-500" />
                    <span>{language === 'es' ? 'Guardar en mi Perfil' : 'Save to Profile'}</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all hover:opacity-90 active:scale-95 cursor-pointer"
              style={{ backgroundColor: activeHex }}
            >
              {language === 'es' ? 'Listo / Cerrar' : 'Done / Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
