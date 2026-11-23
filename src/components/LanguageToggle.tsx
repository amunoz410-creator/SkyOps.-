import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  variant?: 'compact' | 'full' | 'pill';
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ variant = 'full', className = '' }) => {
  const { language, setLanguage, toggleLanguage } = useLanguage();

  if (variant === 'compact') {
    return (
      <button
        onClick={toggleLanguage}
        title={language === 'es' ? 'Switch to English (US)' : 'Cambiar a Español'}
        className={`flex items-center justify-center w-9 h-9 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:text-white hover:border-sky-500 transition-colors cursor-pointer text-xs font-bold ${className}`}
        aria-label="Cambiar idioma / Switch language"
      >
        <span>{language === 'es' ? '🇺🇸 EN' : '🇪🇸 ES'}</span>
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <div className={`inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold ${className}`}>
        <button
          onClick={() => setLanguage('es')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            language === 'es'
              ? 'bg-white text-sky-700 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          🇪🇸 ES
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            language === 'en'
              ? 'bg-white text-sky-700 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          🇺🇸 EN
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs ${className}`}>
      <div className="flex items-center gap-2 text-slate-300 pl-1">
        <Globe className="w-4 h-4 text-sky-400" />
        <span className="text-[11px] font-semibold text-slate-300">
          {language === 'es' ? 'Idioma' : 'Language'}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setLanguage('es')}
          className={`px-2 py-0.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            language === 'es'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          🇪🇸 ES
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`px-2 py-0.8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            language === 'en'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          🇺🇸 EN
        </button>
      </div>
    </div>
  );
};
