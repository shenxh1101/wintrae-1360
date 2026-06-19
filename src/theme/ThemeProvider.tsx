import React, { createContext, useContext, useMemo, useCallback, useEffect, useState, CSSProperties } from 'react';
import type { ThemeConfig } from '../types';
import { createTheme, defaultTheme } from './defaultTheme';

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: Partial<ThemeConfig> | ((prev: ThemeConfig) => Partial<ThemeConfig>)) => void;
  toggleDarkMode: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: defaultTheme,
      setTheme: () => {},
      toggleDarkMode: () => {},
      isDark: false,
    };
  }
  return context;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  customTheme?: Partial<ThemeConfig>;
  defaultDarkMode?: boolean;
}

function generateCSSVariables(theme: ThemeConfig): Record<string, string> {
  const vars: Record<string, string> = {};
  
  Object.entries(theme.colors).forEach(([key, value]) => {
    vars[`--edu-color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value;
  });
  
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    vars[`--edu-radius-${key}`] = value;
  });
  
  Object.entries(theme.spacing).forEach(([key, value]) => {
    vars[`--edu-spacing-${key}`] = value;
  });
  
  Object.entries(theme.fontSize).forEach(([key, value]) => {
    vars[`--edu-font-size-${key}`] = value;
  });
  
  Object.entries(theme.fontWeights).forEach(([key, value]) => {
    vars[`--edu-font-weight-${key}`] = String(value);
  });
  
  Object.entries(theme.shadows).forEach(([key, value]) => {
    vars[`--edu-shadow-${key}`] = value;
  });
  
  Object.entries(theme.transitions).forEach(([key, value]) => {
    vars[`--edu-transition-${key}`] = value;
  });
  
  return vars;
}

export function ThemeProvider({ children, customTheme, defaultDarkMode = false }: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(defaultDarkMode);
  const [themeOverrides, setThemeOverrides] = useState<Partial<ThemeConfig>>(customTheme || {});

  const theme = useMemo(() => {
    return createTheme({
      ...themeOverrides,
      isDark,
      ...customTheme,
    });
  }, [isDark, themeOverrides, customTheme]);

  const setTheme = useCallback((newTheme: Partial<ThemeConfig> | ((prev: ThemeConfig) => Partial<ThemeConfig>)) => {
    setThemeOverrides(prev => {
      const overrides = typeof newTheme === 'function' ? newTheme(createTheme({ ...prev, isDark })) : newTheme;
      return { ...prev, ...overrides };
    });
  }, [isDark]);

  const toggleDarkMode = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  const cssVariables = useMemo(() => generateCSSVariables(theme), [theme]);

  const containerStyle: CSSProperties = {
    ...cssVariables,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: theme.fontSize.base,
    lineHeight: 1.5,
    minHeight: '100%',
    width: '100%',
  } as CSSProperties;

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [cssVariables]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleDarkMode,
    isDark,
  }), [theme, setTheme, toggleDarkMode, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      <div style={containerStyle} data-edu-theme={isDark ? 'dark' : 'light'}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

ThemeProvider.displayName = 'ThemeProvider';
