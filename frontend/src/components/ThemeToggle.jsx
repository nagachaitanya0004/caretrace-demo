import { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    setAnnounce(isDark ? 'Dark mode enabled' : 'Light mode enabled');
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="theme-toggle relative min-h-[26px] min-w-[48px] rounded-full border border-slate-200/80 bg-sky-200/50 text-slate-800 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus:ring-2 focus:ring-sky-300/40 active:scale-[0.96] hover:scale-[1.03]"
    >
      <span className="pointer-events-none absolute inset-0 rounded-full flex items-center justify-between px-1">
        <span className="text-xs">☀️</span>
        <span className="text-xs">🌙</span>
      </span>
      <span className={`toggle-knob absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.22)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isDark ? 'translate-x-[22px]' : 'translate-x-0'}`} />
      <span className="sr-only" aria-live="polite">{announce}</span>
    </button>
  );
}
