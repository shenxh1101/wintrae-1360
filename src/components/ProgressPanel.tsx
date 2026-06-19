import React, { CSSProperties, useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useA11y } from '../hooks/useA11y';
import type { ExerciseProgress, QuestionProgressStatus } from '../types';

export interface ProgressPanelProps {
  progress: ExerciseProgress;
  currentIndex: number;
  onJump?: (index: number) => void;
  showLegend?: boolean;
  showStats?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

const statusColors: Record<QuestionProgressStatus, { bg: string; border: string; text: string }> = {
  unanswered: { bg: 'transparent', border: 'border', text: 'textSecondary' },
  answered: { bg: 'primaryLight', border: 'primary', text: 'primary' },
  submitted: { bg: 'successLight', border: 'success', text: 'success' },
  wrong: { bg: 'errorLight', border: 'error', text: 'error' },
};

const statusLabels: Record<QuestionProgressStatus, string> = {
  unanswered: '未作答',
  answered: '已作答',
  submitted: '已正确',
  wrong: '已答错',
};

export const ProgressPanel: React.FC<ProgressPanelProps> = ({
  progress,
  currentIndex,
  onJump,
  showLegend = true,
  showStats = true,
  disabled = false,
  className,
  style,
}) => {
  const { theme } = useTheme();
  const { announce, getAriaProps } = useA11y();

  const { items, total, answeredCount, submittedCount, correctCount, wrongCount, totalScore, earnedScore } = progress;

  const accuracy = useMemo(() => {
    if (submittedCount === 0) return 0;
    return Math.round((correctCount / submittedCount) * 100);
  }, [submittedCount, correctCount]);

  const handleJump = (index: number) => {
    if (disabled) return;
    announce(`跳转到第 ${index + 1} 题`);
    onJump?.(index);
  };

  const containerStyle: CSSProperties = {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border}`,
    ...style,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  };

  const titleStyle: CSSProperties = {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text,
    margin: 0,
  };

  const statsStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  };

  const statItemStyle: CSSProperties = {
    textAlign: 'center',
  };

  const statValueStyle: CSSProperties = {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.primary,
  };

  const statLabelStyle: CSSProperties = {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: '2px',
  };

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
    gap: theme.spacing.sm,
    marginBottom: showLegend ? theme.spacing.md : 0,
  };

  const getItemStyle = (item: typeof items[0], isCurrent: boolean): CSSProperties => {
    const colorKey = statusColors[item.status];
    const bgColor = colorKey.bg === 'transparent' ? 'transparent' : `${theme.colors[colorKey.bg as keyof typeof theme.colors] as string}40`;
    const borderColor = theme.colors[colorKey.border as keyof typeof theme.colors] as string || theme.colors.border;
    const textColor = theme.colors[colorKey.text as keyof typeof theme.colors] as string || theme.colors.text;

    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      aspectRatio: '1 / 1',
      minWidth: '36px',
      minHeight: '36px',
      border: `2px solid ${borderColor}`,
      backgroundColor: isCurrent ? `${theme.colors.primary}20` : bgColor,
      color: isCurrent ? theme.colors.primary : textColor,
      borderRadius: theme.borderRadius.md,
      fontSize: theme.fontSize.sm,
      fontWeight: isCurrent ? theme.fontWeights.bold : theme.fontWeights.medium,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: `all ${theme.transitions.fast}`,
      opacity: disabled ? 0.5 : 1,
      position: 'relative',
      touchAction: 'manipulation',
    };
  };

  const currentIndicatorStyle: CSSProperties = {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: theme.colors.primary,
    border: `2px solid ${theme.colors.surface}`,
  };

  const markDotStyle: CSSProperties = {
    position: 'absolute',
    bottom: '-2px',
    right: '50%',
    transform: 'translateX(50%)',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: theme.colors.warning,
  };

  const legendStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    paddingTop: theme.spacing.sm,
    borderTop: `1px solid ${theme.colors.border}`,
  };

  const legendItemStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
  };

  const legendDotStyle = (status: QuestionProgressStatus): CSSProperties => {
    const colorKey = statusColors[status];
    const bgColor = colorKey.bg === 'transparent' ? 'transparent' : `${theme.colors[colorKey.bg as keyof typeof theme.colors] as string}40`;
    const borderColor = theme.colors[colorKey.border as keyof typeof theme.colors] as string;
    return {
      width: '14px',
      height: '14px',
      borderRadius: theme.borderRadius.sm,
      border: `2px solid ${borderColor}`,
      backgroundColor: bgColor,
    };
  };

  return (
    <div
      className={className}
      style={containerStyle}
      role="region"
      aria-label="答题进度"
    >
      <div style={headerStyle}>
        <h3 style={titleStyle}>答题进度</h3>
        <span style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary }}>
          第 {currentIndex + 1} / {total} 题
        </span>
      </div>

      {showStats && (
        <div style={statsStyle}>
          <div style={statItemStyle}>
            <div style={statValueStyle}>{answeredCount}</div>
            <div style={statLabelStyle}>已作答</div>
          </div>
          <div style={statItemStyle}>
            <div style={{ ...statValueStyle, color: theme.colors.success }}>{submittedCount}</div>
            <div style={statLabelStyle}>已提交</div>
          </div>
          <div style={statItemStyle}>
            <div style={{ ...statValueStyle, color: theme.colors.error }}>{wrongCount}</div>
            <div style={statLabelStyle}>错误</div>
          </div>
          <div style={statItemStyle}>
            <div style={{ ...statValueStyle, color: theme.colors.warning }}>{accuracy}%</div>
            <div style={statLabelStyle}>正确率</div>
          </div>
          <div style={statItemStyle}>
            <div style={{ ...statValueStyle, color: theme.colors.primary }}>{earnedScore.toFixed(1)}</div>
            <div style={statLabelStyle}>得分 / {totalScore}</div>
          </div>
        </div>
      )}

      <div
        style={gridStyle}
        role="listbox"
        aria-label="题目列表，点击可跳转"
      >
        {items.map((item, index) => {
          const isCurrent = index === currentIndex;
          return (
            <button
              key={item.questionId}
              type="button"
              onClick={() => handleJump(index)}
              disabled={disabled}
              style={getItemStyle(item, isCurrent)}
              aria-label={`第 ${index + 1} 题，${statusLabels[item.status]}${isCurrent ? '，当前题' : ''}${item.isMarked ? '，已标记' : ''}${item.isCollected ? '，已收藏' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              {...getAriaProps('option', `第 ${index + 1} 题`)}
            >
              {index + 1}
              {isCurrent && <span style={currentIndicatorStyle} aria-hidden="true" />}
              {item.isMarked && <span style={markDotStyle} aria-hidden="true" title="已标记" />}
            </button>
          );
        })}
      </div>

      {showLegend && (
        <div style={legendStyle}>
          <div style={legendItemStyle}>
            <span style={legendDotStyle('unanswered')} aria-hidden="true" />
            <span>未作答</span>
          </div>
          <div style={legendItemStyle}>
            <span style={legendDotStyle('answered')} aria-hidden="true" />
            <span>已作答</span>
          </div>
          <div style={legendItemStyle}>
            <span style={legendDotStyle('submitted')} aria-hidden="true" />
            <span>答对</span>
          </div>
          <div style={legendItemStyle}>
            <span style={legendDotStyle('wrong')} aria-hidden="true" />
            <span>答错</span>
          </div>
        </div>
      )}
    </div>
  );
};

ProgressPanel.displayName = 'ProgressPanel';
