import React, { useState } from 'react';
import { User } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { WindyWeatherView } from './WindyWeatherView';
import { MetarTafPanamaView } from './MetarTafPanamaView';
import {
  Wind,
  CloudSun,
  Layers,
  ExternalLink,
  ShieldCheck,
  Plane,
  Sparkles
} from 'lucide-react';

interface WeatherHubModuleProps {
  currentUser: User;
  allUsers: User[];
  defaultSubTab?: 'windy' | 'metar_taf';
}

export const WeatherHubModule: React.FC<WeatherHubModuleProps> = ({
  currentUser,
  allUsers,
  defaultSubTab = 'windy'
}) => {
  const { t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'windy' | 'metar_taf'>(defaultSubTab);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header Navigation Tabs for Weather Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Subtabs Switcher */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('windy')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === 'windy'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Wind className={`w-4 h-4 ${activeSubTab === 'windy' ? 'text-sky-600' : 'text-slate-500'}`} />
            <span>{t('tab_clima_windy')}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('metar_taf')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSubTab === 'metar_taf'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <CloudSun className={`w-4 h-4 ${activeSubTab === 'metar_taf' ? 'text-indigo-600' : 'text-slate-500'}`} />
            <span>{t('tab_metar_taf')}</span>
          </button>
        </div>

        {/* Informative helper tag */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium pr-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Briefing Operacional Oficial AAC Panamá (RAC 91) para Instructores y Estudiantes</span>
        </div>
      </div>

      {/* Dynamic Sub-View Content */}
      {activeSubTab === 'windy' && <WindyWeatherView />}
      {activeSubTab === 'metar_taf' && <MetarTafPanamaView />}
    </div>
  );
};
