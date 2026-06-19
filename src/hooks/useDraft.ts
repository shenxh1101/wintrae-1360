import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnswerData, Question, QuestionType } from '../types';

export interface UseDraftOptions {
  questionId: string;
  questionType?: QuestionType;
  initialValue?: AnswerData | null;
  storageKey?: string;
  debounceMs?: number;
  autoSave?: boolean;
}

export interface UseDraftReturn {
  draft: AnswerData | null;
  setDraft: (data: AnswerData | null) => void;
  saveDraft: () => void;
  clearDraft: () => void;
  hasDraft: boolean;
  lastSaved: Date | null;
  isSaving: boolean;
}

const STORAGE_PREFIX = 'edu-exercise-draft-';
const DEFAULT_DEBOUNCE = 300;

interface DraftPayload {
  data: AnswerData;
  questionType?: QuestionType;
  timestamp: string;
  version: number;
}

function getStorageKey(questionId: string, customKey?: string): string {
  return customKey || `${STORAGE_PREFIX}${questionId}`;
}

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function readDraftRaw(
  key: string,
  expectedType?: QuestionType
): { data: AnswerData | null; lastSaved: Date | null; valid: boolean } {
  if (!isLocalStorageAvailable()) {
    return { data: null, lastSaved: null, valid: false };
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { data: null, lastSaved: null, valid: false };

    const parsed = JSON.parse(raw) as DraftPayload;

    if (expectedType && parsed.questionType && parsed.questionType !== expectedType) {
      console.warn(
        `[useDraft] 题型不匹配，丢弃草稿。期望 ${expectedType}，实际 ${parsed.questionType}`
      );
      localStorage.removeItem(key);
      return { data: null, lastSaved: null, valid: false };
    }

    return {
      data: parsed.data,
      lastSaved: parsed.timestamp ? new Date(parsed.timestamp) : null,
      valid: true,
    };
  } catch {
    return { data: null, lastSaved: null, valid: false };
  }
}

export function readDraft(
  questionId: string,
  expectedType?: QuestionType
): AnswerData | null {
  if (!isLocalStorageAvailable()) return null;
  const key = `${STORAGE_PREFIX}${questionId}`;
  return readDraftRaw(key, expectedType).data;
}

function writeDraft(
  key: string,
  data: AnswerData | null,
  questionType?: QuestionType
): void {
  if (!isLocalStorageAvailable()) return;

  try {
    if (data === null) {
      localStorage.removeItem(key);
    } else {
      const payload: DraftPayload = {
        data,
        questionType,
        timestamp: new Date().toISOString(),
        version: 2,
      };
      localStorage.setItem(key, JSON.stringify(payload));
    }
  } catch {
    console.warn('Failed to save draft to localStorage');
  }
}

export function clearDraftByQuestionId(questionId: string): void {
  if (!isLocalStorageAvailable()) return;
  const key = `${STORAGE_PREFIX}${questionId}`;
  localStorage.removeItem(key);
}

export function useDraft(options: UseDraftOptions): UseDraftReturn {
  const {
    questionId,
    questionType,
    initialValue = null,
    storageKey,
    debounceMs = DEFAULT_DEBOUNCE,
    autoSave = true,
  } = options;

  const key = getStorageKey(questionId, storageKey);
  const storageAvailable = useRef(isLocalStorageAvailable());
  const lastQuestionIdRef = useRef<string>(questionId);

  const initialDraft = (() => {
    if (initialValue !== null) return initialValue;
    if (storageAvailable.current) {
      return readDraftRaw(key, questionType).data;
    }
    return null;
  })();

  const [draft, setDraftState] = useState<AnswerData | null>(initialDraft);

  const initialLastSaved = storageAvailable.current
    ? readDraftRaw(key, questionType).lastSaved
    : null;

  const [lastSaved, setLastSaved] = useState<Date | null>(initialLastSaved);

  const [isSaving, setIsSaving] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (questionId !== lastQuestionIdRef.current) {
    lastQuestionIdRef.current = questionId;
    const freshInitial: AnswerData | null = (() => {
      if (initialValue !== null) return initialValue;
      if (storageAvailable.current) {
        return readDraftRaw(key, questionType).data;
      }
      return null;
    })();
    if (draft !== freshInitial) {
      setDraftState(freshInitial);
    }
    const freshLastSaved = storageAvailable.current
      ? readDraftRaw(key, questionType).lastSaved
      : null;
    if (lastSaved?.getTime() !== freshLastSaved?.getTime()) {
      setLastSaved(freshLastSaved);
    }
  }

  const saveDraft = useCallback(() => {
    if (!storageAvailable.current) return;
    setIsSaving(true);
    try {
      writeDraft(key, draft, questionType);
      setLastSaved(new Date());
    } finally {
      setTimeout(() => setIsSaving(false), 100);
    }
  }, [key, draft, questionType]);

  const setDraft = useCallback((data: AnswerData | null) => {
    setDraftState(data);
  }, []);

  const clearDraft = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setDraftState(null);
    if (storageAvailable.current) {
      writeDraft(key, null);
    }
    setLastSaved(null);
  }, [key]);

  useEffect(() => {
    if (!autoSave || draft === null || !storageAvailable.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setIsSaving(true);
      writeDraft(key, draft, questionType);
      setLastSaved(new Date());
      setTimeout(() => setIsSaving(false), 100);
      debounceTimerRef.current = null;
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [draft, key, debounceMs, autoSave, questionType]);

  useEffect(() => {
    if (!storageAvailable.current) return;
    const stored = readDraftRaw(key, questionType);
    if (stored.data !== null && initialValue === null) {
      setDraftState(stored.data);
      setLastSaved(stored.lastSaved);
    }
  }, [questionId, key, questionType, initialValue]);

  const hasDraft = draft !== null;

  return {
    draft,
    setDraft,
    saveDraft,
    clearDraft,
    hasDraft,
    lastSaved,
    isSaving,
  };
}

export function createAnswerDraft(question: Question): AnswerData {
  switch (question.type) {
    case 'multiple-choice':
      return { selected: [] };
    case 'fill-blank':
      return { blanks: {} };
    case 'matching':
      return { matches: {} };
    case 'sorting':
      return { order: question.items.map(item => item.id) };
    case 'listening':
      if (question.questions.type === 'multiple-choice') {
        return { inner: { selected: [] }, replayCount: 0 };
      } else {
        return { inner: { blanks: {} }, replayCount: 0 };
      }
    default:
      return { selected: [] } as AnswerData;
  }
}
