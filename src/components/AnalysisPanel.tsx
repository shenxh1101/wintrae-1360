import React, { CSSProperties, useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useA11y } from '../hooks/useA11y';
import type { Question, QuestionResult } from '../types';
import { Button } from './common/Button';

export interface AnalysisPanelProps {
  question: Question;
  result: QuestionResult;
  onRedo?: () => void;
  className?: string;
  style?: CSSProperties;
}

const CheckCircleIcon: React.FC<{ size: number }> = ({ size }) => (
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
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const XCircleIcon: React.FC<{ size: number }> = ({ size }) => (
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
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const ClockIcon: React.FC<{ size: number }> = ({ size }) => (
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
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const BookIcon: React.FC<{ size: number }> = ({ size }) => (
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
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const AlertIcon: React.FC<{ size: number }> = ({ size }) => (
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
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const TargetIcon: React.FC<{ size: number }> = ({ size }) => (
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
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

function formatTimeSpent(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins} 分 ${secs} 秒` : `${mins} 分钟`;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  question,
  result,
  onRedo,
  className,
  style,
}) => {
  const { theme } = useTheme();
  const { getAriaProps, announce } = useA11y();

  const { score, isCorrect, errorReasons, timeSpent } = result;

  const scorePercentage = useMemo(() => {
    if (score.total === 0) return 100;
    return Math.round((score.earned / score.total) * 100);
  }, [score]);

  const scoreColor = useMemo(() => {
    if (scorePercentage >= 80) return theme.colors.success;
    if (scorePercentage >= 60) return theme.colors.warning;
    return theme.colors.error;
  }, [scorePercentage, theme]);

  const handleRedo = () => {
    announce('开始重做本题');
    onRedo?.();
  };

  const containerStyle: CSSProperties = {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.lg,
    animation: 'edu-fadeIn 0.3s ease-out',
    ...style,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.border}`,
  };

  const resultBadgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.full,
    fontWeight: theme.fontWeights.semibold,
    fontSize: theme.fontSize.base,
    color: '#ffffff',
    backgroundColor: isCorrect ? theme.colors.success : theme.colors.error,
    animation: isCorrect ? 'edu-pulse 2s ease-in-out infinite' : 'edu-shake 0.5s ease-out',
  };

  const infoGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  };

  const infoCardStyle: CSSProperties = {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.border}`,
  };

  const infoLabelStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  };

  const infoValueStyle: CSSProperties = {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text,
  };

  const sectionStyle: CSSProperties = {
    marginBottom: theme.spacing.lg,
  };

  const sectionTitleStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  };

  const scoreBarContainerStyle: CSSProperties = {
    width: '100%',
    height: '12px',
    backgroundColor: theme.colors.disabled,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginTop: theme.spacing.sm,
  };

  const scoreBarStyle: CSSProperties = {
    height: '100%',
    backgroundColor: scoreColor,
    width: `${scorePercentage}%`,
    borderRadius: theme.borderRadius.full,
    transition: `width ${theme.transitions.slow} ease-out`,
  };

  const errorListStyle: CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  };

  const errorItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: `${theme.colors.error}10`,
    borderLeft: `3px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
    color: theme.colors.text,
  };

  const detailTableStyle: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.fontSize.sm,
  };

  const detailThStyle: CSSProperties = {
    padding: theme.spacing.sm,
    textAlign: 'left',
    backgroundColor: theme.colors.background,
    borderBottom: `1px solid ${theme.colors.border}`,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.textSecondary,
  };

  const detailTdStyle: CSSProperties = {
    padding: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.border}`,
    color: theme.colors.text,
  };

  const analysisContentStyle: CSSProperties = {
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}08`,
    borderLeft: `3px solid ${theme.colors.primary}`,
    borderRadius: theme.borderRadius.sm,
    lineHeight: 1.7,
    color: theme.colors.text,
    whiteSpace: 'pre-wrap',
  };

  const footerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTop: `1px solid ${theme.colors.border}`,
  };

  return (
    <div
      className={className}
      style={containerStyle}
      {...getAriaProps('analysis-panel')}
    >
      <div style={headerStyle}>
        <span style={resultBadgeStyle}>
          {isCorrect ? (
            <>
              <CheckCircleIcon size={20} />
              回答正确
            </>
          ) : (
            <>
              <XCircleIcon size={20} />
              回答错误
            </>
          )}
        </span>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: 4 }}>
            得分
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: theme.spacing.sm }}>
            <span style={{ fontSize: theme.fontSize['2xl'], fontWeight: theme.fontWeights.bold, color: scoreColor }}>
              {score.earned}
            </span>
            <span style={{ fontSize: theme.fontSize.base, color: theme.colors.textSecondary }}>
              / {score.total} 分
            </span>
          </div>
          <div style={scoreBarContainerStyle} aria-hidden="true">
            <div style={scoreBarStyle} />
          </div>
        </div>
      </div>

      <div style={infoGridStyle}>
        <div style={infoCardStyle}>
          <div style={infoLabelStyle}>
            <TargetIcon size={14} />
            正确率
          </div>
          <div style={{ ...infoValueStyle, color: scoreColor }}>
            {score.correctCount} / {score.totalCount}
          </div>
        </div>

        <div style={infoCardStyle}>
          <div style={infoLabelStyle}>
            <ClockIcon size={14} />
            用时
          </div>
          <div style={infoValueStyle}>
            {formatTimeSpent(timeSpent)}
          </div>
        </div>

        <div style={infoCardStyle}>
          <div style={infoLabelStyle}>
            <BookIcon size={14} />
            题目状态
          </div>
          <div style={{ ...infoValueStyle, fontSize: theme.fontSize.lg }}>
            {result.isMarked && (
              <span style={{ color: theme.colors.warning, marginRight: theme.spacing.sm }}>📌 已标记</span>
            )}
            {result.isCollected && (
              <span style={{ color: theme.colors.warning }}>⭐ 已收藏</span>
            )}
            {!result.isMarked && !result.isCollected && (
              <span style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.base }}>无</span>
            )}
          </div>
        </div>
      </div>

      {errorReasons && errorReasons.length > 0 && (
        <div style={sectionStyle}>
          <div style={{ ...sectionTitleStyle, color: theme.colors.error }}>
            <AlertIcon size={20} />
            错误原因
          </div>
          <ul style={errorListStyle}>
            {errorReasons.map((reason, index) => (
              <li key={index} style={errorItemStyle}>
                <span style={{ color: theme.colors.error, flexShrink: 0 }}>
                  <AlertIcon size={16} />
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {score.details && score.details.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <TargetIcon size={20} />
            答题详情
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={detailTableStyle} role="table" aria-label="答题详情表">
              <thead>
                <tr>
                  <th style={detailThStyle}>序号</th>
                  <th style={detailThStyle}>结果</th>
                  <th style={detailThStyle}>您的答案</th>
                  <th style={detailThStyle}>正确答案</th>
                  <th style={detailThStyle}>备注</th>
                </tr>
              </thead>
              <tbody>
                {score.details.map((detail, index) => (
                  <tr key={detail.id} style={{ backgroundColor: detail.correct ? `${theme.colors.success}05` : `${theme.colors.error}05` }}>
                    <td style={detailTdStyle}>{index + 1}</td>
                    <td style={{ ...detailTdStyle, color: detail.correct ? theme.colors.success : theme.colors.error, fontWeight: theme.fontWeights.medium }}>
                      {detail.correct ? '✓ 正确' : '✗ 错误'}
                    </td>
                    <td style={detailTdStyle}>
                      {detail.userAnswer === null || detail.userAnswer === undefined || detail.userAnswer === ''
                        ? <span style={{ color: theme.colors.disabledText }}>（空）</span>
                        : String(detail.userAnswer)}
                    </td>
                    <td style={{ ...detailTdStyle, color: theme.colors.success, fontWeight: theme.fontWeights.medium }}>
                      {String(detail.correctAnswer ?? '（空）')}
                    </td>
                    <td style={{ ...detailTdStyle, color: theme.colors.textSecondary }}>
                      {detail.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {question.analysis && question.analysis.trim().length > 0 && (
        <div style={sectionStyle}>
          <div style={{ ...sectionTitleStyle, color: theme.colors.primary }}>
            <BookIcon size={20} />
            题目解析
          </div>
          <div style={analysisContentStyle}>
            {question.analysis}
          </div>
        </div>
      )}

      <div style={footerStyle}>
        {onRedo && (
          <Button
            variant="outline"
            icon={<span style={{ display: 'inline-flex' }}>↻</span>}
            onClick={handleRedo}
          >
            重做本题
          </Button>
        )}
      </div>
    </div>
  );
};

AnalysisPanel.displayName = 'AnalysisPanel';
