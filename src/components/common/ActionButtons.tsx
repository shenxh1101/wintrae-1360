import React, { CSSProperties } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { useA11y } from '../../hooks/useA11y';

export interface IconButtonProps {
  isActive?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

const CheckIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const StarIcon: React.FC<{ size: number; filled: boolean }> = ({ size, filled }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const FlagIcon: React.FC<{ size: number; active: boolean }> = ({ size, active }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

const RedoIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const ArrowLeftIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const ArrowRightIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

interface BaseIconButtonProps {
  isActive?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

function BaseIconButton({
  children,
  isActive = false,
  onClick,
  size = 'md',
  ariaType,
  ariaLabel,
  style,
  disabled = false,
}: BaseIconButtonProps & { children: React.ReactNode; ariaType: [string, string] }) {
  const { theme } = useTheme();
  const { getAriaProps } = useA11y();

  const paddingMap: Record<string, string> = {
    sm: '6px',
    md: '8px',
    lg: '10px',
  };

  const defaultColor = theme.colors.textSecondary;
  const activeBg = `${theme.colors.warning}20`;
  const activeColor = theme.colors.warning;

  const [defaultType, activeType] = ariaType;
  const ariaProps = getAriaProps(
    isActive ? activeType : defaultType,
    ariaLabel
  );

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...ariaProps}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: paddingMap[size],
        backgroundColor: isActive ? activeBg : 'transparent',
        border: 'none',
        borderRadius: theme.borderRadius.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: isActive ? activeColor : defaultColor,
        opacity: disabled ? 0.5 : 1,
        transition: `all ${theme.transitions.fast}`,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = isActive ? `${theme.colors.warning}30` : theme.colors.background;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isActive ? activeBg : 'transparent';
      }}
    >
      {children}
    </button>
  );
}

export const CollectButton: React.FC<IconButtonProps> = (props) => {
  const sizeMap = { sm: 16, md: 20, lg: 24 };
  const iconSize = sizeMap[props.size || 'md'];
  return (
    <BaseIconButton {...props} ariaType={['collect-button', 'collected-button']}>
      <StarIcon size={iconSize} filled={props.isActive ?? false} />
    </BaseIconButton>
  );
};

export const MarkButton: React.FC<IconButtonProps> = (props) => {
  const sizeMap = { sm: 16, md: 20, lg: 24 };
  const iconSize = sizeMap[props.size || 'md'];
  return (
    <BaseIconButton {...props} ariaType={['mark-button', 'marked-button']}>
      <FlagIcon size={iconSize} active={props.isActive ?? false} />
    </BaseIconButton>
  );
};

export const SubmitButtonIcon: React.FC<IconButtonProps> = (props) => {
  const sizeMap = { sm: 16, md: 20, lg: 24 };
  const iconSize = sizeMap[props.size || 'md'];
  return (
    <BaseIconButton {...props} ariaType={['submit-button', 'submit-button']}>
      <CheckIcon size={iconSize} />
    </BaseIconButton>
  );
};

export const RedoButton: React.FC<IconButtonProps> = (props) => {
  const sizeMap = { sm: 16, md: 20, lg: 24 };
  const iconSize = sizeMap[props.size || 'md'];
  return (
    <BaseIconButton {...props} ariaType={['submit-button', 'submit-button']}>
      <RedoIcon size={iconSize} />
    </BaseIconButton>
  );
};

export interface NavButtonProps {
  direction: 'prev' | 'next';
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  style?: CSSProperties;
}

export const NavButton: React.FC<NavButtonProps> = ({
  direction,
  onClick,
  disabled = false,
  size = 'md',
  ariaLabel,
  style,
}) => {
  const { theme } = useTheme();
  const { getAriaProps } = useA11y();

  const sizeMap = { sm: 16, md: 20, lg: 24 };
  const iconSize = sizeMap[size];
  const Icon = direction === 'prev' ? ArrowLeftIcon : ArrowRightIcon;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? (direction === 'prev' ? '上一题' : '下一题')}
      {...getAriaProps('option', ariaLabel ?? (direction === 'prev' ? '上一题' : '下一题'))}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        padding: `${size === 'sm' ? '6px 12px' : size === 'lg' ? '10px 20px' : '8px 16px'}`,
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? theme.colors.disabledText : theme.colors.text,
        fontSize: theme.fontSize.base,
        fontWeight: theme.fontWeights.medium,
        transition: `all ${theme.transitions.fast}`,
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = theme.colors.background;
          e.currentTarget.style.borderColor = theme.colors.primary;
          e.currentTarget.style.color = theme.colors.primary;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.surface;
        e.currentTarget.style.borderColor = theme.colors.border;
        e.currentTarget.style.color = theme.colors.text;
      }}
    >
      {direction === 'prev' && <Icon size={iconSize} />}
      <span>{direction === 'prev' ? '上一题' : '下一题'}</span>
      {direction === 'next' && <Icon size={iconSize} />}
    </button>
  );
};

CollectButton.displayName = 'CollectButton';
MarkButton.displayName = 'MarkButton';
SubmitButtonIcon.displayName = 'SubmitButtonIcon';
RedoButton.displayName = 'RedoButton';
NavButton.displayName = 'NavButton';
