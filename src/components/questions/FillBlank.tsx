import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { useA11y } from '../../hooks/useA11y';
import type {
  FillBlankQuestion as FillBlankQuestionType,
  FillBlankAnswer,
  ScoreDetail,
  AnswerData,
  FillBlankItem,
} from '../../types';

export interface FillBlankProps {
  question: FillBlankQuestionType;
  value?: FillBlankAnswer | null;
  onChange?: (answer: FillBlankAnswer) => void;
  onAnswerDataChange?: (answer: AnswerData) => void;
  isSubmitted?: boolean;
  scoreResult?: ScoreDetail | null;
  readOnly?: boolean;
  disabled?: boolean;
  showCorrectAnswer?: boolean;
  style?: CSSProperties;
}

interface BlankInputProps {
  blank: FillBlankItem;
  index: number;
  value: string;
  onChange: (value: string) => void;
  isSubmitted: boolean;
  showCorrect: boolean;
  correct: boolean;
  correctAnswer: string;
  allAnswers: string[];
  disabled: boolean;
  readOnly: boolean;
}

const BlankInput: React.FC<BlankInputProps> = ({
  blank,
  index,
  value,
  onChange,
  isSubmitted,
  showCorrect,
  correct,
  correctAnswer,
  allAnswers,
  disabled,
  readOnly,
}) => {
  const { theme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const width = useMemo(() => {
    const maxLen = Math.max(
      ...allAnswers.map(a => a.length),
      value.length,
      blank.placeholder?.length || 4
    );
    return `${Math.max(6, maxLen + 2)}ch`;
  }, [allAnswers, value, blank.placeholder]);

  let borderColor = theme.colors.border;
  let bgColor = theme.colors.surface;
  let textColor = theme.colors.text;

  if (isSubmitted && showCorrect) {
    if (correct) {
      borderColor = theme.colors.success;
      bgColor = `${theme.colors.success}10`;
      textColor = theme.colors.success;
    } else {
      borderColor = theme.colors.error;
      bgColor = `${theme.colors.error}10`;
      textColor = theme.colors.error;
    }
  } else if (isFocused) {
    borderColor = theme.colors.primary;
    bgColor = `${theme.colors.primary}05`;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: `0 ${theme.spacing.xs}`,
        position: 'relative',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: theme.spacing.xs,
        }}
      >
        <span
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.textSecondary,
            fontWeight: theme.fontWeights.medium,
          }}
        >
          {index + 1}.
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled || readOnly || isSubmitted}
          placeholder={blank.placeholder || '请输入答案'}
          aria-label={`第${index + 1}个填空`}
          style={{
            width,
            minWidth: '80px',
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            backgroundColor: bgColor,
            border: `2px solid ${borderColor}`,
            borderRadius: theme.borderRadius.md,
            fontSize: theme.fontSize.base,
            color: textColor,
            transition: `all ${theme.transitions.fast}`,
            outline: 'none',
            fontFamily: 'inherit',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        />
        {isSubmitted && showCorrect && (
          <span
            style={{
              color: correct ? theme.colors.success : theme.colors.error,
              fontSize: '18px',
              fontWeight: 'bold',
            }}
            aria-hidden="true"
          >
            {correct ? '✓' : '✗'}
          </span>
        )}
      </span>
      {isSubmitted && showCorrect && !correct && (
        <div
          className="edu-slide-in"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: theme.spacing.xs,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.success}`,
            borderRadius: theme.borderRadius.sm,
            fontSize: theme.fontSize.sm,
            color: theme.colors.success,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            zIndex: 10,
            boxShadow: theme.shadows.sm,
          }}
        >
          正确答案: {correctAnswer}
        </div>
      )}
    </span>
  );
};

export const FillBlank: React.FC<FillBlankProps> = ({
  question,
  value,
  onChange,
  onAnswerDataChange,
  isSubmitted = false,
  scoreResult,
  readOnly = false,
  disabled = false,
  showCorrectAnswer = true,
  style,
}) => {
  const { theme } = useTheme();
  const { getAriaProps } = useA11y();

  const internalAnswer = useMemo<FillBlankAnswer>(() => {
    if (value) return value;
    return { blanks: {} };
  }, [value]);

  const [localAnswer, setLocalAnswer] = useState<FillBlankAnswer>(internalAnswer);

  useEffect(() => {
    setLocalAnswer(internalAnswer);
  }, [internalAnswer]);

  const detailMap = useMemo(() => {
    const map: Record<string, { correct: boolean; reason?: string; correctAnswer: unknown }> = {};
    if (scoreResult?.details) {
      scoreResult.details.forEach(d => {
        map[d.id] = {
          correct: d.correct,
          reason: d.reason,
          correctAnswer: d.correctAnswer,
        };
      });
    }
    return map;
  }, [scoreResult]);

  const blankMap = useMemo(() => {
    const map: Record<string, FillBlankItem> = {};
    question.blanks.forEach(b => {
      map[b.id] = b;
    });
    return map;
  }, [question.blanks]);

  const handleChange = useCallback((blankId: string, rawValue: string) => {
    if (readOnly || disabled || isSubmitted) return;

    setLocalAnswer(prev => {
      const newBlanks = { ...prev.blanks, [blankId]: rawValue };
      const answer = { blanks: newBlanks };
      onChange?.(answer);
      onAnswerDataChange?.(answer);
      return answer;
    });
  }, [readOnly, disabled, isSubmitted, onChange, onAnswerDataChange]);

  const checkCorrect = (blankId: string): boolean => {
    if (detailMap[blankId]) return detailMap[blankId].correct;

    const blank = blankMap[blankId];
    if (!blank) return false;

    const userValue = localAnswer.blanks[blankId] || '';
    const caseSensitive = blank.caseSensitive ?? false;
    const norm = (s: string) => (caseSensitive ? s.trim() : s.trim().toLowerCase());

    return blank.correctAnswers.some(a => norm(a) === norm(userValue));
  };

  return (
    <div
      {...getAriaProps('blank-input', '填空题')}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.lg,
        ...style,
      }}
      className="edu-fade-in"
    >
      <div
        style={{
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.lg,
          fontSize: theme.fontSize.base,
          lineHeight: 2.2,
          color: theme.colors.text,
        }}
      >
        {question.content.map((part, partIndex) => {
          if (typeof part === 'string') {
            return <span key={`text-${partIndex}`}>{part}</span>;
          }

          const blankId = part.blankId;
          const blank = blankMap[blankId];
          const blankIndex = question.blanks.findIndex(b => b.id === blankId);
          if (!blank) return null;

          const value = localAnswer.blanks[blankId] || '';
          const correct = checkCorrect(blankId);
          const detail = detailMap[blankId];

          return (
            <BlankInput
              key={`blank-${blankId}`}
              blank={blank}
              index={blankIndex}
              value={value}
              onChange={(v) => handleChange(blankId, v)}
              isSubmitted={isSubmitted}
              showCorrect={showCorrectAnswer}
              correct={correct}
              correctAnswer={(detail?.correctAnswer as string) || blank.correctAnswers[0]}
              allAnswers={blank.correctAnswers}
              disabled={disabled}
              readOnly={readOnly}
            />
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.sm,
        }}
      >
        {question.blanks.map((blank, index) => {
          const value = localAnswer.blanks[blank.id] || '';
          const correct = checkCorrect(blank.id);
          const detail = detailMap[blank.id];

          return (
            <div
              key={blank.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: theme.spacing.sm,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.md,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: theme.colors.primary,
                  color: '#ffffff',
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeights.semibold,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: theme.fontSize.base,
                    color: isSubmitted && showCorrectAnswer
                      ? correct
                        ? theme.colors.success
                        : theme.colors.error
                      : theme.colors.text,
                    fontWeight: theme.fontWeights.medium,
                  }}
                >
                  {value || <span style={{ color: theme.colors.textSecondary, fontStyle: 'italic' }}>未作答</span>}
                </div>
                {isSubmitted && showCorrectAnswer && !correct && (
                  <div
                    className="edu-slide-in"
                    style={{
                      marginTop: theme.spacing.xs,
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.success,
                    }}
                  >
                    参考答案: {blank.correctAnswers.join(' / ')}
                  </div>
                )}
                {isSubmitted && detail?.reason && (
                  <div
                    style={{
                      marginTop: theme.spacing.xs,
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    {detail.reason}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

FillBlank.displayName = 'FillBlank';
