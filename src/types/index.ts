export type QuestionType = 'multiple-choice' | 'fill-blank' | 'matching' | 'sorting' | 'listening';

export type QuestionStatus = 'pending' | 'answering' | 'submitted' | 'correct' | 'wrong';

export type ScoringMode = 'strict' | 'partial' | 'any';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  warning: string;
  warningLight: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  disabled: string;
  disabledText: string;
}

export interface ThemeConfig {
  colors: ThemeColors;
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  fontWeights: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
  isDark: boolean;
}

export interface ChoiceOption {
  id: string;
  label: string;
  value: string;
  hint?: string;
}

export interface MultipleChoiceQuestion {
  id: string;
  type: 'multiple-choice';
  title: string;
  description?: string;
  options: ChoiceOption[];
  correctAnswers: string[];
  isMultiple?: boolean;
  analysis?: string;
  difficulty?: number;
  tags?: string[];
  score?: number;
  timeLimit?: number;
}

export interface FillBlankItem {
  id: string;
  placeholder?: string;
  correctAnswers: string[];
  caseSensitive?: boolean;
}

export interface FillBlankQuestion {
  id: string;
  type: 'fill-blank';
  title: string;
  description?: string;
  content: (string | { blankId: string })[];
  blanks: FillBlankItem[];
  analysis?: string;
  difficulty?: number;
  tags?: string[];
  score?: number;
  timeLimit?: number;
}

export interface MatchingPair {
  leftId: string;
  leftContent: string;
  rightId: string;
  rightContent: string;
}

export interface MatchingQuestion {
  id: string;
  type: 'matching';
  title: string;
  description?: string;
  pairs: MatchingPair[];
  analysis?: string;
  difficulty?: number;
  tags?: string[];
  score?: number;
  timeLimit?: number;
}

export interface SortingItem {
  id: string;
  content: string;
}

export interface SortingQuestion {
  id: string;
  type: 'sorting';
  title: string;
  description?: string;
  items: SortingItem[];
  correctOrder: string[];
  analysis?: string;
  difficulty?: number;
  tags?: string[];
  score?: number;
  timeLimit?: number;
}

export interface ListeningQuestion {
  id: string;
  type: 'listening';
  title: string;
  description?: string;
  audioUrl: string;
  audioTitle?: string;
  canReplay?: boolean;
  maxReplays?: number;
  questions: MultipleChoiceQuestion | FillBlankQuestion;
  analysis?: string;
  difficulty?: number;
  tags?: string[];
  score?: number;
  timeLimit?: number;
}

export type Question =
  | MultipleChoiceQuestion
  | FillBlankQuestion
  | MatchingQuestion
  | SortingQuestion
  | ListeningQuestion;

export interface MultipleChoiceAnswer {
  selected: string[];
}

export interface FillBlankAnswer {
  blanks: Record<string, string>;
}

export interface MatchingAnswer {
  matches: Record<string, string>;
}

export interface SortingAnswer {
  order: string[];
}

export interface ListeningAnswer {
  inner: MultipleChoiceAnswer | FillBlankAnswer;
  replayCount: number;
}

export type AnswerData =
  | MultipleChoiceAnswer
  | FillBlankAnswer
  | MatchingAnswer
  | SortingAnswer
  | ListeningAnswer;

export interface ScoreDetail {
  total: number;
  earned: number;
  correctCount: number;
  totalCount: number;
  details?: {
    id: string;
    correct: boolean;
    userAnswer: unknown;
    correctAnswer: unknown;
    reason?: string;
  }[];
}

export interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  score: ScoreDetail;
  answer: AnswerData;
  timeSpent: number;
  isMarked: boolean;
  isCollected: boolean;
  errorReasons?: string[];
}

export interface ExerciseCallbacks {
  onSubmit?: (question: Question, result: QuestionResult) => void;
  onAnswerChange?: (question: Question, answer: AnswerData) => void;
  onRedo?: (question: Question) => void;
  onCollect?: (question: Question, isCollected: boolean) => void;
  onMark?: (question: Question, isMarked: boolean) => void;
  onComplete?: (result: QuestionResult) => void;
  onNext?: (current: Question, next?: Question) => void;
  onPrev?: (current: Question, prev?: Question) => void;
  onTimeout?: (question: Question) => void;
}

export type QuestionProgressStatus = 'unanswered' | 'answered' | 'submitted' | 'wrong';

export interface QuestionProgressItem {
  index: number;
  questionId: string;
  status: QuestionProgressStatus;
  isMarked?: boolean;
  isCollected?: boolean;
  score?: number;
}

export interface ExerciseProgress {
  total: number;
  answeredCount: number;
  submittedCount: number;
  correctCount: number;
  wrongCount: number;
  totalScore: number;
  earnedScore: number;
  items: QuestionProgressItem[];
}

export interface ExerciseResult {
  questions: Question[];
  results: QuestionResult[];
  totalScore: number;
  earnedScore: number;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  totalTimeSpent: number;
  wrongQuestions: Question[];
  startTime?: Date;
  endTime?: Date;
}

export interface ExerciseSetCallbacks extends ExerciseCallbacks {
  onExerciseStart?: (questions: Question[]) => void;
  onQuestionChange?: (index: number, question: Question, progress: ExerciseProgress) => void;
  onExerciseSubmit?: (result: ExerciseResult) => void;
  onExerciseComplete?: (result: ExerciseResult) => void;
}

export interface ExerciseState {
  currentQuestion: Question;
  answer: AnswerData | null;
  status: QuestionStatus;
  isSubmitted: boolean;
  isMarked: boolean;
  isCollected: boolean;
  result: QuestionResult | null;
  timeSpent: number;
  draftKey: string;
}
