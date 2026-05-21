import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'theme';
const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
  } catch {}
  return 'light';
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [transition, setTransition] = useState({
    isActive: false,
    themeToReveal: null,
    progress: 0,
    pulseScale: 1,
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.removeAttribute('data-theme');
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore localStorage errors in private mode or restricted environments.
    }
  }, [theme]);

  const toggleTheme = () => {
    if (transition.isActive) return;

    const targetTheme = theme === 'light' ? 'dark' : 'light';
    setTransition({
      isActive: true,
      themeToReveal: targetTheme,
      progress: 0,
      pulseScale: 1,
    });
  };

  useEffect(() => {
    if (!transition.isActive) return;

    let animId;
    const duration = 850; // Total sweep duration in ms
    const startTime = performance.now();

    const frame = (now) => {
      const elapsed = now - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);

      // Custom smooth easing curve for the sweep laser line
      const easedRatio = progressRatio < 0.5 
        ? 4 * progressRatio * progressRatio * progressRatio 
        : 1 - Math.pow(-2 * progressRatio + 2, 3) / 2;
      const easedProgress = easedRatio * 100;

      // Heartbeat pulse triggers lub-dub between 40% and 60% of scan progress
      let pulseScale = 1;
      if (progressRatio >= 0.38 && progressRatio <= 0.46) {
        const pulseRatio = (progressRatio - 0.38) / 0.08;
        pulseScale = 1 + Math.sin(pulseRatio * Math.PI) * 0.38;
      } else if (progressRatio > 0.46 && progressRatio <= 0.56) {
        const pulseRatio = (progressRatio - 0.46) / 0.10;
        pulseScale = 1 + Math.sin(pulseRatio * Math.PI) * 0.58;
      }

      if (progressRatio < 1) {
        setTransition((prev) => ({
          ...prev,
          progress: easedProgress,
          pulseScale,
        }));
        animId = requestAnimationFrame(frame);
      } else {
        // Complete the theme change inside the DOM
        setTheme(transition.themeToReveal);
        setTransition({
          isActive: false,
          themeToReveal: null,
          progress: 0,
          pulseScale: 1,
        });
      }
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [transition.isActive, transition.themeToReveal]);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

  // Reveal viewport background colors match light and dark modes respectively
  const revealBg = transition.themeToReveal === 'dark' ? '#09090b' : '#DBE4C9';

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {transition.isActive && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {/* Transition background panel clip-revealed by the ECG scanner */}
          <div
            className={transition.themeToReveal === 'dark' ? 'dark' : ''}
            data-theme={transition.themeToReveal}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: revealBg,
              clipPath: `polygon(0 0, ${transition.progress}% 0, ${transition.progress}% 100%, 0 100%)`,
            }}
          />

          {/* ECG sweep laser line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${transition.progress}%`,
              width: '3px',
              backgroundColor: '#8AA624',
              boxShadow: '0 0 16px #8AA624, 0 0 32px #8AA624, 0 0 64px rgba(138, 166, 36, 0.6)',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Pulsing circular ECG mark */}
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: '#8AA624',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 24px #8AA624, 0 0 48px rgba(138, 166, 36, 0.8)',
                transform: `scale(${transition.pulseScale})`,
                transition: 'transform 0.03s linear',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
                <path
                  d="M10 20h4l1.2-5 2.3 12 2.5-14 2.2 7H30"
                  stroke="#0a0a0a"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
