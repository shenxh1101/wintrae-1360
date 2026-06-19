import React, { CSSProperties, ReactNode, useMemo } from 'react';
import { useTheme } from '../../theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'ghost' | 'outline';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  ariaLabel?: string;
  tabIndex?: number;
  className?: string;
  style?: CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  icon,
  iconPosition = 'left',
  ariaLabel,
  tabIndex,
  className,
  style,
}) => {
  const { theme } = useTheme();

  const baseStyle: CSSProperties = useMemo(() => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontWeight: theme.fontWeights.medium,
    fontFamily: 'inherit',
    transition: `all ${theme.transitions.normal}`,
    outline: 'none',
    userSelect: 'none',
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    ...style,
  }), [theme, disabled, loading, fullWidth, style]);

  const sizeStyles: Record<ButtonSize, CSSProperties> = {
    xs: {
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      fontSize: theme.fontSize.xs,
      borderRadius: theme.borderRadius.sm,
      minHeight: '28px',
    },
    sm: {
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      fontSize: theme.fontSize.sm,
      borderRadius: theme.borderRadius.sm,
      minHeight: '36px',
    },
    md: {
      padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
      fontSize: theme.fontSize.base,
      borderRadius: theme.borderRadius.md,
      minHeight: '42px',
    },
    lg: {
      padding: `${theme.spacing.md} ${theme.spacing.xl}`,
      fontSize: theme.fontSize.lg,
      borderRadius: theme.borderRadius.md,
      minHeight: '48px',
    },
    xl: {
      padding: `${theme.spacing.md} ${theme.spacing.xl}`,
      fontSize: theme.fontSize.xl,
      borderRadius: theme.borderRadius.lg,
      minHeight: '56px',
    },
  };

  const variantStyles: Record<ButtonVariant, CSSProperties> = {
    primary: {
      backgroundColor: theme.colors.primary,
      color: '#ffffff',
      boxShadow: theme.shadows.sm,
    },
    secondary: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      border: `1px solid ${theme.colors.border}`,
    },
    success: {
      backgroundColor: theme.colors.success,
      color: '#ffffff',
      boxShadow: theme.shadows.sm,
    },
    error: {
      backgroundColor: theme.colors.error,
      color: '#ffffff',
      boxShadow: theme.shadows.sm,
    },
    warning: {
      backgroundColor: theme.colors.warning,
      color: '#ffffff',
      boxShadow: theme.shadows.sm,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.primary,
    },
    outline: {
      backgroundColor: 'transparent',
      color: theme.colors.primary,
      border: `2px solid ${theme.colors.primary}`,
    },
  };

  const hoverStyles: CSSProperties = useMemo(() => {
    if (disabled || loading) return {};
    switch (variant) {
      case 'primary':
        return { backgroundColor: theme.colors.primaryDark };
      case 'success':
        return { filter: 'brightness(0.95)' };
      case 'error':
        return { filter: 'brightness(0.95)' };
      case 'warning':
        return { filter: 'brightness(0.95)' };
      case 'secondary':
        return { backgroundColor: theme.colors.background };
      case 'ghost':
        return { backgroundColor: `${theme.colors.primary}15` };
      case 'outline':
        return { backgroundColor: `${theme.colors.primary}10` };
      default:
        return {};
    }
  }, [variant, disabled, loading, theme]);

  const buttonStyle: CSSProperties = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    Object.assign(e.currentTarget.style, hoverStyles);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    Object.keys(hoverStyles).forEach(key => {
      e.currentTarget.style[key as any] = '';
    });
  };

  return (
    <button
      type={type}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      className={className}
      style={buttonStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {loading && (
        <span
          style={{
            display: 'inline-block',
            width: size === 'xs' || size === 'sm' ? '14px' : '18px',
            height: size === 'xs' || size === 'sm' ? '14px' : '18px',
            border: `2px solid ${variant === 'ghost' || variant === 'outline' ? theme.colors.primary : 'currentColor'}`,
            borderTopColor: 'transparent',
            borderRadius: theme.borderRadius.full,
            animation: 'edu-spin 0.8s linear infinite',
          }}
        />
      )}
      {!loading && icon && iconPosition === 'left' && <span>{icon}</span>}
      {children}
      {!loading && icon && iconPosition === 'right' && <span>{icon}</span>}
    </button>
  );
};

Button.displayName = 'Button';
