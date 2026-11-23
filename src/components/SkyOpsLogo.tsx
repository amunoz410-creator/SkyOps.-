import React from 'react';

export type LogoVariant = 'full' | 'horizontal' | 'icon' | 'compact' | 'hero' | 'symbol';
export type LogoTheme = 'dark' | 'light' | 'auto';

interface SkyOpsLogoProps {
  variant?: LogoVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  theme?: LogoTheme;
  showBadge?: boolean;
  badgeText?: string;
  subtitle?: string;
  className?: string;
  animate?: boolean;
  useRasterImage?: boolean;
}

// Emblema vectorial SVG de alta precisión que replica fielmente el diseño de SkyOps:
// Nube luminosa con nodos de constelación, estrella central y flecha/ala ascendente dinámica.
export const SkyOpsEmblem: React.FC<{
  className?: string;
  size?: number | string;
  theme?: LogoTheme;
  animate?: boolean;
}> = ({ className = 'w-10 h-10', size, theme = 'dark', animate = false }) => {
  return (
    <div
      className={`relative flex items-center justify-center flex-shrink-0 ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full drop-shadow-md ${animate ? 'hover:scale-105 transition-transform duration-300' : ''}`}
      >
        <defs>
          {/* Gradiente principal del fondo / badge */}
          <linearGradient id="skyops-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B1B3D" />
            <stop offset="50%" stopColor="#0F2856" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* Gradiente brillante de la flecha ascendente y ala */}
          <linearGradient id="skyops-arrow-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="35%" stopColor="#38BDF8" />
            <stop offset="70%" stopColor="#BAE6FD" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>

          {/* Gradiente secundario de la nube */}
          <linearGradient id="skyops-cloud-grad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#0284C7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0369A1" stopOpacity="0.6" />
          </linearGradient>

          {/* Gradiente del contorno de la nube */}
          <linearGradient id="skyops-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#BAE6FD" />
            <stop offset="50%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>

          {/* Resplandor suave */}
          <filter id="skyops-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Fondo sutil con esquinas redondeadas modernas */}
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="22"
          fill="url(#skyops-bg-grad)"
          className="transition-colors"
        />
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="22"
          stroke="url(#skyops-border-grad)"
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />

        {/* Nube Superior con Nodos de Constelación */}
        <g id="cloud-structure">
          {/* Silueta de Nube */}
          <path
            d="M 32 50 
               C 24 50 20 44 22 36 
               C 24 28 32 25 38 28 
               C 42 19 55 18 63 24 
               C 70 20 79 26 78 35 
               C 84 39 84 48 76 52 
               Z"
            fill="url(#skyops-cloud-grad)"
            stroke="url(#skyops-border-grad)"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Nodos de Constelación / Red Inteligente */}
          <circle cx="34" cy="37" r="2.2" fill="#BAE6FD" />
          <circle cx="48" cy="27" r="2.5" fill="#FFFFFF" filter="url(#skyops-glow)" />
          <circle cx="66" cy="33" r="2.2" fill="#BAE6FD" />
          <circle cx="58" cy="42" r="2" fill="#7DD3FC" />

          {/* Líneas de Constelación conectadas */}
          <line x1="34" y1="37" x2="48" y2="27" stroke="#BAE6FD" strokeWidth="1" strokeOpacity="0.7" />
          <line x1="48" y1="27" x2="66" y2="33" stroke="#BAE6FD" strokeWidth="1" strokeOpacity="0.7" />
          <line x1="48" y1="27" x2="58" y2="42" stroke="#BAE6FD" strokeWidth="1" strokeOpacity="0.7" />
          <line x1="34" y1="37" x2="58" y2="42" stroke="#BAE6FD" strokeWidth="0.8" strokeOpacity="0.5" strokeDasharray="1.5 1.5" />

          {/* Destello de estrella en nodo central */}
          <path
            d="M 48 22 L 49.2 25.8 L 53 27 L 49.2 28.2 L 48 32 L 46.8 28.2 L 43 27 L 46.8 25.8 Z"
            fill="#FFFFFF"
            opacity="0.95"
          />
        </g>

        {/* Flecha / Chevron Ascendente en Zig-Zag y Ala Aeronáutica */}
        <g id="ascending-arrow-echelon">
          {/* Sombra / Capa inferior del chevron */}
          <path
            d="M 22 69 
               L 37 53 
               L 49 63 
               L 77 31 
               L 65 31 
               L 81 23 
               L 82 41 
               L 73 38 
               L 49 68 
               L 37 59 
               L 22 76 
               Z"
            fill="#0369A1"
            opacity="0.4"
          />

          {/* Chevron Ascendente Principal */}
          <path
            d="M 24 67 
               L 38 51 
               L 50 61 
               L 78 29 
               L 66 29 
               L 82 21 
               L 83 39 
               L 74 36 
               L 50 66 
               L 38 57 
               L 24 74 
               Z"
            fill="url(#skyops-arrow-grad)"
            stroke="#FFFFFF"
            strokeWidth="0.7"
            strokeLinejoin="round"
            filter="url(#skyops-glow)"
          />

          {/* Ala aeronáutica adicional en la base derecha */}
          <path
            d="M 58 68 C 66 64 74 61 80 57 C 76 63 70 68 62 72 Z"
            fill="#38BDF8"
            opacity="0.85"
          />
          <path
            d="M 53 73 C 62 70 70 67 76 64 C 71 69 64 74 57 77 Z"
            fill="#0284C7"
            opacity="0.7"
          />
        </g>

        {/* Resplandor decorativo en la punta de la flecha */}
        <circle cx="82" cy="21" r="2.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

export const SkyOpsLogo: React.FC<SkyOpsLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  theme = 'dark',
  showBadge = true,
  badgeText = 'Flight Ops',
  subtitle,
  className = '',
  animate = false,
  useRasterImage = false
}) => {
  // Configuración de tamaños
  const sizeMap = {
    xs: {
      emblem: 'w-6 h-6',
      title: 'text-sm',
      sub: 'text-[9px]',
      badge: 'text-[8px] px-1 py-0.2',
      gap: 'gap-2'
    },
    sm: {
      emblem: 'w-8 h-8',
      title: 'text-base font-extrabold',
      sub: 'text-[10px]',
      badge: 'text-[9px] px-1.5 py-0.5',
      gap: 'gap-2.5'
    },
    md: {
      emblem: 'w-10 h-10',
      title: 'text-lg font-black',
      sub: 'text-[11px]',
      badge: 'text-[9px] px-1.5 py-0.5',
      gap: 'gap-3'
    },
    lg: {
      emblem: 'w-14 h-14',
      title: 'text-2xl font-black',
      sub: 'text-xs',
      badge: 'text-[10px] px-2 py-0.5',
      gap: 'gap-3.5'
    },
    xl: {
      emblem: 'w-20 h-20',
      title: 'text-3xl font-black',
      sub: 'text-sm',
      badge: 'text-xs px-2.5 py-1',
      gap: 'gap-4'
    },
    '2xl': {
      emblem: 'w-28 h-28',
      title: 'text-4xl sm:text-5xl font-black',
      sub: 'text-base font-medium',
      badge: 'text-xs px-3 py-1 font-bold',
      gap: 'gap-5'
    }
  };

  const currentSize = sizeMap[size];

  const isDark = theme === 'dark';
  const titleColor = isDark ? 'text-white' : 'text-slate-900';
  const subtitleColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const defaultSub = isDark ? 'CLOUD OPERATIONS & FLIGHT ACADEMY' : 'Flight Training & Operations Cloud';

  // Renderizado sólo del ícono/símbolo
  if (variant === 'icon' || variant === 'symbol') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <SkyOpsEmblem className={currentSize.emblem} theme={theme} animate={animate} />
      </div>
    );
  }

  // Renderizado Hero (Centrado vertical grande para Login / Pantalla de Carga)
  if (variant === 'hero') {
    return (
      <div className={`flex flex-col items-center text-center ${currentSize.gap} ${className}`}>
        <div className="relative group">
          {/* Halo luminoso de fondo */}
          <div className="absolute -inset-2 bg-gradient-to-r from-sky-500/25 to-blue-600/25 rounded-3xl blur-xl group-hover:blur-2xl transition-all opacity-70" />
          <SkyOpsEmblem className={currentSize.emblem} theme={theme} animate={animate} />
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className={`${currentSize.title} tracking-tight ${titleColor} uppercase font-sans drop-shadow-xs`}>
              SkyOps
            </span>
            {showBadge && (
              <span className={`${currentSize.badge} uppercase font-extrabold rounded-md bg-sky-500/20 text-sky-300 border border-sky-400/30 tracking-wider`}>
                {badgeText}
              </span>
            )}
          </div>
          <span className={`${currentSize.sub} ${subtitleColor} tracking-widest font-semibold uppercase mt-0.5`}>
            {subtitle || defaultSub}
          </span>
        </div>
      </div>
    );
  }

  // Renderizado Horizontal (predeterminado para Sidebar, Header, Navbars)
  return (
    <div className={`flex items-center ${currentSize.gap} ${className} min-w-0`}>
      <SkyOpsEmblem className={currentSize.emblem} theme={theme} animate={animate} />

      <div className="flex flex-col min-w-0 text-left">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`${currentSize.title} tracking-tight ${titleColor} uppercase font-sans truncate`}>
            SkyOps
          </span>
          {showBadge && (
            <span className={`${currentSize.badge} uppercase font-extrabold rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 flex-shrink-0 tracking-wide`}>
              {badgeText}
            </span>
          )}
        </div>
        <span className={`${currentSize.sub} ${subtitleColor} truncate tracking-wider font-semibold`}>
          {subtitle || 'CLOUD OPERATIONS'}
        </span>
      </div>
    </div>
  );
};
