import React, { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useA11y } from '../hooks/useA11y';
import { useTimer } from '../hooks/useTimer';
import { useDraft, createAnswerDraft } from '../hooks/useDraft';
import { useExerciseKeyboard } from '../hooks/useKeyboard';
import { createQuestionResult, isAnswerComplete } from '../utils/scoring';
import type {
  Question,
  AnswerData,
  QuestionResult,
  ExerciseCallbacks,
  ScoringMode,
  MultipleChoiceAnswer,
  FillBlankAnswer,
  MatchingAnswer,
  SortingAnswer,
  ListeningAnswer,
} from '../types';

import { QuestionHeader } from './common/QuestionHeader';
import { Timer as TimerDisplay } from './common/Timer';
import { CollectButton, MarkButton, RedoButton, NavButton } from './common/ActionButtons';
import { Button } from './common/Button';
import { MultipleChoice } from './questions/MultipleChoice';
import { FillBlank } from './questions/FillBlank';
import { Matching } from './questions/Matching';
import { Sorting } from './questions/Sorting';
import { Listening } from './questions/Listening';
import { AnalysisPanel } from './AnalysisPanel';

export interface ExerciseContainerProps {
  question: Question;
  questions?: Question[];
  currentIndex?: number;
  scoringMode?: ScoringMode;
  autoStartTimer?: boolean;
  showTimer?: boolean;
  showNavButtons?: boolean;
  showCollect?: boolean;
  showMark?: boolean;
  showAnalysis?: boolean;
  showRedo?: boolean;
  canSubmitIncomplete?: boolean;
  initialAnswer?: AnswerData | null;
  initialIsMarked?: boolean;
  initialIsCollected?: boolean;
  callbacks?: ExerciseCallbacks;
  className?: string;
  style?: CSSProperties;
  bodyClassName?: string;
  bodyStyle?: CSSProperties;
}

export const ExerciseContainer: React.FC<ExerciseContainerProps> = ({
  question,
  questions,
  currentIndex = 0,
  scoringMode = 'strict',
  autoStartTimer = true,
  showTimer = true,
  showNavButtons = true,
  showCollect = true,
  showMark = true,
  showAnalysis = true,
  showRedo = true,
  canSubmitIncomplete = false,
  initialAnswer = null,
  initialIsMarked = false,
  initialIsCollected = false,
  callbacks = {},
  className,
  style,
  bodyClassName,
  bodyStyle,
}) => {
  const { theme } = useTheme();
  const { announce, announceSuccess, announceError, announceInfo } = useA11y();

  const [answer, setAnswer] = useState<AnswerData | null>(() => {
    if (initialAnswer) return initialAnswer;
    return createAnswerDraft(question);
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [isMarked, setIsMarked] = useState(initialIsMarked);
  const [isCollected, setIsCollected] = useState(initialIsCollected);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalQuestions = questions?.length || 1;

  const timer = useTimer({
    autoStart: autoStartTimer,
    timeLimit: question.timeLimit,
    onTimeout: () => {
      announceError('答题时间已到');
      callbacks.onTimeout?.(question);
      if (!isSubmitted) {
        handleSubmit(true);
      }
    },
  });

  const {
    draft,
    setDraft,
    clearDraft,
    hasDraft,
    lastSaved,
    isSaving,
  } = useDraft({
    questionId: question.id,
    initialValue: answer,
  });

  useEffect(() => {
    if (draft !== null && answer === null) {
      setAnswer(draft);
    }
  }, [draft, answer]);

  const handleAnswerChange = useCallback((newAnswer: AnswerData) => {
    setAnswer(newAnswer);
    setDraft(newAnswer);
    callbacks.onAnswerChange?.(question, newAnswer);
  }, [question, callbacks, setDraft]);

  const handleSubmit = useCallback((fromTimeout = false) => {
    if (isSubmitted || isSubmitting) return;

    const currentAnswer = answer ?? createAnswerDraft(question);

    if (!canSubmitIncomplete && !fromTimeout && !isAnswerComplete(question, currentAnswer)) {
      announceError('请先完成作答后再提交');
      return;
    }

    setIsSubmitting(true);

    timer.pause();

    const questionResult = createQuestionResult(
      question,
      currentAnswer,
      timer.time,
      isMarked,
      isCollected,
      scoringMode
    );

    setTimeout(() => {
      setResult(questionResult);
      setIsSubmitted(true);
      setIsSubmitting(false);
      clearDraft();

      if (questionResult.isCorrect) {
        announceSuccess(`回答正确，得分 ${questionResult.score.earned} / ${questionResult.score.total}`);
      } else {
        announceError(`回答错误，得分 ${questionResult.score.earned} / ${questionResult.score.total}`);
      }

      callbacks.onSubmit?.(question, questionResult);
      callbacks.onComplete?.(questionResult);
    }, 300);
  }, [
    isSubmitted,
    isSubmitting,
    answer,
    question,
    canSubmitIncomplete,
    timer,
    isMarked,
    isCollected,
    scoringMode,
    clearDraft,
    callbacks,
    announceSuccess,
    announceError,
  ]);

  const handleRedo = useCallback(() => {
    if (result) {
      announceInfo('开始重做本题');
      callbacks.onRedo?.(question);
    }

    setIsSubmitted(false);
    setResult(null);
    const freshAnswer = createAnswerDraft(question);
    setAnswer(freshAnswer);
    clearDraft();
    timer.reset();
    if (autoStartTimer) {
      timer.start();
    }
  }, [question, result, clearDraft, timer, autoStartTimer, callbacks, announceInfo]);

  const handleCollect = useCallback(() => {
    const newValue = !isCollected;
    setIsCollected(newValue);
    callbacks.onCollect?.(question, newValue);
    announce(newValue ? '已收藏题目' : '已取消收藏');
  }, [isCollected, question, callbacks, announce]);

  const handleMark = useCallback(() => {
    const newValue = !isMarked;
    setIsMarked(newValue);
    callbacks.onMark?.(question, newValue);
    announce(newValue ? '已标记题目' : '已取消标记');
  }, [isMarked, question, callbacks, announce]);

  const handleNext = useCallback(() => {
    const nextQuestion = questions && currentIndex < questions.length - 1
      ? questions[currentIndex + 1]
      : undefined;
    callbacks.onNext?.(question, nextQuestion);
    announceInfo(nextQuestion ? '切换到下一题' : '已是最后一题');
  }, [questions, currentIndex, question, callbacks, announceInfo]);

  const handlePrev = useCallback(() => {
    const prevQuestion = questions && currentIndex > 0
      ? questions[currentIndex - 1]
      : undefined;
    callbacks.onPrev?.(question, prevQuestion);
    announceInfo(prevQuestion ? '切换到上一题' : '已是第一题');
  }, [questions, currentIndex, question, callbacks, announceInfo]);

  useExerciseKeyboard({
    onSubmit: () => {
      if (!isSubmitted) handleSubmit();
    },
    onRedo: () => {
      if (showRedo && isSubmitted) handleRedo();
    },
    onNext: () => {
      if (showNavButtons) handleNext();
    },
    onPrev: () => {
      if (showNavButtons) handlePrev();
    },
  });

  useEffect(() => {
    setIsSubmitted(false);
    setResult(null);
    setAnswer(createAnswerDraft(question));
    timer.reset();
    if (autoStartTimer) {
      timer.start();
    }
  }, [question.id]);

  const answerComplete = useMemo(() => {
    return isAnswerComplete(question, answer);
  }, [question, answer]);

  const renderQuestionComponent = () => {
    const commonProps = {
      isSubmitted,
      scoreResult: result?.score ?? null,
      disabled: isSubmitted,
      readOnly: isSubmitted,
      showCorrectAnswer: isSubmitted,
      onAnswerDataChange: handleAnswerChange,
    };

    switch (question.type) {
      case 'multiple-choice':
        return (
          <MultipleChoice
            question={question}
            value={answer as MultipleChoiceAnswer | null}
            {...commonProps}
          />
        );
      case 'fill-blank':
        return (
          <FillBlank
            question={question}
            value={answer as FillBlankAnswer | null}
            {...commonProps}
          />
        );
      case 'matching':
        return (
          <Matching
            question={question}
            value={answer as MatchingAnswer | null}
            {...commonProps}
          />
        );
      case 'sorting':
        return (
          <Sorting
            question={question}
            value={answer as SortingAnswer | null}
            {...commonProps}
          />
        );
      case 'listening':
        return (
          <Listening
            question={question}
            value={answer as ListeningAnswer | null}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  const containerStyle: CSSProperties = {
    width: '100%',
    maxWidth: '960px',
    margin: '0 auto',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.md,
    overflow: 'hidden',
    ...style,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottom: `1px solid ${theme.colors.border}`,
  };

  const headerLeftStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  };

  const headerRightStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  };

  const bodyContainerStyle: CSSProperties = {
    padding: theme.spacing.lg,
    ...bodyStyle,
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

  const footerLeftStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  };

  const footerRightStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  };

  const draftStatusStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  };

  return (
    <div className={className} style={containerStyle}>
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          {showTimer && (
            <TimerDisplay
              time={timer.time}
              formattedTime={timer.formattedTime}
              remainingTime={timer.remainingTime}
              formattedRemainingTime={timer.formattedRemainingTime}
              progress={timer.progress}
              isRunning={timer.isRunning && !timer.isPaused}
              size="md"
            />
          )}
        </div>

        <div style={headerRightStyle}>
          {showCollect && (
            <CollectButton
              isActive={isCollected}
              onClick={handleCollect}
              ariaLabel={isCollected ? '取消收藏' : '收藏题目'}
            />
          )}
          {showMark && (
            <MarkButton
              isActive={isMarked}
              onClick={handleMark}
              ariaLabel={isMarked ? '取消标记' : '标记题目'}
            />
          )}
          {showRedo && isSubmitted && (
            <RedoButton onClick={handleRedo} ariaLabel="重做本题" />
          )}
        </div>
      </div>

      <div className={bodyClassName} style={bodyContainerStyle}>
        <QuestionHeader
          question={question}
          index={questions ? currentIndex : undefined}
          total={questions ? totalQuestions : undefined}
        />

        {renderQuestionComponent()}

        {isSubmitted && showAnalysis && result && (
          <AnalysisPanel
            question={question}
            result={result}
            onRedo={showRedo ? handleRedo : undefined}
          />
        )}
      </div>

      <div style={footerStyle}>
        <div style={footerLeftStyle}>
          {!isSubmitted && (
            <span style={draftStatusStyle}>
              {isSaving ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    border: `2px solid ${theme.colors.primary}`,
                    borderTopColor: 'transparent',
                    borderRadius: theme.borderRadius.full,
                    animation: 'edu-spin 0.8s linear infinite',
                  }} />
                  草稿保存中...
                </>
              ) : hasDraft && lastSaved ? (
                <>
                  <span style={{ color: theme.colors.success }}>✓</span>
                  草稿已保存（{lastSaved.toLocaleTimeString()}）
                </>
              ) : (
                <span style={{ color: theme.colors.disabledText }}>
                  未保存草稿
                </span>
              )}
            </span>
          )}

          {!isSubmitted && !answerComplete && !canSubmitIncomplete && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              fontSize: theme.fontSize.sm,
              color: theme.colors.warning,
            }}>
              ⚠ 请完成所有作答
            </span>
          )}
        </div>

        <div style={footerRightStyle}>
          {showNavButtons && (
            <NavButton
              direction="prev"
              onClick={handlePrev}
              disabled={!questions || currentIndex === 0}
            />
          )}

          {!isSubmitted ? (
            <Button
              variant="primary"
              onClick={() => handleSubmit(false)}
              disabled={(!canSubmitIncomplete && !answerComplete) || isSubmitting}
              loading={isSubmitting}
              size="lg"
              icon={<span>✓</span>}
              ariaLabel="提交答案"
            >
              提交答案
            </Button>
          ) : (
            showNavButtons && (
              <NavButton
                direction="next"
                onClick={handleNext}
                disabled={!questions || currentIndex >= totalQuestions - 1}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

ExerciseContainer.displayName = 'ExerciseContainer';
