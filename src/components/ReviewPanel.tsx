import React, { CSSProperties, useCallback, useMemo, useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useA11y } from '../hooks/useA11y';
import { evaluateQuestion } from '../utils/scoring';
import type {
  Question,
  QuestionType,
  QuestionResult,
  AnswerData,
  ScoringMode,
  ReviewFilters,
} from '../types';
import { Button } from './common/Button';
import { NavButton } from './common/ActionButtons';

interface PerQuestionState {
  answer: AnswerData;
  result: QuestionResult | null;
  isSubmitted: boolean;
  isMarked: boolean;
  isCollected: boolean;
  elapsedTime?: number;
}

export interface ReviewPanelProps {
  questions: Question[];
  statesMap: Record<string, PerQuestionState>;
  currentIndex: number;
  onJump: (index: number) => void;
  onRedo: (index: number) => void;
  onExitReview: () => void;
  onStartCorrection?: () => void;
  onFilterChange?: (filters: ReviewFilters, filteredCount: number) => void;
  scoringMode?: ScoringMode;
  className?: string;
  style?: CSSProperties;
}

const typeLabels: Record<string, string> = {
  'multiple-choice': '选择题',
  'fill-blank': '填空题',
  'matching': '连线题',
  'sorting': '排序题',
  'listening': '听力题',
};

const ALL_TYPES: QuestionType[] = ['multiple-choice', 'fill-blank', 'matching', 'sorting', 'listening'];

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  questions,
  statesMap,
  currentIndex,
  onJump,
  onRedo,
  onExitReview,
  onStartCorrection,
  onFilterChange,
  scoringMode = 'strict',
  className,
  style,
}) => {
  const { theme } = useTheme();
  const { announce } = useA11y();

  const [filters, setFilters] = useState<ReviewFilters>({
    questionTypes: undefined,
    correctness: 'all',
    markedOnly: false,
  });
  const [lastNonFilteredIndex, setLastNonFilteredIndex] = useState<number>(currentIndex);
  const [showFilterBar, setShowFilterBar] = useState(false);

  const isFilterActive = useMemo(() => {
    return (
      (filters.questionTypes && filters.questionTypes.length > 0) ||
      filters.correctness !== 'all' ||
      filters.markedOnly === true
    );
  }, [filters]);

  const filteredItems = useMemo(() => {
    return questions
      .map((q, i) => ({ q, i, s: statesMap[q.id] }))
      .filter(({ q, s }) => {
        if (filters.questionTypes && filters.questionTypes.length > 0) {
          if (!filters.questionTypes.includes(q.type)) return false;
        }
        if (filters.correctness === 'correct') {
          if (!s?.result?.isCorrect) return false;
        } else if (filters.correctness === 'wrong') {
          if (s?.result?.isCorrect !== false) return false;
        }
        if (filters.markedOnly) {
          if (!s?.isMarked) return false;
        }
        return true;
      });
  }, [questions, statesMap, filters]);

  const handleJump = useCallback(
    (target: number) => {
      if (!isFilterActive) {
        onJump(target);
        return;
      }
      const entry = filteredItems[target];
      if (entry) {
        onJump(entry.i);
      }
    },
    [isFilterActive, filteredItems, onJump]
  );

  const effectiveIndexInFiltered = useMemo(() => {
    if (!isFilterActive) return currentIndex;
    return filteredItems.findIndex(e => e.i === currentIndex);
  }, [isFilterActive, filteredItems, currentIndex]);

  const effectiveTotal = isFilterActive ? filteredItems.length : questions.length;

  const handlePrev = useCallback(() => {
    if (isFilterActive) {
      if (effectiveIndexInFiltered > 0) handleJump(effectiveIndexInFiltered - 1);
    } else {
      if (currentIndex > 0) onJump(currentIndex - 1);
    }
  }, [isFilterActive, effectiveIndexInFiltered, currentIndex, handleJump, onJump]);

  const handleNext = useCallback(() => {
    if (isFilterActive) {
      if (effectiveIndexInFiltered < effectiveTotal - 1) handleJump(effectiveIndexInFiltered + 1);
    } else {
      if (currentIndex < questions.length - 1) onJump(currentIndex + 1);
    }
  }, [isFilterActive, effectiveIndexInFiltered, effectiveTotal, currentIndex, questions.length, handleJump, onJump]);

  const handleRedo = () => {
    if (isFilterActive) {
      setLastNonFilteredIndex(currentIndex);
    }
    onRedo(currentIndex);
  };

  const updateFilters = useCallback(
    (next: ReviewFilters) => {
      const hasActive =
        (next.questionTypes && next.questionTypes.length > 0) ||
        next.correctness !== 'all' ||
        next.markedOnly === true;

      if (hasActive && !isFilterActive) {
        setLastNonFilteredIndex(currentIndex);
      }

      setFilters(next);

      const count = questions
        .map((q, i) => ({ q, i, s: statesMap[q.id] }))
        .filter(({ q, s }) => {
          if (next.questionTypes && next.questionTypes.length > 0) {
            if (!next.questionTypes.includes(q.type)) return false;
          }
          if (next.correctness === 'correct') {
            if (!s?.result?.isCorrect) return false;
          } else if (next.correctness === 'wrong') {
            if (s?.result?.isCorrect !== false) return false;
          }
          if (next.markedOnly) {
            if (!s?.isMarked) return false;
          }
          return true;
        }).length;

      onFilterChange?.(next, count);
    },
    [questions, statesMap, isFilterActive, currentIndex, onFilterChange]
  );

  const clearFilters = useCallback(() => {
    updateFilters({ questionTypes: undefined, correctness: 'all', markedOnly: false });
    setShowFilterBar(false);
    onJump(lastNonFilteredIndex);
  }, [updateFilters, lastNonFilteredIndex, onJump]);

  const toggleType = (t: QuestionType) => {
    const current = filters.questionTypes ?? [];
    const next = current.includes(t) ? current.filter(x => x !== t) : [...current, t];
    updateFilters({ ...filters, questionTypes: next.length > 0 ? next : undefined });
  };

  const question = questions[currentIndex];
  const state = question ? statesMap[question.id] : null;
  const result = state?.result ?? null;

  const summary = useMemo(() => {
    let totalScore = 0;
    let earnedScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    const wrongList: { index: number; question: Question; result: QuestionResult }[] = [];

    questions.forEach((q, i) => {
      const s = statesMap[q.id];
      if (!s?.result) return;
      totalScore += s.result.score.total;
      earnedScore += s.result.score.earned;
      if (s.result.isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
        wrongList.push({ index: i, question: q, result: s.result });
      }
    });

    return { totalScore, earnedScore, correctCount, wrongCount, wrongList };
  }, [questions, statesMap]);

  if (!question || !result) {
    return null;
  }

  const isWrong = !result.isCorrect;
  const previewScore = evaluateQuestion(question, state?.answer ?? { selected: [] } as AnswerData, scoringMode);

  const chipStyle = (active: boolean): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.borderRadius.full,
    border: `1px solid ${active ? theme.colors.primary : theme.colors.border}`,
    backgroundColor: active ? `${theme.colors.primary}15` : 'transparent',
    color: active ? theme.colors.primary : theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    cursor: 'pointer',
    userSelect: 'none',
    transition: `all ${theme.transitions.fast}`,
  });

  const filterBarStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.surface,
    borderBottom: `1px solid ${theme.colors.border}`,
  };

  const filterGroupStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    ...style,
  };

  const summaryBarStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.surface,
    borderBottom: `1px solid ${theme.colors.border}`,
  };

  const summaryStatsStyle: CSSProperties = {
    display: 'flex',
    gap: theme.spacing.lg,
    flexWrap: 'wrap',
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  };

  const scoreBarStyle: CSSProperties = {
    width: '100%',
    height: '4px',
    backgroundColor: theme.colors.disabled,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginTop: theme.spacing.sm,
  };

  const scoreFillStyle: CSSProperties = {
    height: '100%',
    backgroundColor: summary.earnedScore / summary.totalScore >= 0.6 ? theme.colors.success : theme.colors.error,
    width: `${summary.totalScore > 0 ? (summary.earnedScore / summary.totalScore) * 100 : 0}%`,
    borderRadius: theme.borderRadius.full,
    transition: `width ${theme.transitions.slow}`,
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing.lg,
  };

  const questionCardStyle: CSSProperties = {
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    animation: 'edu-fadeIn 0.25s ease-out',
  };

  const cardHeaderStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: isWrong ? `${theme.colors.error}10` : `${theme.colors.success}10`,
    borderBottom: `1px solid ${theme.colors.border}`,
  };

  const cardHeaderLeftStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeights.semibold,
    color: isWrong ? theme.colors.error : theme.colors.success,
  };

  const cardBodyStyle: CSSProperties = {
    padding: theme.spacing.md,
  };

  const infoRowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
  };

  const labelStyle: CSSProperties = {
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeights.medium,
    whiteSpace: 'nowrap',
  };

  const valueStyle: CSSProperties = {
    color: theme.colors.text,
  };

  const errorListStyle: CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: `0 0 ${theme.spacing.md}`,
  };

  const errorItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: `${theme.colors.error}10`,
    borderLeft: `3px solid ${theme.colors.error}`,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
  };

  const analysisBoxStyle: CSSProperties = {
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}08`,
    borderLeft: `3px solid ${theme.colors.primary}`,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.fontSize.sm,
    lineHeight: 1.7,
    color: theme.colors.text,
    whiteSpace: 'pre-wrap',
  };

  const gridListStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  };

  const itemBtnStyle = (isCurrent: boolean, status: 'wrong' | 'correct' | 'unsubmitted'): CSSProperties => {
    const colors = {
      wrong: theme.colors.error,
      correct: theme.colors.success,
      unsubmitted: theme.colors.textSecondary,
    };
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '40px',
      minHeight: '40px',
      border: `2px solid ${colors[status]}`,
      backgroundColor: isCurrent ? `${theme.colors.primary}20` : `${colors[status]}10`,
      color: isCurrent ? theme.colors.primary : colors[status],
      borderRadius: theme.borderRadius.md,
      fontSize: theme.fontSize.sm,
      fontWeight: isCurrent ? theme.fontWeights.bold : theme.fontWeights.medium,
      cursor: 'pointer',
      transition: `all ${theme.transitions.fast}`,
      touchAction: 'manipulation',
    };
  };

  const footerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.surface,
    borderTop: `1px solid ${theme.colors.border}`,
  };

  return (
    <div className={className} style={containerStyle}>
      <div style={summaryBarStyle}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <div style={{ fontSize: theme.fontSize.lg, fontWeight: theme.fontWeights.bold, color: theme.colors.text }}>
              题组复盘
            </div>
            {isFilterActive && (
              <span style={{
                display: 'inline-block',
                padding: `2px ${theme.spacing.sm}`,
                backgroundColor: `${theme.colors.primary}15`,
                color: theme.colors.primary,
                borderRadius: theme.borderRadius.full,
                fontSize: theme.fontSize.xs,
              }}>
                筛选中 · {effectiveTotal} 题
              </span>
            )}
          </div>
          <div style={scoreBarStyle}>
            <div style={scoreFillStyle} />
          </div>
        </div>
        <div style={summaryStatsStyle}>
          <span>
            总分 <strong style={{ color: theme.colors.primary }}>{summary.earnedScore.toFixed(1)}</strong> / {summary.totalScore}
          </span>
          <span>
            正确 <strong style={{ color: theme.colors.success }}>{summary.correctCount}</strong>
          </span>
          <span>
            错误 <strong style={{ color: theme.colors.error }}>{summary.wrongCount}</strong>
          </span>
          <span>
            正确率 <strong style={{ color: summary.correctCount / questions.length >= 0.6 ? theme.colors.success : theme.colors.error }}>
              {questions.length > 0 ? Math.round((summary.correctCount / questions.length) * 100) : 0}%
            </strong>
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.sm,
        padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
        backgroundColor: theme.colors.background,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilterBar(v => !v)}
          icon={<span>⚙</span>}
        >
          {showFilterBar ? '收起筛选' : '展开筛选'}
        </Button>
        {summary.wrongList.length > 0 && onStartCorrection && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              announce(`开始错题重练，共 ${summary.wrongList.length} 题`);
              onStartCorrection();
            }}
            icon={<span>✎</span>}
          >
            错题重练（{summary.wrongList.length} 题）
          </Button>
        )}
        {isFilterActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
          >
            清除筛选
          </Button>
        )}
      </div>

      {showFilterBar && (
        <div style={filterBarStyle}>
          <div style={filterGroupStyle}>
            <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginRight: theme.spacing.xs }}>题型：</span>
            {ALL_TYPES.map(t => {
              const active = filters.questionTypes?.includes(t) ?? false;
              return (
                <span
                  key={t}
                  style={chipStyle(active)}
                  onClick={() => toggleType(t)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleType(t); }}
                >
                  {typeLabels[t]}
                </span>
              );
            })}
          </div>

          <div style={filterGroupStyle}>
            <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginRight: theme.spacing.xs }}>对错：</span>
            {(['all', 'correct', 'wrong'] as const).map(v => (
              <span
                key={v}
                style={chipStyle(filters.correctness === v)}
                onClick={() => updateFilters({ ...filters, correctness: v })}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') updateFilters({ ...filters, correctness: v }); }}
              >
                {v === 'all' ? '全部' : v === 'correct' ? '答对' : '答错'}
              </span>
            ))}
          </div>

          <div style={filterGroupStyle}>
            <span
              style={chipStyle(filters.markedOnly ?? false)}
              onClick={() => updateFilters({ ...filters, markedOnly: !(filters.markedOnly ?? false) })}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') updateFilters({ ...filters, markedOnly: !(filters.markedOnly ?? false) }); }}
            >
              {filters.markedOnly ? '☑ 只看标记' : '☐ 只看标记'}
            </span>
          </div>
        </div>
      )}

      <div style={bodyStyle}>
        <div style={questionCardStyle}>
          <div style={cardHeaderStyle}>
            <div style={cardHeaderLeftStyle}>
              <span>{isWrong ? '✗' : '✓'}</span>
              <span>第 {currentIndex + 1} 题 · {typeLabels[question.type] || question.type}</span>
              {state?.isMarked && (
                <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.warning }}>★ 已标记</span>
              )}
              {question.difficulty && (
                <span style={{ fontSize: theme.fontSize.xs, color: theme.colors.warning }}>
                  {'★'.repeat(question.difficulty)}{'☆'.repeat(5 - question.difficulty)}
                </span>
              )}
            </div>
            <div style={{ fontSize: theme.fontSize.lg, fontWeight: theme.fontWeights.bold, color: isWrong ? theme.colors.error : theme.colors.success }}>
              {result.score.earned} / {result.score.total} 分
            </div>
          </div>

          <div style={cardBodyStyle}>
            <div style={{ fontSize: theme.fontSize.base, fontWeight: theme.fontWeights.medium, color: theme.colors.text, marginBottom: theme.spacing.md }}>
              {question.title}
            </div>

            <div style={infoRowStyle}>
              <span style={labelStyle}>您的答案</span>
              <span style={{ ...valueStyle, color: isWrong ? theme.colors.error : theme.colors.success }}>
                {previewScore.details && previewScore.details.length > 0
                  ? previewScore.details
                      .filter(d => d.userAnswer !== undefined && d.userAnswer !== null && d.userAnswer !== false && d.userAnswer !== '')
                      .map(d => String(d.userAnswer))
                      .join('、') || '（空）'
                  : '（空）'}
              </span>

              <span style={labelStyle}>正确答案</span>
              <span style={{ ...valueStyle, color: theme.colors.success }}>
                {previewScore.details && previewScore.details.length > 0
                  ? previewScore.details
                      .filter(d => d.correctAnswer !== undefined && d.correctAnswer !== null)
                      .map(d => String(d.correctAnswer))
                      .join('、')
                  : '-'}
              </span>

              <span style={labelStyle}>答题用时</span>
              <span style={valueStyle}>
                {result.timeSpent < 60
                  ? `${result.timeSpent} 秒`
                  : `${Math.floor(result.timeSpent / 60)} 分 ${result.timeSpent % 60} 秒`}
              </span>

              <span style={labelStyle}>得分详情</span>
              <span style={valueStyle}>
                正确 {result.score.correctCount} / {result.score.totalCount} 项，
                得 {result.score.earned.toFixed(1)} / {result.score.total} 分
              </span>
            </div>

            {result.errorReasons && result.errorReasons.length > 0 && (
              <div style={{ marginBottom: theme.spacing.md }}>
                <div style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeights.semibold, color: theme.colors.error, marginBottom: theme.spacing.xs }}>
                  错误原因
                </div>
                <ul style={errorListStyle}>
                  {result.errorReasons.map((reason, i) => (
                    <li key={i} style={errorItemStyle}>
                      <span>⚠</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {question.analysis && (
              <div>
                <div style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeights.semibold, color: theme.colors.primary, marginBottom: theme.spacing.xs }}>
                  题目解析
                </div>
                <div style={analysisBoxStyle}>{question.analysis}</div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeights.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }}>
            {isFilterActive ? `筛选结果（共 ${effectiveTotal} 题，点击跳转）` : '题号速览（点击跳转）'}
          </div>
          <div style={gridListStyle}>
            {(isFilterActive ? filteredItems : questions.map((q, i) => ({ q, i, s: statesMap[q.id] }))).map((entry, fIdx) => {
              const { q, i, s } = entry;
              const isCurrent = i === currentIndex;
              let status: 'wrong' | 'correct' | 'unsubmitted' = 'unsubmitted';
              if (s?.result?.isCorrect) status = 'correct';
              else if (s?.result?.isCorrect === false) status = 'wrong';
              return (
                <button
                  key={q.id}
                  type="button"
                  style={itemBtnStyle(isCurrent, status)}
                  onClick={() => {
                    if (isFilterActive) {
                      handleJump(fIdx);
                    } else {
                      onJump(i);
                    }
                  }}
                  aria-label={`第 ${i + 1} 题，${typeLabels[q.type] || q.type}${isCurrent ? '，当前' : ''}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={footerStyle}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExitReview}
        >
          返回答题
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <NavButton
            direction="prev"
            onClick={handlePrev}
            disabled={isFilterActive ? effectiveIndexInFiltered <= 0 : currentIndex === 0}
          />
          <span style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, minWidth: '60px', textAlign: 'center' }}>
            {isFilterActive ? `${effectiveIndexInFiltered < 0 ? '-' : effectiveIndexInFiltered + 1} / ${effectiveTotal} (筛选)` : `${currentIndex + 1} / ${questions.length}`}
          </span>
          <NavButton
            direction="next"
            onClick={handleNext}
            disabled={isFilterActive ? effectiveIndexInFiltered >= effectiveTotal - 1 : currentIndex >= questions.length - 1}
          />
        </div>

        {isWrong && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleRedo}
            icon={<span>↻</span>}
          >
            重做此题
          </Button>
        )}
      </div>
    </div>
  );
};

ReviewPanel.displayName = 'ReviewPanel';
