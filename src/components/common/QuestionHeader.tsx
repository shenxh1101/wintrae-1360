import React, { CSSProperties } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import type { Question, QuestionType } from '../../types';

interface QuestionHeaderProps {
  question: Question;
  index?: number;
  total?: number;
  showTags?: boolean;
  showDifficulty?: boolean;
  style?: CSSProperties;
}

const typeLabels: Record<QuestionType, string> = {
  'multiple-choice': '选择题',
  'fill-blank': '填空题',
  'matching': '连线题',
  'sorting': '排序题',
  'listening': '听力题',
};

const typeColors: Record<QuestionType, string> = {
  'multiple-choice': '#2563eb',
  'fill-blank': '#7c3aed',
  'matching': '#0891b2',
  'sorting': '#059669',
  'listening': '#d97706',
};

const DifficultyStars: React.FC<{ level: number; size?: number }> = ({ level, size = 14 }) => {
  const { theme } = useTheme();
  const maxLevel = 5;
  const displayLevel = Math.max(1, Math.min(maxLevel, level));

  return (
    <div style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
      {Array.from({ length: maxLevel }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i < displayLevel ? theme.colors.warning : 'none'}
          stroke={theme.colors.warning}
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
};

export const QuestionHeader: React.FC<QuestionHeaderProps> = ({
  question,
  index,
  total,
  showTags = true,
  showDifficulty = true,
  style,
}) => {
  const { theme } = useTheme();
  const color = typeColors[question.type];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderBottom: `1px solid ${theme.colors.border}`,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            backgroundColor: `${color}15`,
            color: color,
            borderRadius: theme.borderRadius.sm,
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeights.medium,
          }}
        >
          {typeLabels[question.type]}
          {question.type === 'multiple-choice' && 'isMultiple' in question && question.isMultiple && (
            <span style={{ marginLeft: theme.spacing.xs }}>（多选）</span>
          )}
        </span>

        {index !== undefined && total !== undefined && (
          <span
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.textSecondary,
            }}
          >
            第 {index + 1} / {total} 题
          </span>
        )}

        {question.score !== undefined && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              backgroundColor: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.sm,
              fontSize: theme.fontSize.sm,
              color: theme.colors.textSecondary,
            }}
          >
            {question.score} 分
          </span>
        )}

        {showDifficulty && question.difficulty !== undefined && (
          <DifficultyStars level={question.difficulty} />
        )}
      </div>

      <h2
        style={{
          margin: 0,
          fontSize: theme.fontSize.xl,
          fontWeight: theme.fontWeights.semibold,
          color: theme.colors.text,
          lineHeight: 1.5,
        }}
      >
        {question.title}
      </h2>

      {question.description && (
        <p
          style={{
            margin: 0,
            fontSize: theme.fontSize.base,
            color: theme.colors.textSecondary,
            lineHeight: 1.6,
          }}
        >
          {question.description}
        </p>
      )}

      {showTags && question.tags && question.tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
          }}
        >
          {question.tags.map((tag, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                backgroundColor: theme.colors.background,
                color: theme.colors.textSecondary,
                borderRadius: theme.borderRadius.full,
                fontSize: theme.fontSize.sm,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

QuestionHeader.displayName = 'QuestionHeader';
