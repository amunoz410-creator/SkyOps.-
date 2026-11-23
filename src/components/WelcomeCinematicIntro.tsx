import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface WelcomeCinematicIntroProps {
  onFinish: () => void;
}

export const WelcomeCinematicIntro: React.FC<WelcomeCinematicIntroProps> = ({ onFinish }) => {
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioAutoplayBlocked, setAudioAutoplayBlocked] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Inicializar y sincronizar reproducción de audio
  useEffect(() => {
    // Crear elemento de audio con la pista de 4.5 segundos
    const audio = new Audio('/audio/skyops_intro.mp3');
    audio.preload = 'auto';
    audio.currentTime = 0;
    audio.volume = 0; // Iniciar en 0 para aplicar el efecto ascendente (fade-in)
    audioRef.current = audio;

    // Función para modular el volumen matemáticamente:
    // 0.0s - 2.8s: Efecto ascendente (crescendo suave)
    // 2.8s - 3.5s: Clímax máximo en coincidencia con el logo
    // 3.5s - 4.5s: Efecto descendente (decrescendo / fade-out)
    const updateVolumeCurve = () => {
      if (!audioRef.current || isMuted) {
        animFrameRef.current = requestAnimationFrame(updateVolumeCurve);
        return;
      }

      const t = audioRef.current.currentTime;
      let targetVol = 0;

      if (t < 2.8) {
        // Efecto ascendente suave (curva sigmoidal / coseno)
        targetVol = 0.5 * (1 - Math.cos((Math.PI * t) / 2.8));
      } else if (t < 3.5) {
        // Clímax acústico completo
        targetVol = 1.0;
      } else if (t <= 4.5) {
        // Efecto descendente suave
        const fadeProgress = (t - 3.5) / 1.0;
        targetVol = Math.max(0, 0.5 * (1 + Math.cos(Math.PI * fadeProgress)));
      } else {
        targetVol = 0;
      }

      audioRef.current.volume = Math.max(0, Math.min(1, targetVol));

      // Si el audio supera los 4.5s, pausarlo
      if (t >= 4.5) {
        audioRef.current.pause();
      } else {
        animFrameRef.current = requestAnimationFrame(updateVolumeCurve);
      }
    };

    // Intentar reproducir el audio sincronizado con la presentación
    const startAudioPlayback = async () => {
      try {
        await audio.play();
        setIsPlayingAudio(true);
        setAudioAutoplayBlocked(false);
        animFrameRef.current = requestAnimationFrame(updateVolumeCurve);
      } catch (error) {
        // Si las políticas de autoplay del navegador restringen el audio sin interacción previa
        console.warn('Autoplay de audio restringido por el navegador. Requiere interacción del usuario.', error);
        setAudioAutoplayBlocked(true);
      }
    };

    startAudioPlayback();

    // Temporizador principal sincronizado exactamente con la duración del audio (4.5 segundos)
    timerRef.current = setTimeout(() => {
      handleComplete();
    }, 4500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Manejar el toggle de silencio
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isMuted) {
      setIsMuted(false);
      audioRef.current.muted = false;
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    } else {
      setIsMuted(true);
      audioRef.current.muted = true;
    }
  };

  // Reanudar audio si fue bloqueado por autoplay al hacer clic en pantalla
  const handleUserGesture = () => {
    if (audioAutoplayBlocked && audioRef.current && audioRef.current.paused) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
        setAudioAutoplayBlocked(false);
      }).catch(() => {});
      return;
    }

    handleComplete();
  };

  const handleComplete = () => {
    if (isFinishing) return;
    setIsFinishing(true);

    // Suavizar parada del audio
    if (audioRef.current) {
      try {
        const fadeInterval = setInterval(() => {
          if (audioRef.current && audioRef.current.volume > 0.1) {
            audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.2);
          } else {
            clearInterval(fadeInterval);
            audioRef.current?.pause();
          }
        }, 30);
      } catch {
        audioRef.current?.pause();
      }
    }

    onFinish();
  };

  return (
    <motion.div
      key="skyops-cinematic-intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.06,
        filter: 'blur(16px)',
        transition: {
          duration: 1.1,
          ease: [0.22, 1, 0.36, 1]
        }
      }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
      onClick={handleUserGesture}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020617] text-white select-none overflow-hidden cursor-pointer"
    >
      {/* 1. Fondo Atmosférico Aeroespacial con Profundidad Cósmica */}
      <div className="absolute inset-0 bg-radial from-sky-950/40 via-[#030a1c] to-[#01030d] pointer-events-none" />

      {/* 2. Rejilla de Horizonte / Pista en Perspectiva Cinematográfica */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-25 pointer-events-none [mask-image:linear-gradient(to_bottom,transparent,black_70%)] animate-runway-grid"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(56, 189, 248, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: '60px 35px',
          transform: 'perspective(500px) rotateX(60deg)'
        }}
      />

      {/* 3. Haz de Luz de Horizonte Central (Anamorphic Lens Flare) sincronizado con el clímax */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0.2 }}
        animate={{
          opacity: [0.2, 0.85, 0.4],
          scaleX: [0.5, 1.3, 0.9]
        }}
        transition={{ duration: 4.5, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[240px] bg-gradient-to-r from-transparent via-sky-500/30 to-transparent rounded-full blur-3xl pointer-events-none"
      />

      {/* 4. Resplandor Pulsante Central que asciende en intensidad */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{
          opacity: [0.1, 0.45, 0.2],
          scale: [0.8, 1.25, 1.1]
        }}
        transition={{ duration: 4.5, ease: 'easeOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] bg-sky-400/20 rounded-full blur-[100px] pointer-events-none"
      />

      {/* Control de Audio en Esquina Superior Derecha */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        {audioAutoplayBlocked ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-950/80 border border-sky-400/40 text-sky-200 text-xs shadow-lg backdrop-blur-md"
          >
            <VolumeX className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="font-medium text-[11px]">Haz clic para activar audio</span>
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={toggleMute}
            className="p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-800/80 border border-sky-500/20 text-sky-300 hover:text-white transition-all shadow-md backdrop-blur-md cursor-pointer"
            title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-sky-400 animate-pulse" />}
          </button>
        )}
      </div>

      {/* 5. Contenido Central: Exclusivamente Tipografía "SkyOps" con efecto ascendente al inicio y descendente al final */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto">
        <div className="relative overflow-hidden px-6 py-4">
          <motion.div
            initial={{
              opacity: 0,
              letterSpacing: '0.3em',
              filter: 'blur(16px)',
              scale: 0.86,
              y: 20
            }}
            animate={{
              // Efecto ascendente (0.0s - 2.8s) -> Clímax (2.8s - 3.5s) -> Efecto descendente (3.5s - 4.5s)
              opacity: [0, 0.45, 1, 1, 0.2, 0],
              letterSpacing: ['0.3em', '0.18em', '0.08em', '0.08em', '0.05em', '0.03em'],
              filter: ['blur(16px)', 'blur(6px)', 'blur(0px)', 'blur(0px)', 'blur(3px)', 'blur(10px)'],
              scale: [0.86, 0.94, 1.03, 1.03, 0.97, 0.92],
              y: [20, 8, 0, 0, -4, -12]
            }}
            transition={{
              duration: 4.5,
              times: [0, 0.25, 0.58, 0.76, 0.92, 1],
              ease: 'easeInOut'
            }}
          >
            <h1 className="font-aviation-display text-6xl sm:text-8xl md:text-9xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-sky-200 drop-shadow-[0_8px_36px_rgba(0,0,0,0.95)] select-none tracking-wider">
              SkyOps
            </h1>
          </motion.div>

          {/* Barrido de Haz de Luz Cristalino (Metallic Light Sweep) en el punto álgido del audio (2.2s - 3.5s) */}
          <motion.div
            initial={{ x: '-150%', opacity: 0 }}
            animate={{ x: '250%', opacity: [0, 0.95, 0] }}
            transition={{ duration: 1.6, delay: 2.2, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <div className="w-3/4 h-full bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-[-25deg]" />
          </motion.div>
        </div>
      </div>

      {/* 6. Indicador de Progreso Sincronizado a 4.5 Segundos */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="absolute bottom-10 inset-x-0 flex flex-col items-center justify-center gap-3 pointer-events-none z-10 px-6"
      >
        {/* Barra de Tiempo Delicada con Duración Exacta de 4.5s */}
        <div className="w-48 sm:w-64 h-[2px] bg-slate-800/80 rounded-full overflow-hidden backdrop-blur-xs border border-sky-500/10">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 4.5, ease: 'linear' }}
            className="h-full bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.9)]"
          />
        </div>

        {/* Sugerencia de Interacción */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 tracking-wider">
          <Sparkles className="w-3 h-3 text-sky-400" />
          <span>Haz clic en cualquier parte para continuar</span>
          <ChevronRight className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
        </div>
      </motion.div>
    </motion.div>
  );
};

