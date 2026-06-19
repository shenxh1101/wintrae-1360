import './styles/global.css';

export type {
  QuestionType,
  QuestionStatus,
  ScoringMode,
  ThemeColors,
  ThemeConfig,
  ChoiceOption,
  MultipleChoiceQuestion,
  FillBlankItem,
  FillBlankQuestion,
  MatchingPair,
  MatchingQuestion,
  SortingItem,
  SortingQuestion,
  ListeningQuestion,
  Question,
  MultipleChoiceAnswer,
  FillBlankAnswer,
  MatchingAnswer,
  SortingAnswer,
  ListeningAnswer,
  AnswerData,
  ScoreDetail,
  QuestionResult,
  ExerciseCallbacks,
  ExerciseSetCallbacks,
  ExerciseState,
  QuestionProgressStatus,
  QuestionProgressItem,
  ExerciseProgress,
  ExerciseResult,
  CorrectionResult,
  CorrectionExerciseResult,
  ReviewFilters,
} from './types';

export {
  ThemeProvider,
  useTheme,
} from './theme/ThemeProvider';

export {
  defaultTheme,
  darkTheme,
  createTheme,
} from './theme/defaultTheme';

export { useTimer } from './hooks/useTimer';
export type { UseTimerOptions, UseTimerReturn } from './hooks/useTimer';

export { useKeyboard, useExerciseKeyboard } from './hooks/useKeyboard';
export type { KeyHandler, UseKeyboardOptions, NavigationHandlers } from './hooks/useKeyboard';

export { useA11y } from './hooks/useA11y';
export type { A11yRole, AnnounceOptions, UseA11yReturn } from './hooks/useA11y';

export { useDraft, createAnswerDraft, clearDraftByQuestionId } from './hooks/useDraft';
export type { UseDraftOptions, UseDraftReturn } from './hooks/useDraft';

export {
  evaluateMultipleChoice,
  evaluateFillBlank,
  evaluateMatching,
  evaluateSorting,
  evaluateListening,
  evaluateQuestion,
  generateErrorReasons,
  createQuestionResult,
  isAnswerComplete,
} from './utils/scoring';

export { Button } from './components/common/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/common/Button';

export { Timer } from './components/common/Timer';
export type { TimerProps } from './components/common/Timer';

export {
  CollectButton,
  MarkButton,
  SubmitButtonIcon,
  RedoButton,
  NavButton,
} from './components/common/ActionButtons';
export type { IconButtonProps, NavButtonProps } from './components/common/ActionButtons';

export { QuestionHeader } from './components/common/QuestionHeader';

export { MultipleChoice } from './components/questions/MultipleChoice';
export type { MultipleChoiceProps } from './components/questions/MultipleChoice';

export { FillBlank } from './components/questions/FillBlank';
export type { FillBlankProps } from './components/questions/FillBlank';

export { Matching } from './components/questions/Matching';
export type { MatchingProps } from './components/questions/Matching';

export { Sorting } from './components/questions/Sorting';
export type { SortingProps } from './components/questions/Sorting';

export { Listening } from './components/questions/Listening';
export type { ListeningProps } from './components/questions/Listening';

export { AnalysisPanel } from './components/AnalysisPanel';
export type { AnalysisPanelProps } from './components/AnalysisPanel';

export { ProgressPanel } from './components/ProgressPanel';
export type { ProgressPanelProps } from './components/ProgressPanel';

export { ReviewPanel } from './components/ReviewPanel';
export type { ReviewPanelProps } from './components/ReviewPanel';

export { ExerciseContainer } from './components/ExerciseContainer';
export type { ExerciseContainerProps } from './components/ExerciseContainer';
