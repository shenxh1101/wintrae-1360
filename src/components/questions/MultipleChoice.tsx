import React, { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { useA11y } from '../../hooks/useA11y';
import { useExerciseKeyboard } from '../../hooks/useKeyboard';
import type {
  MultipleChoiceQuestion as MultipleChoiceQuestionType,
  MultipleChoiceAnswer,
  ScoreDetail,
  AnswerData,
} from '../../types';

export interface MultipleChoiceProps {
  question: MultipleChoiceQuestionType;
  value?: MultipleChoiceAnswer | null;
  onChange?: (answer: MultipleChoiceAnswer) => void;
  onAnswerDataChange?: (answer: AnswerData) => void;
  isSubmitted?: boolean;
  scoreResult?: ScoreDetail | null;
  readOnly?: boolean;
  disabled?: boolean;
  showCorrectAnswer?: boolean;
  style?: CSSProperties;
}

const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export const MultipleChoice: React.FC<MultipleChoiceProps> = ({
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
  const { announce, getAriaProps } = useA11y();

  const internalAnswer = useMemo<MultipleChoiceAnswer>(() => {
    if (value) return value;
    return { selected: [] };
  }, [value]);

  const [localAnswer, setLocalAnswer] = useState<MultipleChoiceAnswer>(internalAnswer);

  useEffect(() => {
    setLocalAnswer(internalAnswer);
  }, [internalAnswer]);

  const correctMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    question.correctAnswers.forEach(id => {
      map[id] = true;
    });
    return map;
  }, [question.correctAnswers]);

  const detailMap = useMemo(() => {
    const map: Record<string, { correct: boolean; reason?: string }> = {};
    if (scoreResult?.details) {
      scoreResult.details.forEach(d => {
        map[d.id] = { correct: d.correct, reason: d.reason };
      });
    }
    return map;
  }, [scoreResult]);

  const handleSelect = useCallback((optionId: string) => {
    if (readOnly || disabled || isSubmitted) return;

    setLocalAnswer(prev => {
      let newSelected: string[];
      if (question.isMultiple) {
        newSelected = prev.selected.includes(optionId)
          ? prev.selected.filter(id => id !== optionId)
          : [...prev.selected, optionId];
      } else {
        newSelected = prev.selected.includes(optionId) ? [] : [optionId];
      }
      const answer = { selected: newSelected };
      onChange?.(answer);
      onAnswerDataChange?.(answer);
      const opt = question.options.find(o => o.id === optionId);
      if (opt) {
        announce(
          newSelected.includes(optionId) ? `已选择选项 ${opt.label}` : `已取消选择选项 ${opt.label}`,
          { role: 'status' }
        );
      }
      return answer;
    });
  }, [readOnly, disabled, isSubmitted, question.isMultiple, question.options, onChange, onAnswerDataChange, announce]);

  useExerciseKeyboard({
    onNumberSelect: (index) => {
      if (index < question.options.length) {
        handleSelect(question.options[index].id);
      }
    },
  }, { enabled: !readOnly && !disabled && !isSubmitted });

  const getOptionStyle = (optionId: string): CSSProperties => {
    const isSelected = localAnswer.selected.includes(optionId);
    const isCorrect = correctMap[optionId];
    const detail = detailMap[optionId];
    const showResult = isSubmitted && showCorrectAnswer;

    let borderColor = theme.colors.border;
    let backgroundColor = theme.colors.surface;
    let color = theme.colors.text;

    if (showResult) {
      if (isCorrect) {
        borderColor = theme.colors.success;
        backgroundColor = `${theme.colors.success}10`;
      } else if (detail && !detail.correct) {
        borderColor = theme.colors.error;
        backgroundColor = `${theme.colors.error}10`;
        color = theme.colors.text;
      }
    } else if (isSelected) {
      borderColor = theme.colors.primary;
      backgroundColor = `${theme.colors.primary}10`;
      color = theme.colors.primaryDark;
    }

    return {
      display: 'flex',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
      backgroundColor,
      border: `2px solid ${borderColor}`,
      borderRadius: theme.borderRadius.lg,
      cursor: readOnly || disabled || isSubmitted ? 'default' : 'pointer',
      transition: `all ${theme.transitions.fast}`,
      color,
      minHeight: '52px',
    };
  };

  const getTagStyle = (optionId: string): CSSProperties => {
    const isSelected = localAnswer.selected.includes(optionId);
    const isCorrect = correctMap[optionId];
    const detail = detailMap[optionId];
    const showResult = isSubmitted && showCorrectAnswer;

    let bgColor = theme.colors.background;
    let textColor = theme.colors.textSecondary;
    let borderColor = theme.colors.border;

    if (showResult) {
      if (isCorrect) {
        bgColor = theme.colors.success;
        textColor = '#ffffff';
        borderColor = theme.colors.success;
      } else if (detail && !detail.correct && isSelected) {
        bgColor = theme.colors.error;
        textColor = '#ffffff';
        borderColor = theme.colors.error;
      }
    } else if (isSelected) {
      bgColor = theme.colors.primary;
      textColor = '#ffffff';
      borderColor = theme.colors.primary;
    }

    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      minWidth: '32px',
      flexShrink: 0,
      borderRadius: theme.borderRadius.full,
      backgroundColor: bgColor,
      color: textColor,
      border: `2px solid ${borderColor}`,
      fontWeight: theme.fontWeights.semibold,
      fontSize: theme.fontSize.sm,
    };
  };

  return (
    <div
      role="listbox"
      aria-label={`选择题${question.isMultiple ? '（多选）' : ''}`}
      aria-multiselectable={question.isMultiple || undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md,
        ...style,
      }}
      className="edu-fade-in"
    >
      {question.options.map((option, index) => {
        const isSelected = localAnswer.selected.includes(option.id);
        const label = optionLabels[index] || `${index + 1}`;
        const detail = detailMap[option.id];
        const ariaType = isSubmitted && showCorrectAnswer
          ? correctMap[option.id]
            ? 'correct-option'
            : detail && !detail.correct && isSelected
            ? 'wrong-option'
            : isSelected
            ? 'selected-option'
            : 'option'
          : isSelected
          ? 'selected-option'
          : 'option';

        return (
          <div
            key={option.id}
            {...getAriaProps(ariaType, `选项 ${label}: ${option.value}`)}
            role="option"
            aria-selected={isSelected}
            tabIndex={readOnly || disabled || isSubmitted ? -1 : 0}
            data-edu-option-id={option.id}
            style={getOptionStyle(option.id)}
            onClick={() => handleSelect(option.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect(option.id);
              }
            }}
            onMouseEnter={(e) => {
              if (!readOnly && !disabled && !isSubmitted) {
                const el = e.currentTarget;
                if (!localAnswer.selected.includes(option.id)) {
                  el.style.borderColor = theme.colors.primaryLight;
                  el.style.backgroundColor = `${theme.colors.primary}08`;
                }
              }
            }}
            onMouseLeave={(e) => {
              if (!readOnly && !disabled && !isSubmitted) {
                if (!localAnswer.selected.includes(option.id)) {
                  e.currentTarget.style.borderColor = theme.colors.border;
                  e.currentTarget.style.backgroundColor = theme.colors.surface;
                }
              }
            }}
          >
            <span style={getTagStyle(option.id)}>{label}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: theme.fontSize.base,
                  lineHeight: 1.6,
                  wordBreak: 'break-word',
                }}
              >
                {option.value}
              </div>
              {option.hint && !isSubmitted && (
                <div
                  style={{
                    marginTop: theme.spacing.sm,
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.textSecondary,
                  }}
                >
                  💡 {option.hint}
                </div>
              )}
              {isSubmitted && showCorrectAnswer && detail && !detail.correct && isSelected && (
                <div
                  className="edu-slide-in"
                  style={{
                    marginTop: theme.spacing.sm,
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.error,
                  }}
                >
                  ❌ {detail.reason || '选择错误'}
                </div>
              )}
              {isSubmitted && showCorrectAnswer && correctMap[option.id] && !isSelected && (
                <div
                  className="edu-slide-in"
                  style={{
                    marginTop: theme.spacing.sm,
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.success,
                  }}
                >
                  ✅ 正确答案
                </div>
              )}
            </div>
            {isSubmitted && showCorrectAnswer && (
              <div style={{ flexShrink: 0, alignSelf: 'center' }}>
                {correctMap[option.id] ? (
                  <span style={{ color: theme.colors.success, fontSize: '20px' }}>✓</span>
                ) : isSelected ? (
                  <span style={{ color: theme.colors.error, fontSize: '20px' }}>✗</span>
                ) : null}
              </div>
            )}
          </div>
        );
      })}

      {!question.isMultiple && (
        <div
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            paddingTop: theme.spacing.sm,
          }}
        >
          💡 提示：使用数字键 1-{question.options.length} 可快速选择选项
        </div>
      )}
      {question.isMultiple && (
        <div
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            paddingTop: theme.spacing.sm,
          }}
        >
          💡 提示：本题为多选题，可选择多个选项，按数字键切换选中状态
        </div>
      )}
    </div>
  );
};

MultipleChoice.displayName = 'MultipleChoice';
