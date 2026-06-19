import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnswerData, Question } from '../types';

export interface UseDraftOptions {
  questionId: string;
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

function readDraft(key: string): { data: AnswerData | null; lastSaved: Date | null } {
  if (!isLocalStorageAvailable()) {
    return { data: null, lastSaved: null };
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { data: null, lastSaved: null };

    const parsed = JSON.parse(raw);
    return {
      data: parsed.data as AnswerData,
      lastSaved: parsed.timestamp ? new Date(parsed.timestamp) : null,
    };
  } catch {
    return { data: null, lastSaved: null };
  }
}

function writeDraft(key: string, data: AnswerData | null): void {
  if (!isLocalStorageAvailable()) return;

  try {
    if (data === null) {
      localStorage.removeItem(key);
    } else {
      const payload = {
        data,
        timestamp: new Date().toISOString(),
        version: 1,
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
    initialValue = null,
    storageKey,
    debounceMs = DEFAULT_DEBOUNCE,
    autoSave = true,
  } = options;

  const key = getStorageKey(questionId, storageKey);
  const storageAvailable = useRef(isLocalStorageAvailable());

  const [draft, setDraftState] = useState<AnswerData | null>(() => {
    if (initialValue !== null) return initialValue;
    if (storageAvailable.current) {
      return readDraft(key).data;
    }
    return null;
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(() => {
    if (storageAvailable.current) {
      return readDraft(key).lastSaved;
    }
    return null;
  });

  const [isSaving, setIsSaving] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback(() => {
    if (!storageAvailable.current) return;
    setIsSaving(true);
    try {
      writeDraft(key, draft);
      setLastSaved(new Date());
    } finally {
      setTimeout(() => setIsSaving(false), 100);
    }
  }, [key, draft]);

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
      writeDraft(key, draft);
      setLastSaved(new Date());
      setTimeout(() => setIsSaving(false), 100);
      debounceTimerRef.current = null;
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [draft, key, debounceMs, autoSave]);

  useEffect(() => {
    if (!storageAvailable.current) return;
    const stored = readDraft(key);
    if (stored.data !== null && initialValue === null) {
      setDraftState(stored.data);
      setLastSaved(stored.lastSaved);
    }
  }, [questionId, key, initialValue]);

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
