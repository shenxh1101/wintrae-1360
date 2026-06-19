import { useEffect, useCallback, useRef } from 'react';

export interface KeyHandler {
  key: string | string[];
  handler: (event: KeyboardEvent) => void;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  priority?: number;
}

export interface UseKeyboardOptions {
  enabled?: boolean;
  target?: HTMLElement | null | (() => HTMLElement | null);
  global?: boolean;
}

function matchesKey(event: KeyboardEvent, spec: KeyHandler): boolean {
  const keys = Array.isArray(spec.key) ? spec.key : [spec.key];
  const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  
  const keyMatches = keys.some(k => {
    const specKey = k.length === 1 ? k.toLowerCase() : k;
    return eventKey === specKey || event.code === specKey;
  });
  
  if (!keyMatches) return false;
  
  if (spec.ctrl !== undefined && event.ctrlKey !== spec.ctrl) return false;
  if (spec.shift !== undefined && event.shiftKey !== spec.shift) return false;
  if (spec.alt !== undefined && event.altKey !== spec.alt) return false;
  if (spec.meta !== undefined && event.metaKey !== spec.meta) return false;
  
  return true;
}

export function useKeyboard(handlers: KeyHandler[], options: UseKeyboardOptions = {}) {
  const { enabled = true, target, global = false } = options;
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const handleKeyDown = useCallback((event: Event) => {
    const keyboardEvent = event as KeyboardEvent;
    const sortedHandlers = [...handlersRef.current].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    for (const handlerSpec of sortedHandlers) {
      if (matchesKey(keyboardEvent, handlerSpec)) {
        if (handlerSpec.preventDefault !== false) {
          keyboardEvent.preventDefault();
        }
        if (handlerSpec.stopPropagation) {
          keyboardEvent.stopPropagation();
        }
        handlerSpec.handler(keyboardEvent);
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let element: EventTarget;
    if (global) {
      element = window;
    } else if (target) {
      element = typeof target === 'function' ? target() || document : target;
    } else {
      element = document;
    }

    element.addEventListener('keydown', handleKeyDown as EventListener);
    return () => {
      element.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [enabled, target, global, handleKeyDown]);
}

export interface NavigationHandlers {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: (backward: boolean) => void;
  onSpace?: () => void;
  onSubmit?: () => void;
  onRedo?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onNumberSelect?: (index: number) => void;
}

export function useExerciseKeyboard(
  handlers: NavigationHandlers,
  options: UseKeyboardOptions = {}
) {
  const keyHandlers: KeyHandler[] = [];

  if (handlers.onEnter) {
    keyHandlers.push({ key: 'Enter', handler: handlers.onEnter });
  }

  if (handlers.onEscape) {
    keyHandlers.push({ key: 'Escape', handler: handlers.onEscape });
  }

  if (handlers.onArrowUp) {
    keyHandlers.push({ key: 'ArrowUp', handler: handlers.onArrowUp });
  }

  if (handlers.onArrowDown) {
    keyHandlers.push({ key: 'ArrowDown', handler: handlers.onArrowDown });
  }

  if (handlers.onArrowLeft) {
    keyHandlers.push({ key: 'ArrowLeft', handler: handlers.onArrowLeft });
  }

  if (handlers.onArrowRight) {
    keyHandlers.push({ key: 'ArrowRight', handler: handlers.onArrowRight });
  }

  if (handlers.onTab) {
    keyHandlers.push({
      key: 'Tab',
      handler: (e) => handlers.onTab!(e.shiftKey),
      preventDefault: false,
    });
  }

  if (handlers.onSpace) {
    keyHandlers.push({ key: ' ', handler: handlers.onSpace });
  }

  if (handlers.onSubmit) {
    keyHandlers.push({ key: 'Enter', ctrl: true, handler: handlers.onSubmit });
  }

  if (handlers.onRedo) {
    keyHandlers.push({ key: 'r', ctrl: true, handler: handlers.onRedo });
  }

  if (handlers.onNext) {
    keyHandlers.push({ key: 'ArrowRight', alt: true, handler: handlers.onNext });
  }

  if (handlers.onPrev) {
    keyHandlers.push({ key: 'ArrowLeft', alt: true, handler: handlers.onPrev });
  }

  if (handlers.onNumberSelect) {
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    keyHandlers.push({
      key: numbers,
      handler: (e) => {
        const index = numbers.indexOf(e.key);
        if (index !== -1) handlers.onNumberSelect!(index);
      },
    });
  }

  useKeyboard(keyHandlers, options);
}
