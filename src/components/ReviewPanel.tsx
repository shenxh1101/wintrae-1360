import React, { CSSProperties, useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useA11y } from '../hooks/useA11y';
import { evaluateQuestion } from '../utils/scoring';
import type {
  Question,
  QuestionResult,
  AnswerData,
  ScoringMode,
} from '../types';
import { Button } from './common/Button';
import { NavButton } from './common/ActionButtons';

interface PerQuestionState {
  answer: AnswerData;
  result: QuestionResult | null;
  isSubmitted: boolean;
  isMarked: boolean;
  isCollected: boolean;
}

export interface ReviewPanelProps {
  questions: Question[];
  statesMap: Record<string, PerQuestionState>;
  currentIndex: number;
  onJump: (index: number) => void;
  onRedo: (index: number) => void;
  onExitReview: () => void;
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

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  questions,
  statesMap,
  currentIndex,
  onJump,
  onRedo,
  onExitReview,
  scoringMode = 'strict',
  className,
  style,
}) => {
  const { theme } = useTheme();
  const { announce } = useA11y();

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

  const handleRedo = () => {
    if (!result?.isCorrect) {
      announce(`重做第 ${currentIndex + 1} 题`);
    }
    onRedo(currentIndex);
  };

  const handlePrev = () => {
    if (currentIndex > 0) onJump(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) onJump(currentIndex + 1);
  };

  if (!question || !result) {
    return null;
  }

  const isWrong = !result.isCorrect;

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

  const wrongListStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  };

  const wrongItemBtnStyle = (isCurrent: boolean, isWrongItem: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '40px',
    minHeight: '40px',
    border: `2px solid ${isWrongItem ? theme.colors.error : theme.colors.success}`,
    backgroundColor: isCurrent ? `${theme.colors.primary}20` : isWrongItem ? `${theme.colors.error}10` : `${theme.colors.success}10`,
    color: isCurrent ? theme.colors.primary : isWrongItem ? theme.colors.error : theme.colors.success,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.sm,
    fontWeight: isCurrent ? theme.fontWeights.bold : theme.fontWeights.medium,
    cursor: 'pointer',
    transition: `all ${theme.transitions.fast}`,
    touchAction: 'manipulation',
  });

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

  const previewScore = evaluateQuestion(question, state?.answer ?? { selected: [] } as AnswerData, scoringMode);

  return (
    <div className={className} style={containerStyle}>
      <div style={summaryBarStyle}>
        <div>
          <div style={{ fontSize: theme.fontSize.lg, fontWeight: theme.fontWeights.bold, color: theme.colors.text }}>
            题组复盘
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

      <div style={bodyStyle}>
        <div style={questionCardStyle}>
          <div style={cardHeaderStyle}>
            <div style={cardHeaderLeftStyle}>
              <span>{isWrong ? '✗' : '✓'}</span>
              <span>第 {currentIndex + 1} 题 · {typeLabels[question.type] || question.type}</span>
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

        {summary.wrongList.length > 0 && (
          <div>
            <div style={{ fontSize: theme.fontSize.sm, fontWeight: theme.fontWeights.semibold, color: theme.colors.error, marginBottom: theme.spacing.xs }}>
              错题速览（点击跳转）
            </div>
            <div style={wrongListStyle}>
              {questions.map((q, i) => {
                const s = statesMap[q.id];
                const isWrongItem = s?.result ? !s.result.isCorrect : false;
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={q.id}
                    type="button"
                    style={wrongItemBtnStyle(isCurrent, isWrongItem)}
                    onClick={() => onJump(i)}
                    aria-label={`第 ${i + 1} 题，${isWrongItem ? '答错' : '答对'}${isCurrent ? '，当前' : ''}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
            disabled={currentIndex === 0}
          />
          <span style={{ fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, minWidth: '60px', textAlign: 'center' }}>
            {currentIndex + 1} / {questions.length}
          </span>
          <NavButton
            direction="next"
            onClick={handleNext}
            disabled={currentIndex >= questions.length - 1}
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
