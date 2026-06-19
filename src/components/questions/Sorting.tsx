import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { useA11y } from '../../hooks/useA11y';
import { useExerciseKeyboard } from '../../hooks/useKeyboard';
import type {
  SortingQuestion as SortingQuestionType,
  SortingAnswer,
  ScoreDetail,
  AnswerData,
} from '../../types';

export interface SortingProps {
  question: SortingQuestionType;
  value?: SortingAnswer | null;
  onChange?: (answer: SortingAnswer) => void;
  onAnswerDataChange?: (answer: AnswerData) => void;
  isSubmitted?: boolean;
  scoreResult?: ScoreDetail | null;
  readOnly?: boolean;
  disabled?: boolean;
  showCorrectAnswer?: boolean;
  style?: CSSProperties;
}

export const Sorting: React.FC<SortingProps> = ({
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
  const containerRef = useRef<HTMLDivElement>(null);
  const dragSrcRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const internalAnswer = useMemo<SortingAnswer>(() => {
    if (value) return value;
    return { order: question.items.map(i => i.id) };
  }, [value, question.items]);

  const [order, setOrder] = useState<string[]>(internalAnswer.order);

  useEffect(() => {
    setOrder(internalAnswer.order);
  }, [internalAnswer]);

  const itemMap = useMemo(() => {
    const map: Record<string, { id: string; content: string }> = {};
    question.items.forEach(item => {
      map[item.id] = item;
    });
    return map;
  }, [question.items]);

  const detailMap = useMemo(() => {
    const map: Record<string, { correct: boolean; reason?: string }> = {};
    if (scoreResult?.details) {
      scoreResult.details.forEach((d, i) => {
        const itemId = order[i] || `pos-${i}`;
        map[itemId] = { correct: d.correct, reason: d.reason };
      });
    }
    return map;
  }, [scoreResult, order]);

  const emitChange = useCallback((newOrder: string[]) => {
    const answer = { order: newOrder };
    onChange?.(answer);
    onAnswerDataChange?.(answer);
  }, [onChange, onAnswerDataChange]);

  const swap = useCallback((from: number, to: number) => {
    if (readOnly || disabled || isSubmitted) return;
    if (from === to) return;
    if (from < 0 || to < 0 || from >= order.length || to >= order.length) return;

    setOrder(prev => {
      const newOrder = [...prev];
      const [moved] = newOrder.splice(from, 1);
      newOrder.splice(to, 0, moved);
      const item = itemMap[moved];
      announce(`已将 "${item?.content}" 移动到第 ${to + 1} 位`);
      emitChange(newOrder);
      return newOrder;
    });
  }, [readOnly, disabled, isSubmitted, order, itemMap, announce, emitChange]);

  const moveItem = useCallback((index: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (readOnly || disabled || isSubmitted) return;
    const target =
      direction === 'up' ? index - 1 :
      direction === 'down' ? index + 1 :
      direction === 'top' ? 0 :
      order.length - 1;
    swap(index, target);
  }, [readOnly, disabled, isSubmitted, order, swap]);

  useExerciseKeyboard({
    onArrowUp: () => {
      if (selectedIndex !== null && selectedIndex > 0) {
        moveItem(selectedIndex, 'up');
      }
    },
    onArrowDown: () => {
      if (selectedIndex !== null && selectedIndex < order.length - 1) {
        moveItem(selectedIndex, 'down');
      }
    },
    onEscape: () => {
      setSelectedIndex(null);
    },
  }, { enabled: !readOnly && !disabled && !isSubmitted });

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (readOnly || disabled || isSubmitted) {
      e.preventDefault();
      return;
    }
    dragSrcRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    const item = itemMap[order[index]];
    announce(`开始拖拽 "${item?.content}"`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const srcIndex = dragSrcRef.current;
    dragSrcRef.current = null;
    if (srcIndex === null || srcIndex === dropIndex) return;
    swap(srcIndex, dropIndex);
  };

  const handleDragEnd = () => {
    dragSrcRef.current = null;
    setDragOverIndex(null);
  };

  const isPositionCorrect = (index: number): boolean | null => {
    if (!isSubmitted || !showCorrectAnswer) return null;
    return order[index] === question.correctOrder[index];
  };

  const getItemStyle = (index: number): CSSProperties => {
    const isSelected = selectedIndex === index;
    const isDragging = dragSrcRef.current === index;
    const isDragOver = dragOverIndex === index && dragSrcRef.current !== index;
    const correct = isPositionCorrect(index);

    let borderColor = theme.colors.border;
    let backgroundColor = theme.colors.surface;

    if (correct !== null) {
      if (correct) {
        borderColor = theme.colors.success;
        backgroundColor = `${theme.colors.success}10`;
      } else {
        borderColor = theme.colors.error;
        backgroundColor = `${theme.colors.error}10`;
      }
    } else if (isSelected) {
      borderColor = theme.colors.primary;
      backgroundColor = `${theme.colors.primary}10`;
    }

    return {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: `${theme.spacing.md} ${theme.spacing.md}`,
      backgroundColor,
      border: `2px solid ${borderColor}`,
      borderRadius: theme.borderRadius.lg,
      cursor: readOnly || disabled || isSubmitted ? 'default' : 'move',
      transition: `all ${theme.transitions.fast}`,
      opacity: isDragging ? 0.5 : 1,
      boxShadow: isDragOver ? `0 0 0 3px ${theme.colors.primary}40` : 'none',
      minHeight: '56px',
      position: 'relative',
      zIndex: isDragOver ? 1 : 'auto',
    };
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.sm,
        ...style,
      }}
      className="edu-fade-in"
      role="list"
      aria-label="排序题"
    >
      {order.map((itemId, index) => {
        const item = itemMap[itemId];
        if (!item) return null;
        const correct = isPositionCorrect(index);
        void detailMap[itemId];
        const ariaType = correct === true
          ? 'correct-option'
          : correct === false
          ? 'wrong-option'
          : selectedIndex === index
          ? 'dragging-item'
          : 'sortable-item';

        return (
          <div
            key={`${itemId}-${index}`}
            {...getAriaProps(ariaType, `第${index + 1}位: ${item.content}`)}
            role="listitem"
            draggable={!readOnly && !disabled && !isSubmitted}
            tabIndex={readOnly || disabled || isSubmitted ? -1 : 0}
            data-edu-draggable={!readOnly && !disabled && !isSubmitted}
            aria-posinset={index + 1}
            aria-setsize={order.length}
            style={getItemStyle(index)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => {
              if (readOnly || disabled || isSubmitted) return;
              setSelectedIndex(prev => prev === index ? null : index);
            }}
            onKeyDown={(e) => {
              if (readOnly || disabled || isSubmitted) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedIndex(prev => prev === index ? null : index);
              }
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                minWidth: '36px',
                borderRadius: theme.borderRadius.md,
                backgroundColor: selectedIndex === index ? theme.colors.primary : theme.colors.background,
                color: selectedIndex === index ? '#ffffff' : theme.colors.text,
                fontWeight: theme.fontWeights.bold,
                fontSize: theme.fontSize.sm,
              }}
            >
              {index + 1}
            </span>

            {!readOnly && !disabled && !isSubmitted && (
              <span
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  gap: '2px',
                  cursor: 'grab',
                  padding: theme.spacing.xs,
                  borderRadius: theme.borderRadius.sm,
                  color: theme.colors.textSecondary,
                }}
                aria-hidden="true"
              >
                <span style={{ display: 'flex', gap: '2px' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                </span>
                <span style={{ display: 'flex', gap: '2px' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                </span>
                <span style={{ display: 'flex', gap: '2px' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                </span>
              </span>
            )}

            <div
              style={{
                flex: 1,
                fontSize: theme.fontSize.base,
                lineHeight: 1.6,
                color: correct === null ? theme.colors.text : correct ? theme.colors.success : theme.colors.error,
                fontWeight: correct !== null ? theme.fontWeights.medium : undefined,
              }}
            >
              {item.content}
            </div>

            {!readOnly && !disabled && !isSubmitted && (
              <div
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveItem(index, 'up');
                  }}
                  disabled={index === 0}
                  aria-label={`上移到第${index}位`}
                  style={{
                    width: '28px',
                    height: '22px',
                    border: `1px solid ${index === 0 ? theme.colors.border : theme.colors.primary}`,
                    borderRadius: theme.borderRadius.sm,
                    backgroundColor: index === 0 ? theme.colors.disabled : 'transparent',
                    color: index === 0 ? theme.colors.disabledText : theme.colors.primary,
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveItem(index, 'down');
                  }}
                  disabled={index === order.length - 1}
                  aria-label={`下移到第${index + 2}位`}
                  style={{
                    width: '28px',
                    height: '22px',
                    border: `1px solid ${index === order.length - 1 ? theme.colors.border : theme.colors.primary}`,
                    borderRadius: theme.borderRadius.sm,
                    backgroundColor: index === order.length - 1 ? theme.colors.disabled : 'transparent',
                    color: index === order.length - 1 ? theme.colors.disabledText : theme.colors.primary,
                    cursor: index === order.length - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ↓
                </button>
              </div>
            )}

            {isSubmitted && showCorrectAnswer && (
              <span
                style={{
                  fontSize: '20px',
                  marginLeft: theme.spacing.sm,
                }}
              >
                {correct ? (
                  <span style={{ color: theme.colors.success }}>✓</span>
                ) : (
                  <span style={{ color: theme.colors.error }}>✗</span>
                )}
              </span>
            )}
          </div>
        );
      })}

      {isSubmitted && showCorrectAnswer && (
        <div
          className="edu-slide-in"
          style={{
            marginTop: theme.spacing.md,
            padding: theme.spacing.lg,
            backgroundColor: `${theme.colors.success}10`,
            border: `1px solid ${theme.colors.success}`,
            borderRadius: theme.borderRadius.lg,
          }}
          {...getAriaProps('analysis-panel')}
        >
          <div
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.colors.success,
              fontWeight: theme.fontWeights.semibold,
              marginBottom: theme.spacing.md,
            }}
          >
            ✅ 正确顺序：
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: theme.spacing.sm,
            }}
          >
            {question.correctOrder.map((id, i) => {
              const it = itemMap[id];
              return (
                <span
                  key={id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                    backgroundColor: theme.colors.surface,
                    border: `1px solid ${theme.colors.success}`,
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.fontSize.sm,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 'bold',
                      color: theme.colors.success,
                    }}
                  >
                    {i + 1}.
                  </span>
                  {it?.content}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: theme.spacing.sm,
          fontSize: theme.fontSize.sm,
          color: theme.colors.textSecondary,
          textAlign: 'center',
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.md,
        }}
      >
        💡 提示：可通过拖拽或点击选中后使用 ↑↓ 键调整顺序，或使用上下箭头按钮
      </div>
    </div>
  );
};

Sorting.displayName = 'Sorting';
