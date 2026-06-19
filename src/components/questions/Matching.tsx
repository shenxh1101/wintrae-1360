import React, { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { useA11y } from '../../hooks/useA11y';
import { useExerciseKeyboard } from '../../hooks/useKeyboard';
import type {
  MatchingQuestion as MatchingQuestionType,
  MatchingAnswer,
  ScoreDetail,
  AnswerData,
} from '../../types';

export interface MatchingProps {
  question: MatchingQuestionType;
  value?: MatchingAnswer | null;
  onChange?: (answer: MatchingAnswer) => void;
  onAnswerDataChange?: (answer: AnswerData) => void;
  isSubmitted?: boolean;
  scoreResult?: ScoreDetail | null;
  readOnly?: boolean;
  disabled?: boolean;
  showCorrectAnswer?: boolean;
  style?: CSSProperties;
}

type SelectionState = {
  from: 'left' | 'right' | null;
  id: string | null;
};

export const Matching: React.FC<MatchingProps> = ({
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

  const internalAnswer = useMemo<MatchingAnswer>(() => {
    if (value) return value;
    return { matches: {} };
  }, [value]);

  const [localAnswer, setLocalAnswer] = useState<MatchingAnswer>(internalAnswer);
  const [selection, setSelection] = useState<SelectionState>({ from: null, id: null });
  const [shuffledRights, setShuffledRights] = useState<{ rightId: string; rightContent: string }[]>([]);

  useEffect(() => {
    const rights = question.pairs.map(p => ({
      rightId: p.rightId,
      rightContent: p.rightContent,
    }));
    for (let i = rights.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rights[i], rights[j]] = [rights[j], rights[i]];
    }
    setShuffledRights(rights);
  }, [question.pairs]);

  useEffect(() => {
    setLocalAnswer(internalAnswer);
  }, [internalAnswer]);

  const leftMap = useMemo(() => {
    const map: Record<string, string> = {};
    question.pairs.forEach(p => {
      map[p.leftId] = p.leftContent;
    });
    return map;
  }, [question.pairs]);

  const rightMap = useMemo(() => {
    const map: Record<string, string> = {};
    question.pairs.forEach(p => {
      map[p.rightId] = p.rightContent;
    });
    return map;
  }, [question.pairs]);

  const correctPairsMap = useMemo(() => {
    const map: Record<string, string> = {};
    question.pairs.forEach(p => {
      map[p.leftId] = p.rightId;
    });
    return map;
  }, [question.pairs]);

  const reverseMatchMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(localAnswer.matches).forEach(([leftId, rightId]) => {
      map[rightId] = leftId;
    });
    return map;
  }, [localAnswer.matches]);

  const detailMap = useMemo(() => {
    const map: Record<string, { correct: boolean; reason?: string }> = {};
    if (scoreResult?.details) {
      scoreResult.details.forEach(d => {
        map[d.id] = { correct: d.correct, reason: d.reason };
      });
    }
    return map;
  }, [scoreResult]);

  const handleMatch = useCallback((leftId: string, rightId: string) => {
    if (readOnly || disabled || isSubmitted) return;

    setLocalAnswer(prev => {
      const existingLeftMatch = prev.matches[leftId];
      const existingRightMatch = Object.entries(prev.matches).find(
        ([, r]) => r === rightId
      )?.[0];

      const newMatches = { ...prev.matches };

      if (existingLeftMatch === rightId) {
        delete newMatches[leftId];
        const leftContent = leftMap[leftId];
        const rightContent = rightMap[rightId];
        announce(`已取消配对：${leftContent} 和 ${rightContent}`);
      } else {
        if (existingLeftMatch) {
          delete newMatches[leftId];
        }
        if (existingRightMatch) {
          delete newMatches[existingRightMatch];
        }
        newMatches[leftId] = rightId;
        const leftContent = leftMap[leftId];
        const rightContent = rightMap[rightId];
        announce(`已配对：${leftContent} 和 ${rightContent}`);
      }

      const answer = { matches: newMatches };
      onChange?.(answer);
      onAnswerDataChange?.(answer);
      return answer;
    });
    setSelection({ from: null, id: null });
  }, [readOnly, disabled, isSubmitted, leftMap, rightMap, onChange, onAnswerDataChange, announce]);

  const handleItemClick = useCallback((side: 'left' | 'right', id: string) => {
    if (readOnly || disabled || isSubmitted) return;

    if (selection.from === null) {
      setSelection({ from: side, id });
    } else if (selection.from === side) {
      if (selection.id === id) {
        setSelection({ from: null, id: null });
      } else {
        setSelection({ from: side, id });
      }
    } else {
      const leftId = selection.from === 'left' ? (selection.id as string) : id;
      const rightId = selection.from === 'right' ? (selection.id as string) : id;
      handleMatch(leftId, rightId);
    }
  }, [readOnly, disabled, isSubmitted, selection, handleMatch]);

  const handleCancelMatch = useCallback((leftId: string) => {
    if (readOnly || disabled || isSubmitted) return;

    setLocalAnswer(prev => {
      const newMatches = { ...prev.matches };
      delete newMatches[leftId];
      const answer = { matches: newMatches };
      onChange?.(answer);
      onAnswerDataChange?.(answer);
      announce('已取消配对');
      return answer;
    });
  }, [readOnly, disabled, isSubmitted, onChange, onAnswerDataChange, announce]);

  useExerciseKeyboard({
    onEscape: () => setSelection({ from: null, id: null }),
  }, { enabled: !readOnly && !disabled && !isSubmitted });

  const getLineColor = (leftId: string): string | undefined => {
    if (!isSubmitted || !showCorrectAnswer) return undefined;
    const correct = correctPairsMap[leftId];
    const userMatch = localAnswer.matches[leftId];
    if (!userMatch) return theme.colors.border;
    return correct === userMatch ? theme.colors.success : theme.colors.error;
  };

  const getItemStyle = (
    side: 'left' | 'right',
    id: string,
    matchId?: string
  ): CSSProperties => {
    const isSelected = selection.from === side && selection.id === id;
    const isMatched = matchId !== undefined;
    const detail = side === 'left' ? detailMap[id] : undefined;
    const showResult = isSubmitted && showCorrectAnswer && side === 'left';

    let borderColor = theme.colors.border;
    let backgroundColor = theme.colors.surface;
    let color = theme.colors.text;

    if (showResult && detail) {
      if (detail.correct) {
        borderColor = theme.colors.success;
        backgroundColor = `${theme.colors.success}10`;
      } else {
        borderColor = theme.colors.error;
        backgroundColor = `${theme.colors.error}10`;
      }
    } else if (isMatched) {
      borderColor = theme.colors.primary;
      backgroundColor = `${theme.colors.primary}08`;
      color = theme.colors.primaryDark;
    }

    if (isSelected) {
      borderColor = theme.colors.primaryDark;
      backgroundColor = `${theme.colors.primary}20`;
    }

    return {
      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
      backgroundColor,
      border: `2px solid ${borderColor}`,
      borderRadius: theme.borderRadius.lg,
      cursor: readOnly || disabled || isSubmitted ? 'default' : 'pointer',
      transition: `all ${theme.transitions.fast}`,
      color,
      minHeight: '48px',
      display: 'flex',
      alignItems: 'center',
      fontWeight: theme.fontWeights.medium,
      lineHeight: 1.5,
      boxShadow: isSelected ? theme.shadows.md : 'none',
      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
    };
  };

  const leftItems = question.pairs.map(p => ({ id: p.leftId, content: p.leftContent }));
  const rightItems = shuffledRights;

  return (
    <div
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
          display: 'grid',
          gridTemplateColumns: '1fr 60px 1fr',
          gap: theme.spacing.md,
          alignItems: 'stretch',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          <div
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.textSecondary,
              padding: `0 ${theme.spacing.sm}`,
            }}
          >
            左栏
          </div>
          {leftItems.map((item, leftIndex) => {
            const matchedRight = localAnswer.matches[item.id];
            const rightIndex = matchedRight ? rightItems.findIndex(r => r.rightId === matchedRight) : -1;
            const lineColor = getLineColor(item.id);
            const detail = detailMap[item.id];

            return (
              <div
                key={item.id}
                style={{
                  position: 'relative',
                  display: 'contents',
                }}
              >
                <div
                  {...getAriaProps(matchedRight ? 'connected-item' : 'matching-item', item.content)}
                  role="button"
                  tabIndex={readOnly || disabled || isSubmitted ? -1 : 0}
                  style={{
                    ...getItemStyle('left', item.id, matchedRight),
                    gridColumn: '1 / 2',
                    gridRow: leftIndex + 2,
                  }}
                  onClick={() => handleItemClick('left', item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleItemClick('left', item.id);
                    }
                  }}
                >
                  <span
                    style={{
                      marginRight: theme.spacing.sm,
                      color: theme.colors.textSecondary,
                      fontWeight: theme.fontWeights.bold,
                    }}
                  >
                    {String.fromCharCode(65 + leftIndex)}.
                  </span>
                  <span style={{ flex: 1 }}>{item.content}</span>
                  {matchedRight && !isSubmitted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelMatch(item.id);
                      }}
                      style={{
                        marginLeft: theme.spacing.sm,
                        width: '20px',
                        height: '20px',
                        borderRadius: theme.borderRadius.full,
                        border: 'none',
                        backgroundColor: theme.colors.errorLight,
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                      aria-label="取消配对"
                    >
                      ✕
                    </button>
                  )}
                  {isSubmitted && showCorrectAnswer && (
                    <span style={{ marginLeft: 'auto' }}>
                      {detail?.correct ? (
                        <span style={{ color: theme.colors.success, fontSize: '18px' }}>✓</span>
                      ) : matchedRight ? (
                        <span style={{ color: theme.colors.error, fontSize: '18px' }}>✗</span>
                      ) : null}
                    </span>
                  )}
                </div>

                {matchedRight && rightIndex >= 0 && (
                  <svg
                    style={{
                      gridColumn: '2 / 3',
                      gridRow: `${Math.min(leftIndex, rightIndex) + 2} / ${Math.max(leftIndex, rightIndex) + 3}`,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      position: 'relative',
                      overflow: 'visible',
                    }}
                    viewBox="0 0 60 100"
                    preserveAspectRatio="none"
                  >
                    <path
                      d={`M 10 ${leftIndex >= rightIndex ? 10 : 90} C 30 ${leftIndex >= rightIndex ? 10 : 90}, 30 ${leftIndex >= rightIndex ? 90 : 10}, 50 ${leftIndex >= rightIndex ? 90 : 10}`}
                      fill="none"
                      stroke={lineColor || theme.colors.primary}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={isSubmitted && !detail?.correct ? '8 4' : '0'}
                      opacity={0.7}
                    />
                  </svg>
                )}

                {!matchedRight && (
                  <div
                    style={{
                      gridColumn: '2 / 3',
                      gridRow: leftIndex + 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selection.from === 'left' && selection.id === item.id && (
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: theme.borderRadius.full,
                          backgroundColor: theme.colors.primary,
                          animation: 'edu-pulse 1.5s ease-in-out infinite',
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div />

        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          <div
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.textSecondary,
              padding: `0 ${theme.spacing.sm}`,
            }}
          >
            右栏
          </div>
          {rightItems.map((item, rightIndex) => {
            const matchedLeft = reverseMatchMap[item.rightId];
            const showResult = isSubmitted && showCorrectAnswer;
            const correctLeft = Object.entries(correctPairsMap).find(
              ([, r]) => r === item.rightId
            )?.[0];
            const isCorrectPair = matchedLeft && correctPairsMap[matchedLeft] === item.rightId;

            return (
              <div
                key={item.rightId}
                {...getAriaProps(matchedLeft ? 'connected-item' : 'matching-item', item.rightContent)}
                role="button"
                tabIndex={readOnly || disabled || isSubmitted ? -1 : 0}
                style={{
                  ...getItemStyle('right', item.rightId, matchedLeft),
                  flexDirection: 'row-reverse' as const,
                }}
                onClick={() => handleItemClick('right', item.rightId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleItemClick('right', item.rightId);
                  }
                }}
              >
                <span
                  style={{
                    marginLeft: theme.spacing.sm,
                    color: theme.colors.textSecondary,
                    fontWeight: theme.fontWeights.bold,
                  }}
                >
                  {rightIndex + 1}.
                </span>
                <span style={{ flex: 1 }}>{item.rightContent}</span>
                {showResult && matchedLeft && (
                  <span style={{ marginRight: theme.spacing.sm }}>
                    {isCorrectPair ? (
                      <span style={{ color: theme.colors.success, fontSize: '18px' }}>✓</span>
                    ) : (
                      <span style={{ color: theme.colors.error, fontSize: '18px' }}>✗</span>
                    )}
                  </span>
                )}
                {showResult && correctLeft && !matchedLeft && (
                  <div
                    className="edu-slide-in"
                    style={{
                      marginRight: theme.spacing.sm,
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.success,
                    }}
                  >
                    应匹配: {leftMap[correctLeft]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.md,
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
        }}
      >
        <span
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.textSecondary,
          }}
        >
          已配对: {Object.keys(localAnswer.matches).length} / {question.pairs.length}
        </span>
        <span
          style={{
            fontSize: theme.fontSize.sm,
            color: selection.from ? theme.colors.primary : theme.colors.textSecondary,
          }}
        >
          {selection.from
            ? `已选择${selection.from === 'left' ? '左' : '右'}栏，请点击另一侧完成配对（按 ESC 取消）`
            : '💡 点击左右两侧项目进行配对'}
        </span>
      </div>
    </div>
  );
};

Matching.displayName = 'Matching';
