import type {
  Question,
  QuestionResult,
  ScoreDetail,
  AnswerData,
  MultipleChoiceQuestion,
  MultipleChoiceAnswer,
  FillBlankQuestion,
  FillBlankAnswer,
  MatchingQuestion,
  MatchingAnswer,
  SortingQuestion,
  SortingAnswer,
  ListeningQuestion,
  ListeningAnswer,
  ScoringMode,
} from '../types';

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((item, index) => item === sortedB[index]);
}

function orderedArraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

function normalizeString(str: string, caseSensitive: boolean): string {
  const trimmed = str.trim();
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

export function evaluateMultipleChoice(
  question: MultipleChoiceQuestion,
  answer: MultipleChoiceAnswer,
  scoringMode: ScoringMode = 'strict'
): ScoreDetail {
  const totalScore = question.score ?? 1;
  const correctAnswers = question.correctAnswers;
  const userAnswers = answer.selected;
  const details: ScoreDetail['details'] = [];
  let correctCount = 0;
  let earnedScore = 0;

  question.options.forEach(option => {
    const isCorrect = correctAnswers.includes(option.id);
    const isSelected = userAnswers.includes(option.id);
    const correct = isCorrect === isSelected;
    if (correct && isCorrect) correctCount++;

    details.push({
      id: option.id,
      correct,
      userAnswer: isSelected,
      correctAnswer: isCorrect,
      reason: correct
        ? undefined
        : isCorrect
        ? '漏选正确选项'
        : '选择了错误选项',
    });
  });

  const totalCount = correctAnswers.length;

  if (scoringMode === 'strict') {
    const isAllCorrect = arraysEqual(correctAnswers, userAnswers);
    earnedScore = isAllCorrect ? totalScore : 0;
  } else if (scoringMode === 'partial') {
    if (totalCount > 0) {
      const perItemScore = totalScore / totalCount;
      const wrongCount = userAnswers.filter(
        id => !correctAnswers.includes(id)
      ).length;
      earnedScore = Math.max(0, correctCount * perItemScore - wrongCount * perItemScore * 0.5);
    }
  } else if (scoringMode === 'any') {
    const hasCorrect = userAnswers.some(id => correctAnswers.includes(id));
    earnedScore = hasCorrect ? totalScore : 0;
  }

  return {
    total: totalScore,
    earned: Number(earnedScore.toFixed(2)),
    correctCount,
    totalCount,
    details,
  };
}

export function evaluateFillBlank(
  question: FillBlankQuestion,
  answer: FillBlankAnswer,
  scoringMode: ScoringMode = 'strict'
): ScoreDetail {
  const totalScore = question.score ?? 1;
  const details: ScoreDetail['details'] = [];
  let correctCount = 0;

  question.blanks.forEach(blank => {
    const userValue = answer.blanks[blank.id] || '';
    const caseSensitive = blank.caseSensitive ?? false;
    const normalizedUser = normalizeString(userValue, caseSensitive);
    const isCorrect = blank.correctAnswers.some(
      correct => normalizeString(correct, caseSensitive) === normalizedUser
    );

    if (isCorrect) correctCount++;

    details.push({
      id: blank.id,
      correct: isCorrect,
      userAnswer: userValue,
      correctAnswer: blank.correctAnswers[0],
      reason: isCorrect ? undefined : userValue.trim() === '' ? '未作答' : '答案不正确',
    });
  });

  const totalCount = question.blanks.length;
  let earnedScore = 0;

  if (scoringMode === 'strict') {
    earnedScore = correctCount === totalCount ? totalScore : 0;
  } else if (scoringMode === 'partial') {
    if (totalCount > 0) {
      const perItemScore = totalScore / totalCount;
      earnedScore = correctCount * perItemScore;
    }
  } else if (scoringMode === 'any') {
    earnedScore = correctCount > 0 ? totalScore : 0;
  }

  return {
    total: totalScore,
    earned: Number(earnedScore.toFixed(2)),
    correctCount,
    totalCount,
    details,
  };
}

export function evaluateMatching(
  question: MatchingQuestion,
  answer: MatchingAnswer,
  scoringMode: ScoringMode = 'strict'
): ScoreDetail {
  const totalScore = question.score ?? 1;
  const details: ScoreDetail['details'] = [];
  let correctCount = 0;

  question.pairs.forEach(pair => {
    const userMatch = answer.matches[pair.leftId];
    const isCorrect = userMatch === pair.rightId;

    if (isCorrect) correctCount++;

    details.push({
      id: pair.leftId,
      correct: isCorrect,
      userAnswer: userMatch || null,
      correctAnswer: pair.rightId,
      reason: isCorrect ? undefined : userMatch ? '配对错误' : '未配对',
    });
  });

  const totalCount = question.pairs.length;
  let earnedScore = 0;

  if (scoringMode === 'strict') {
    earnedScore = correctCount === totalCount ? totalScore : 0;
  } else if (scoringMode === 'partial') {
    if (totalCount > 0) {
      const perItemScore = totalScore / totalCount;
      earnedScore = correctCount * perItemScore;
    }
  } else if (scoringMode === 'any') {
    earnedScore = correctCount > 0 ? totalScore : 0;
  }

  return {
    total: totalScore,
    earned: Number(earnedScore.toFixed(2)),
    correctCount,
    totalCount,
    details,
  };
}

export function evaluateSorting(
  question: SortingQuestion,
  answer: SortingAnswer,
  scoringMode: ScoringMode = 'strict'
): ScoreDetail {
  const totalScore = question.score ?? 1;
  const details: ScoreDetail['details'] = [];
  let correctCount = 0;

  question.correctOrder.forEach((correctId, index) => {
    const userId = answer.order[index];
    const isCorrect = userId === correctId;

    if (isCorrect) correctCount++;

    const userItem = question.items.find(i => i.id === userId);
    const correctItem = question.items.find(i => i.id === correctId);

    details.push({
      id: `position-${index}`,
      correct: isCorrect,
      userAnswer: userItem?.content || null,
      correctAnswer: correctItem?.content || null,
      reason: isCorrect ? undefined : '位置不正确',
    });
  });

  const totalCount = question.correctOrder.length;
  let earnedScore = 0;

  if (scoringMode === 'strict') {
    earnedScore = orderedArraysEqual(question.correctOrder, answer.order) ? totalScore : 0;
  } else if (scoringMode === 'partial') {
    if (totalCount > 0) {
      const perItemScore = totalScore / totalCount;
      earnedScore = correctCount * perItemScore;
    }
  } else if (scoringMode === 'any') {
    earnedScore = correctCount > 0 ? totalScore : 0;
  }

  return {
    total: totalScore,
    earned: Number(earnedScore.toFixed(2)),
    correctCount,
    totalCount,
    details,
  };
}

export function evaluateListening(
  question: ListeningQuestion,
  answer: ListeningAnswer,
  scoringMode: ScoringMode = 'strict'
): ScoreDetail {
  const innerQuestion = question.questions;
  const innerAnswer = answer.inner;

  let innerScore: ScoreDetail;

  if (innerQuestion.type === 'multiple-choice') {
    innerScore = evaluateMultipleChoice(innerQuestion, innerAnswer as MultipleChoiceAnswer, scoringMode);
  } else {
    innerScore = evaluateFillBlank(innerQuestion, innerAnswer as FillBlankAnswer, scoringMode);
  }

  const outerTotal = question.score;
  if (outerTotal === undefined || outerTotal === innerScore.total || innerScore.total === 0) {
    return innerScore;
  }

  const ratio = outerTotal / innerScore.total;
  const scaledEarned = Number((innerScore.earned * ratio).toFixed(2));

  return {
    ...innerScore,
    total: outerTotal,
    earned: scaledEarned,
  };
}

export function evaluateQuestion(
  question: Question,
  answer: AnswerData,
  scoringMode: ScoringMode = 'strict'
): ScoreDetail {
  switch (question.type) {
    case 'multiple-choice':
      return evaluateMultipleChoice(question, answer as MultipleChoiceAnswer, scoringMode);
    case 'fill-blank':
      return evaluateFillBlank(question, answer as FillBlankAnswer, scoringMode);
    case 'matching':
      return evaluateMatching(question, answer as MatchingAnswer, scoringMode);
    case 'sorting':
      return evaluateSorting(question, answer as SortingAnswer, scoringMode);
    case 'listening':
      return evaluateListening(question, answer as ListeningAnswer, scoringMode);
    default:
      return {
        total: 0,
        earned: 0,
        correctCount: 0,
        totalCount: 0,
        details: [],
      };
  }
}

export function generateErrorReasons(score: ScoreDetail): string[] {
  const reasons: string[] = [];

  if (!score.details) return reasons;

  const wrongItems = score.details.filter(d => !d.correct);
  
  if (wrongItems.length === 0) return reasons;

  const reasonsSet = new Set<string>();
  wrongItems.forEach(item => {
    if (item.reason) {
      reasonsSet.add(item.reason);
    }
  });

  reasons.push(...Array.from(reasonsSet));

  if (score.total > 0 && score.earned === 0 && reasons.length === 0) {
    reasons.push('答案全部错误');
  }

  return reasons;
}

export function createQuestionResult(
  question: Question,
  answer: AnswerData,
  timeSpent: number,
  isMarked: boolean,
  isCollected: boolean,
  scoringMode: ScoringMode = 'strict'
): QuestionResult {
  const score = evaluateQuestion(question, answer, scoringMode);
  const errorReasons = generateErrorReasons(score);
  const isCorrect = score.correctCount === score.totalCount && score.totalCount > 0;

  return {
    questionId: question.id,
    isCorrect,
    score,
    answer,
    timeSpent,
    isMarked,
    isCollected,
    errorReasons: errorReasons.length > 0 ? errorReasons : undefined,
  };
}

export function isAnswerComplete(question: Question, answer: AnswerData | null): boolean {
  if (!answer) return false;

  switch (question.type) {
    case 'multiple-choice':
      return (answer as MultipleChoiceAnswer).selected.length > 0;
    case 'fill-blank': {
      const blanks = (answer as FillBlankAnswer).blanks;
      return question.blanks.every(blank => {
        const value = blanks[blank.id] || '';
        return value.trim().length > 0;
      });
    }
    case 'matching':
      return question.pairs.every(pair => 
        (answer as MatchingAnswer).matches[pair.leftId] !== undefined
      );
    case 'sorting':
      return (answer as SortingAnswer).order.length === question.items.length;
    case 'listening':
      return isAnswerComplete(question.questions, (answer as ListeningAnswer).inner);
    default:
      return false;
  }
}
