import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useA11y } from '../hooks/useA11y';
import { useTimer } from '../hooks/useTimer';
import { useDraft, createAnswerDraft, clearDraftByQuestionId } from '../hooks/useDraft';
import { useExerciseKeyboard } from '../hooks/useKeyboard';
import { createQuestionResult, evaluateQuestion, isAnswerComplete } from '../utils/scoring';
import type {
  Question,
  AnswerData,
  QuestionResult,
  ExerciseCallbacks,
  ExerciseSetCallbacks,
  ExerciseProgress,
  ExerciseResult,
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
import { ProgressPanel } from './ProgressPanel';
import { ReviewPanel } from './ReviewPanel';

export interface ExerciseContainerProps {
  question?: Question;
  questions?: Question[];
  currentIndex?: number;
  initialIndex?: number;
  scoringMode?: ScoringMode;
  autoStartTimer?: boolean;
  showTimer?: boolean;
  showNavButtons?: boolean;
  showCollect?: boolean;
  showMark?: boolean;
  showAnalysis?: boolean;
  showRedo?: boolean;
  showProgress?: boolean;
  progressPosition?: 'left' | 'right' | 'top' | 'none';
  showSubmitAll?: boolean;
  canSubmitIncomplete?: boolean;
  canSubmitAllIncomplete?: boolean;
  initialAnswer?: AnswerData | null;
  initialAnswers?: Record<string, AnswerData>;
  initialResults?: Record<string, QuestionResult>;
  initialIsMarked?: boolean;
  initialIsCollected?: boolean;
  callbacks?: ExerciseCallbacks & ExerciseSetCallbacks;
  className?: string;
  style?: CSSProperties;
  bodyClassName?: string;
  bodyStyle?: CSSProperties;
}

interface PerQuestionState {
  answer: AnswerData;
  result: QuestionResult | null;
  isSubmitted: boolean;
  isMarked: boolean;
  isCollected: boolean;
  elapsedTime: number;
}

function initQuestionState(
  question: Question,
  initialAnswer?: AnswerData | null,
  initialResult?: QuestionResult | null,
  initialIsMarked = false,
  initialIsCollected = false
): PerQuestionState {
  return {
    answer: initialAnswer ?? createAnswerDraft(question),
    result: initialResult ?? null,
    isSubmitted: !!initialResult,
    isMarked: initialIsMarked,
    isCollected: initialIsCollected,
    elapsedTime: initialResult?.timeSpent ?? 0,
  };
}

function buildExerciseResult(
  questions: Question[],
  statesMap: Record<string, PerQuestionState>,
  startTime: Date
): ExerciseResult {
  const results = questions
    .map(q => statesMap[q.id]?.result)
    .filter((r): r is QuestionResult => r !== null);

  const totalScore = results.reduce((sum, r) => sum + r.score.total, 0);
  const earnedScore = results.reduce((sum, r) => sum + r.score.earned, 0);
  const correctCount = results.filter(r => r.isCorrect).length;
  const totalTimeSpent = results.reduce((sum, r) => sum + r.timeSpent, 0);
  const wrongQuestions = questions.filter(q => {
    const r = statesMap[q.id]?.result;
    return r && !r.isCorrect;
  });

  return {
    questions,
    results,
    totalScore,
    earnedScore,
    correctCount,
    totalCount: results.length,
    accuracy: results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0,
    totalTimeSpent,
    wrongQuestions,
    startTime,
    endTime: new Date(),
  };
}

export const ExerciseContainer: React.FC<ExerciseContainerProps> = ({
  question: singleQuestion,
  questions: questionsProp,
  currentIndex: controlledIndex,
  initialIndex = 0,
  scoringMode = 'strict',
  autoStartTimer = true,
  showTimer = true,
  showNavButtons = true,
  showCollect = true,
  showMark = true,
  showAnalysis = true,
  showRedo = true,
  showProgress,
  progressPosition = 'right',
  showSubmitAll = true,
  canSubmitIncomplete = false,
  canSubmitAllIncomplete = false,
  initialAnswer = null,
  initialAnswers,
  initialResults,
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

  const questions = useMemo<Question[]>(() => {
    if (questionsProp && questionsProp.length > 0) return questionsProp;
    if (singleQuestion) return [singleQuestion];
    return [];
  }, [questionsProp, singleQuestion]);

  const isSetMode = questionsProp !== undefined && questionsProp.length > 1;
  const shouldShowProgress = showProgress ?? isSetMode;

  const [internalIndex, setInternalIndex] = useState(initialIndex);
  const currentIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;
  const currentQuestion = questions[currentIndex];

  const [statesMap, setStatesMap] = useState<Record<string, PerQuestionState>>(() => {
    const map: Record<string, PerQuestionState> = {};
    questions.forEach(q => {
      const initAnswer = initialAnswers?.[q.id] ?? (q.id === singleQuestion?.id ? initialAnswer : null);
      const initResult = initialResults?.[q.id] ?? null;

      let draftAnswer: AnswerData | null = null;
      try {
        const raw = localStorage.getItem(`edu-exercise-draft-${q.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.questionType === undefined || parsed.questionType === q.type) {
            draftAnswer = parsed.data;
          }
        }
      } catch { /* ignore */ }

      const finalAnswer = initAnswer ?? draftAnswer;
      map[q.id] = initQuestionState(q, finalAnswer, initResult, initialIsMarked, initialIsCollected);
    });
    return map;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [startTime] = useState(() => new Date());
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const hasStartedRef = useRef(false);

  const timer = useTimer({
    autoStart: false,
    timeLimit: currentQuestion?.timeLimit,
    onTimeout: () => {
      if (!currentQuestion) return;
      announceError('答题时间已到');
      callbacks.onTimeout?.(currentQuestion);
      const state = statesMap[currentQuestion.id];
      if (state && !state.isSubmitted) {
        submitCurrent(true);
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
    questionId: currentQuestion?.id ?? '__empty__',
    questionType: currentQuestion?.type,
    initialValue: null,
  });

  const currentState = currentQuestion ? statesMap[currentQuestion.id] : null;

  const answer = useMemo<AnswerData | null>(() => {
    if (!currentState || !currentQuestion) return null;
    if (draft !== null && !currentState.isSubmitted) return draft;
    return currentState.answer;
  }, [currentQuestion, currentState, draft]);

  const updateState = useCallback((questionId: string, patch: Partial<PerQuestionState>) => {
    setStatesMap(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...patch },
    }));
  }, []);

  const accumulateCurrentTime = useCallback(() => {
    if (!currentQuestion) return;
    const state = statesMap[currentQuestion.id];
    if (!state || state.isSubmitted) return;
    if (timer.time > state.elapsedTime) {
      updateState(currentQuestion.id, { elapsedTime: timer.time });
    }
  }, [currentQuestion, statesMap, timer.time, updateState]);

  const startTimerForCurrent = useCallback(() => {
    if (!currentQuestion || !currentState) return;
    if (currentState.isSubmitted) {
      timer.pause();
      return;
    }
    timer.reset(currentState.elapsedTime);
    if (autoStartTimer) {
      timer.start();
    }
  }, [currentQuestion?.id, currentState?.isSubmitted, currentState?.elapsedTime, timer, autoStartTimer]);

  const progress = useMemo<ExerciseProgress>(() => {
    let answeredCount = 0;
    let submittedCount = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let totalScore = 0;
    let earnedScore = 0;

    const items = questions.map((q, index) => {
      const state = statesMap[q.id];
      if (!state) {
        totalScore += q.score ?? 1;
        return {
          index,
          questionId: q.id,
          status: 'unanswered' as const,
          isMarked: false,
          isCollected: false,
          score: 0,
        };
      }

      const effectiveAnswer = state.answer ?? createAnswerDraft(q);
      const isAnswered = isAnswerComplete(q, effectiveAnswer);

      if (state.isSubmitted) {
        submittedCount++;
        if (state.result?.isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
        earnedScore += state.result?.score.earned ?? 0;
      } else if (isAnswered) {
        const preview = evaluateQuestion(q, effectiveAnswer, scoringMode);
        earnedScore += preview.earned;
      }

      if (isAnswered) answeredCount++;
      totalScore += q.score ?? 1;

      let status: 'unanswered' | 'answered' | 'submitted' | 'wrong' = 'unanswered';
      if (state.isSubmitted) {
        status = state.result?.isCorrect ? 'submitted' : 'wrong';
      } else if (isAnswered) {
        status = 'answered';
      }

      return {
        index,
        questionId: q.id,
        status,
        isMarked: state.isMarked,
        isCollected: state.isCollected,
        score: state.isSubmitted
          ? (state.result?.score.earned ?? 0)
          : (isAnswered ? evaluateQuestion(q, effectiveAnswer, scoringMode).earned : 0),
      };
    });

    return {
      total: questions.length,
      answeredCount,
      submittedCount,
      correctCount,
      wrongCount,
      totalScore,
      earnedScore: Number(earnedScore.toFixed(2)),
      items,
    };
  }, [questions, statesMap, scoringMode]);

  const jumpTo = useCallback((index: number) => {
    if (!questions[index] || index === currentIndex) return;

    accumulateCurrentTime();
    timer.pause();

    if (controlledIndex === undefined) {
      setInternalIndex(index);
    }

    const nextQuestion = questions[index];
    callbacks.onQuestionChange?.(index, nextQuestion, progress);
    announceInfo(`切换到第 ${index + 1} 题`);
  }, [questions, currentIndex, controlledIndex, progress, callbacks, announceInfo, accumulateCurrentTime, timer]);

  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      announceInfo('已是最后一题');
      const current = questions[currentIndex];
      callbacks.onNext?.(current, undefined);
      return;
    }
    const current = questions[currentIndex];
    const next = questions[nextIndex];
    callbacks.onNext?.(current, next);
    jumpTo(nextIndex);
  }, [currentIndex, questions, jumpTo, callbacks, announceInfo]);

  const handlePrev = useCallback(() => {
    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      announceInfo('已是第一题');
      const current = questions[currentIndex];
      callbacks.onPrev?.(current, undefined);
      return;
    }
    const current = questions[currentIndex];
    const prev = questions[prevIndex];
    callbacks.onPrev?.(current, prev);
    jumpTo(prevIndex);
  }, [currentIndex, questions, jumpTo, callbacks, announceInfo]);

  const fireCompleteIfNeeded = useCallback((newStates: Record<string, PerQuestionState>) => {
    const allDone = questions.every(q => newStates[q.id]?.isSubmitted);
    if (!allDone) return;

    const exerciseResult = buildExerciseResult(questions, newStates, startTime);
    callbacks.onExerciseComplete?.(exerciseResult);

    if (isSetMode) {
      setReviewMode(true);
      setReviewIndex(0);
    }
  }, [questions, startTime, callbacks, isSetMode]);

  const submitCurrent = useCallback((fromTimeout = false) => {
    if (!currentQuestion || !currentState || currentState.isSubmitted || isSubmitting) return;

    const currentAnswer = currentState.answer;

    if (!canSubmitIncomplete && !fromTimeout && !isAnswerComplete(currentQuestion, currentAnswer)) {
      announceError('请先完成作答后再提交');
      return;
    }

    setIsSubmitting(true);
    timer.pause();
    accumulateCurrentTime();

    const currentElapsed = Math.max(timer.time, currentState.elapsedTime);

    const questionResult = createQuestionResult(
      currentQuestion,
      currentAnswer,
      currentElapsed,
      currentState.isMarked,
      currentState.isCollected,
      scoringMode
    );

    setTimeout(() => {
      const newPatch: Partial<PerQuestionState> = {
        answer: currentAnswer,
        result: questionResult,
        isSubmitted: true,
        elapsedTime: currentElapsed,
      };

      setStatesMap(prev => {
        const next = {
          ...prev,
          [currentQuestion.id]: { ...prev[currentQuestion.id], ...newPatch },
        };

        setTimeout(() => fireCompleteIfNeeded(next), 0);
        return next;
      });

      clearDraft();
      clearDraftByQuestionId(currentQuestion.id);
      setIsSubmitting(false);

      if (questionResult.isCorrect) {
        announceSuccess(`回答正确，得分 ${questionResult.score.earned} / ${questionResult.score.total}`);
      } else {
        announceError(`回答错误，得分 ${questionResult.score.earned} / ${questionResult.score.total}`);
      }

      callbacks.onSubmit?.(currentQuestion, questionResult);
      callbacks.onComplete?.(questionResult);
    }, 300);
  }, [
    currentQuestion,
    currentState,
    isSubmitting,
    canSubmitIncomplete,
    timer,
    scoringMode,
    clearDraft,
    callbacks,
    announceSuccess,
    announceError,
    fireCompleteIfNeeded,
    accumulateCurrentTime,
  ]);

  const submitAll = useCallback(() => {
    if (isSubmittingAll) return;

    timer.pause();

    const unanswered: Question[] = [];
    const updatedStates: Record<string, PerQuestionState> = { ...statesMap };

    if (currentQuestion) {
      const curState = updatedStates[currentQuestion.id];
      if (curState && !curState.isSubmitted) {
        const currentElapsed = Math.max(timer.time, curState.elapsedTime);
        updatedStates[currentQuestion.id] = { ...curState, elapsedTime: currentElapsed };
      }
    }

    questions.forEach(q => {
      const state = updatedStates[q.id];
      if (!state) return;
      if (state.isSubmitted) return;
      if (!canSubmitAllIncomplete && !isAnswerComplete(q, state.answer)) {
        unanswered.push(q);
      }
    });

    if (!canSubmitAllIncomplete && unanswered.length > 0) {
      announceError(`还有 ${unanswered.length} 道题未完成作答`);
      return;
    }

    setIsSubmittingAll(true);

    setTimeout(() => {
      const newStatesMap = { ...updatedStates };

      questions.forEach(q => {
        const state = newStatesMap[q.id];
        if (!state || state.isSubmitted) return;

        const result = createQuestionResult(
          q,
          state.answer,
          state.elapsedTime,
          state.isMarked,
          state.isCollected,
          scoringMode
        );

        newStatesMap[q.id] = {
          ...state,
          result,
          isSubmitted: true,
        };

        clearDraftByQuestionId(q.id);
      });

      setStatesMap(newStatesMap);

      const exerciseResult = buildExerciseResult(questions, newStatesMap, startTime);

      if (currentQuestion && !statesMap[currentQuestion.id]?.isSubmitted) {
        clearDraft();
      }

      setIsSubmittingAll(false);
      announceInfo(`整组提交完成，共 ${exerciseResult.totalCount} 题，正确 ${exerciseResult.correctCount} 题`);

      callbacks.onExerciseSubmit?.(exerciseResult);
      callbacks.onExerciseComplete?.(exerciseResult);

      if (isSetMode) {
        setReviewMode(true);
        setReviewIndex(0);
      }
    }, 500);
  }, [
    questions,
    statesMap,
    currentQuestion,
    timer,
    isSubmittingAll,
    canSubmitAllIncomplete,
    scoringMode,
    startTime,
    clearDraft,
    callbacks,
    announceInfo,
    announceError,
    isSetMode,
  ]);

  const handleRedo = useCallback(() => {
    if (!currentQuestion || !currentState) return;

    if (currentState.result) {
      announceInfo('开始重做本题');
      callbacks.onRedo?.(currentQuestion);
    }

    const freshAnswer = createAnswerDraft(currentQuestion);
    updateState(currentQuestion.id, {
      answer: freshAnswer,
      result: null,
      isSubmitted: false,
      elapsedTime: 0,
    });
    setDraft(freshAnswer);
    setReviewMode(false);
    timer.reset(0);
    if (autoStartTimer) {
      timer.start();
    }
  }, [currentQuestion, currentState, updateState, setDraft, timer, autoStartTimer, callbacks, announceInfo]);

  const handleCollect = useCallback(() => {
    if (!currentQuestion || !currentState) return;
    const newValue = !currentState.isCollected;
    updateState(currentQuestion.id, { isCollected: newValue });
    callbacks.onCollect?.(currentQuestion, newValue);
    announce(newValue ? '已收藏题目' : '已取消收藏');
  }, [currentQuestion, currentState, updateState, callbacks, announce]);

  const handleMark = useCallback(() => {
    if (!currentQuestion || !currentState) return;
    const newValue = !currentState.isMarked;
    updateState(currentQuestion.id, { isMarked: newValue });
    callbacks.onMark?.(currentQuestion, newValue);
    announce(newValue ? '已标记题目' : '已取消标记');
  }, [currentQuestion, currentState, updateState, callbacks, announce]);

  const handleAnswerChange = useCallback((newAnswer: AnswerData) => {
    if (!currentQuestion || currentState?.isSubmitted) return;
    updateState(currentQuestion.id, { answer: newAnswer });
    setDraft(newAnswer);
    callbacks.onAnswerChange?.(currentQuestion, newAnswer);
  }, [currentQuestion, currentState?.isSubmitted, updateState, setDraft, callbacks]);

  const handleReviewJump = useCallback((index: number) => {
    if (index < 0 || index >= questions.length) return;
    setReviewIndex(index);
  }, [questions.length]);

  const handleReviewRedo = useCallback((index: number) => {
    setReviewMode(false);
    if (controlledIndex === undefined) {
      setInternalIndex(index);
    }
    const q = questions[index];
    if (!q) return;

    const freshAnswer = createAnswerDraft(q);
    updateState(q.id, {
      answer: freshAnswer,
      result: null,
      isSubmitted: false,
      elapsedTime: 0,
    });

    setTimeout(() => {
      setDraft(freshAnswer);
      timer.reset(0);
      if (autoStartTimer) {
        timer.start();
      }
    }, 50);
  }, [questions, controlledIndex, updateState, setDraft, timer, autoStartTimer]);

  useExerciseKeyboard({
    onSubmit: () => {
      if (reviewMode) return;
      if (currentState && !currentState.isSubmitted) {
        submitCurrent(false);
      }
    },
    onRedo: () => {
      if (reviewMode) return;
      if (showRedo && currentState?.isSubmitted) {
        handleRedo();
      }
    },
    onNext: () => {
      if (reviewMode) {
        handleReviewJump(reviewIndex + 1);
        return;
      }
      if (showNavButtons) handleNext();
    },
    onPrev: () => {
      if (reviewMode) {
        handleReviewJump(reviewIndex - 1);
        return;
      }
      if (showNavButtons) handlePrev();
    },
  });

  useEffect(() => {
    if (!hasStartedRef.current && questions.length > 0) {
      hasStartedRef.current = true;
      callbacks.onExerciseStart?.(questions);
    }
  }, [questions, callbacks]);

  useEffect(() => {
    if (!currentQuestion || reviewMode) return;
    startTimerForCurrent();
  }, [currentIndex, reviewMode]);

  const answerComplete = useMemo(() => {
    if (!currentQuestion || !answer) return false;
    return isAnswerComplete(currentQuestion, answer);
  }, [currentQuestion, answer]);

  const allSubmitted = useMemo(() => {
    return questions.every(q => statesMap[q.id]?.isSubmitted);
  }, [questions, statesMap]);

  const renderQuestionComponent = () => {
    if (!currentQuestion || !answer) return null;

    const commonProps = {
      isSubmitted: currentState?.isSubmitted ?? false,
      scoreResult: currentState?.result?.score ?? null,
      disabled: currentState?.isSubmitted ?? false,
      readOnly: currentState?.isSubmitted ?? false,
      showCorrectAnswer: currentState?.isSubmitted ?? false,
      onAnswerDataChange: handleAnswerChange,
    };

    switch (currentQuestion.type) {
      case 'multiple-choice':
        return (
          <MultipleChoice
            question={currentQuestion}
            value={answer as MultipleChoiceAnswer | null}
            {...commonProps}
          />
        );
      case 'fill-blank':
        return (
          <FillBlank
            question={currentQuestion}
            value={answer as FillBlankAnswer | null}
            {...commonProps}
          />
        );
      case 'matching':
        return (
          <Matching
            question={currentQuestion}
            value={answer as MatchingAnswer | null}
            {...commonProps}
          />
        );
      case 'sorting':
        return (
          <Sorting
            question={currentQuestion}
            value={answer as SortingAnswer | null}
            {...commonProps}
          />
        );
      case 'listening':
        return (
          <Listening
            question={currentQuestion}
            value={answer as ListeningAnswer | null}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  if (questions.length === 0 || !currentQuestion) {
    return (
      <div className={className} style={{ padding: theme.spacing.xl, textAlign: 'center', color: theme.colors.textSecondary }}>
        暂无题目
      </div>
    );
  }

  const containerStyle: CSSProperties = {
    width: '100%',
    maxWidth: progressPosition === 'left' || progressPosition === 'right' ? '1200px' : '960px',
    margin: '0 auto',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.md,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: progressPosition === 'top' ? 'column' : 'row',
    ...style,
  };

  const mainContentStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  };

  const sideStyle: CSSProperties = {
    width: '260px',
    flexShrink: 0,
    backgroundColor: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    padding: theme.spacing.md,
    [progressPosition === 'left' ? 'borderRight' : 'borderLeft']: `1px solid ${theme.colors.border}`,
  };

  const topProgressStyle: CSSProperties = {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottom: `1px solid ${theme.colors.border}`,
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
    flex: 1,
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

  const progressPanel = shouldShowProgress && (
    <ProgressPanel
      progress={progress}
      currentIndex={currentIndex}
      onJump={jumpTo}
      disabled={false}
    />
  );

  return (
    <div className={className} style={containerStyle}>
      {shouldShowProgress && progressPosition === 'left' && (
        <div style={sideStyle}>{progressPanel}</div>
      )}

      {shouldShowProgress && progressPosition === 'top' && (
        <div style={topProgressStyle}>{progressPanel}</div>
      )}

      <div style={mainContentStyle}>
        {reviewMode && isSetMode ? (
          <ReviewPanel
            questions={questions}
            statesMap={statesMap}
            currentIndex={reviewIndex}
            onJump={handleReviewJump}
            onRedo={handleReviewRedo}
            onExitReview={() => setReviewMode(false)}
            scoringMode={scoringMode}
          />
        ) : (
          <>
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
                    isActive={currentState?.isCollected ?? false}
                    onClick={handleCollect}
                    ariaLabel={currentState?.isCollected ? '取消收藏' : '收藏题目'}
                  />
                )}
                {showMark && (
                  <MarkButton
                    isActive={currentState?.isMarked ?? false}
                    onClick={handleMark}
                    ariaLabel={currentState?.isMarked ? '取消标记' : '标记题目'}
                  />
                )}
                {showRedo && currentState?.isSubmitted && (
                  <RedoButton onClick={handleRedo} ariaLabel="重做本题" />
                )}
                {isSetMode && allSubmitted && !reviewMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setReviewMode(true); setReviewIndex(currentIndex); }}
                  >
                    查看复盘
                  </Button>
                )}
              </div>
            </div>

            <div className={bodyClassName} style={bodyContainerStyle}>
              <QuestionHeader
                question={currentQuestion}
                index={currentIndex}
                total={questions.length}
              />

              {renderQuestionComponent()}

              {currentState?.isSubmitted && showAnalysis && currentState.result && (
                <AnalysisPanel
                  question={currentQuestion}
                  result={currentState.result}
                  onRedo={showRedo ? handleRedo : undefined}
                />
              )}
            </div>

            <div style={footerStyle}>
              <div style={footerLeftStyle}>
                {!currentState?.isSubmitted && (
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

                {!currentState?.isSubmitted && !answerComplete && !canSubmitIncomplete && (
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
                    disabled={currentIndex === 0}
                  />
                )}

                {!currentState?.isSubmitted ? (
                  <Button
                    variant="primary"
                    onClick={() => submitCurrent(false)}
                    disabled={(!canSubmitIncomplete && !answerComplete) || isSubmitting}
                    loading={isSubmitting}
                    size="lg"
                    icon={<span>✓</span>}
                    ariaLabel="提交答案"
                  >
                    提交本题
                  </Button>
                ) : (
                  showNavButtons && (
                    <NavButton
                      direction="next"
                      onClick={handleNext}
                      disabled={currentIndex >= questions.length - 1}
                    />
                  )
                )}

                {isSetMode && showSubmitAll && !allSubmitted && (
                  <Button
                    variant="secondary"
                    onClick={submitAll}
                    loading={isSubmittingAll}
                    disabled={isSubmittingAll}
                    size="lg"
                    icon={<span>📋</span>}
                    ariaLabel="整组提交"
                  >
                    整组提交
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {shouldShowProgress && progressPosition === 'right' && (
        <div style={sideStyle}>{progressPanel}</div>
      )}
    </div>
  );
};

ExerciseContainer.displayName = 'ExerciseContainer';
