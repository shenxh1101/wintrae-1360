import type { ThemeConfig, ThemeColors } from '../types';

export const defaultLightColors: ThemeColors = {
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  success: '#16a34a',
  successLight: '#22c55e',
  error: '#dc2626',
  errorLight: '#ef4444',
  warning: '#d97706',
  warningLight: '#f59e0b',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  disabled: '#f1f5f9',
  disabledText: '#94a3b8',
};

export const defaultDarkColors: ThemeColors = {
  primary: '#60a5fa',
  primaryLight: '#93c5fd',
  primaryDark: '#3b82f6',
  success: '#4ade80',
  successLight: '#86efac',
  error: '#f87171',
  errorLight: '#fca5a5',
  warning: '#fbbf24',
  warningLight: '#fcd34d',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#334155',
  disabled: '#1e293b',
  disabledText: '#64748b',
};

export const defaultTheme: ThemeConfig = {
  colors: defaultLightColors,
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },
  isDark: false,
};

export const darkTheme: ThemeConfig = {
  ...defaultTheme,
  colors: defaultDarkColors,
  isDark: true,
};

export function createTheme(overrides: Partial<ThemeConfig> = {}): ThemeConfig {
  const baseTheme = overrides.isDark ? darkTheme : defaultTheme;
  return {
    ...baseTheme,
    ...overrides,
    colors: {
      ...baseTheme.colors,
      ...overrides.colors,
    },
    borderRadius: {
      ...baseTheme.borderRadius,
      ...overrides.borderRadius,
    },
    spacing: {
      ...baseTheme.spacing,
      ...overrides.spacing,
    },
    fontSize: {
      ...baseTheme.fontSize,
      ...overrides.fontSize,
    },
    fontWeights: {
      ...baseTheme.fontWeights,
      ...overrides.fontWeights,
    },
    shadows: {
      ...baseTheme.shadows,
      ...overrides.shadows,
    },
    transitions: {
      ...baseTheme.transitions,
      ...overrides.transitions,
    },
  };
}
