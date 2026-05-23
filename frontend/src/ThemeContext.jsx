import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const THEME_STORAGE_KEY = 'theme';
const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
  } catch {
    // Ignore localStorage access errors
  }
  return 'light';
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

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

  const toggleTheme = useCallback((event) => {
    const targetTheme = theme === 'light' ? 'dark' : 'light';
    
    // Fallback for browsers that don't support View Transitions
    if (!document.startViewTransition) {
      setTheme(targetTheme);
      return;
    }

    // Get click coordinates, fallback to center
    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? window.innerHeight / 2;
    
    // Calculate distance to the furthest corner to ensure full screen coverage
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Pass dynamic variables to our CSS animation
    document.documentElement.style.setProperty('--theme-reveal-x', `${x}px`);
    document.documentElement.style.setProperty('--theme-reveal-y', `${y}px`);
    document.documentElement.style.setProperty('--theme-reveal-r', `${endRadius}px`);

    // Trigger the native view transition
    document.startViewTransition(() => {
      setTheme(targetTheme);
    });
  }, [theme]);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
