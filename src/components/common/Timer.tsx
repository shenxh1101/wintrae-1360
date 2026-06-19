import React, { CSSProperties, useEffect } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { useA11y } from '../../hooks/useA11y';

export interface TimerProps {
  time: number;
  formattedTime: string;
  remainingTime?: number;
  formattedRemainingTime?: string;
  progress?: number;
  isRunning?: boolean;
  showIcon?: boolean;
  showProgressBar?: boolean;
  warnThreshold?: number;
  size?: 'sm' | 'md' | 'lg';
  onTimeout?: () => void;
  ariaLabel?: string;
  style?: CSSProperties;
}

export const Timer: React.FC<TimerProps> = ({
  formattedTime,
  remainingTime,
  formattedRemainingTime,
  progress,
  isRunning = false,
  showIcon = true,
  showProgressBar = true,
  warnThreshold = 30,
  size = 'md',
  onTimeout,
  ariaLabel,
  style,
}) => {
  const { theme } = useTheme();
  const { getAriaProps } = useA11y();

  const showWarning = remainingTime !== undefined && remainingTime <= warnThreshold;

  const sizeStyles: Record<string, CSSProperties> = {
    sm: { fontSize: theme.fontSize.sm, minWidth: '80px' },
    md: { fontSize: theme.fontSize.base, minWidth: '100px' },
    lg: { fontSize: theme.fontSize.lg, minWidth: '120px' },
  };

  const color = showWarning ? theme.colors.error : theme.colors.text;
  const bgColor = showWarning ? `${theme.colors.error}15` : theme.colors.surface;
  const borderColor = showWarning ? theme.colors.errorLight : theme.colors.border;

  useEffect(() => {
    if (remainingTime === 0 && onTimeout) {
      onTimeout();
    }
  }, [remainingTime, onTimeout]);

  const displayTime = formattedRemainingTime ?? formattedTime;
  const labelText = ariaLabel ?? (isRunning ? '计时器运行中' : '计时器');

  return (
    <div
      {...getAriaProps('timer')}
      aria-label={labelText}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xs,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: theme.borderRadius.md,
          color,
          fontWeight: theme.fontWeights.medium,
          fontVariantNumeric: 'tabular-nums',
          transition: `all ${theme.transitions.fast}`,
          ...sizeStyles[size],
        }}
      >
        {showIcon && (
          <span
            style={{
              display: 'inline-flex',
              animation: isRunning ? 'edu-pulse 2s ease-in-out infinite' : 'none',
            }}
            aria-hidden="true"
          >
            <svg
              width={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
              height={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
        )}
        <span style={{ flex: 1, textAlign: 'center' }}>{displayTime}</span>
      </div>
      {showProgressBar && progress !== undefined && (
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`完成进度 ${Math.round(progress)}%`}
          style={{
            height: '4px',
            backgroundColor: theme.colors.border,
            borderRadius: theme.borderRadius.full,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: showWarning ? theme.colors.error : theme.colors.primary,
              transition: `width ${theme.transitions.normal}`,
            }}
          />
        </div>
      )}
    </div>
  );
};

Timer.displayName = 'Timer';
