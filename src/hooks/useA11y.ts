import { useCallback, useRef, useEffect } from 'react';

export type A11yRole = 'status' | 'alert' | 'log' | 'progressbar' | 'marquee' | 'timer';

export interface AnnounceOptions {
  role?: A11yRole;
  politeness?: 'polite' | 'assertive' | 'off';
  delay?: number;
}

export interface UseA11yReturn {
  announce: (message: string, options?: AnnounceOptions) => void;
  announceError: (message: string) => void;
  announceSuccess: (message: string) => void;
  announceInfo: (message: string) => void;
  announceStatus: (message: string) => void;
  getLiveRegion: () => React.ReactElement | null;
  focusElement: (ref: React.RefObject<HTMLElement> | null) => void;
  getAriaProps: (type: string, label?: string) => Record<string, unknown>;
}

const LIVE_REGION_ID = 'edu-a11y-live-region';

function ensureLiveRegion(): HTMLDivElement {
  let region = document.getElementById(LIVE_REGION_ID) as HTMLDivElement | null;
  if (!region) {
    region = document.createElement('div');
    region.id = LIVE_REGION_ID;
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.style.position = 'absolute';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.padding = '0';
    region.style.margin = '-1px';
    region.style.overflow = 'hidden';
    region.style.clip = 'rect(0, 0, 0, 0)';
    region.style.whiteSpace = 'nowrap';
    region.style.border = '0';
    document.body.appendChild(region);
  }
  return region;
}

function createTemporaryRegion(options: AnnounceOptions): HTMLDivElement {
  const region = document.createElement('div');
  region.setAttribute('role', options.role || 'status');
  region.setAttribute('aria-live', options.politeness || 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.style.position = 'absolute';
  region.style.width = '1px';
  region.style.height = '1px';
  region.style.padding = '0';
  region.style.margin = '-1px';
  region.style.overflow = 'hidden';
  region.style.clip = 'rect(0, 0, 0, 0)';
  region.style.whiteSpace = 'nowrap';
  region.style.border = '0';
  document.body.appendChild(region);
  return region;
}

export function useA11y(): UseA11yReturn {
  const cleanupRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    return () => {
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];
    };
  }, []);

  const announce = useCallback((message: string, options: AnnounceOptions = {}) => {
    const { delay = 0 } = options;

    const doAnnounce = () => {
      const region = createTemporaryRegion(options);
      
      setTimeout(() => {
        region.textContent = message;
      }, 50);

      const cleanup = () => {
        setTimeout(() => {
          region.remove();
        }, 1000);
      };
      cleanupRef.current.push(cleanup);
      cleanup();
    };

    if (delay > 0) {
      setTimeout(doAnnounce, delay);
    } else {
      doAnnounce();
    }
  }, []);

  const announceError = useCallback((message: string) => {
    announce(`错误: ${message}`, { role: 'alert', politeness: 'assertive' });
  }, [announce]);

  const announceSuccess = useCallback((message: string) => {
    announce(`正确: ${message}`, { role: 'status', politeness: 'polite' });
  }, [announce]);

  const announceInfo = useCallback((message: string) => {
    announce(message, { role: 'status', politeness: 'polite' });
  }, [announce]);

  const announceStatus = useCallback((message: string) => {
    const region = ensureLiveRegion();
    region.textContent = message;
  }, []);

  const getLiveRegion = useCallback((): React.ReactElement | null => {
    return null;
  }, []);

  const focusElement = useCallback((ref: React.RefObject<HTMLElement> | null) => {
    if (ref?.current) {
      requestAnimationFrame(() => {
        ref.current?.focus();
      });
    }
  }, []);

  const getAriaProps = useCallback((type: string, label?: string): Record<string, unknown> => {
    const props: Record<string, unknown> = {};

    switch (type) {
      case 'submit-button':
        props['role'] = 'button';
        props['aria-label'] = label || '提交答案';
        props['tabIndex'] = 0;
        break;
      case 'option':
        props['role'] = 'option';
        props['aria-label'] = label;
        props['tabIndex'] = 0;
        break;
      case 'selected-option':
        props['role'] = 'option';
        props['aria-selected'] = true;
        props['aria-label'] = `已选择: ${label}`;
        break;
      case 'correct-option':
        props['role'] = 'option';
        props['aria-label'] = `正确答案: ${label}`;
        props['aria-live'] = 'polite';
        break;
      case 'wrong-option':
        props['role'] = 'option';
        props['aria-invalid'] = true;
        props['aria-label'] = `错误选项: ${label}`;
        break;
      case 'blank-input':
        props['role'] = 'textbox';
        props['aria-label'] = label || '填空题输入框';
        props['aria-required'] = true;
        break;
      case 'sortable-item':
        props['role'] = 'listitem';
        props['aria-grabbed'] = false;
        props['aria-label'] = `可排序项: ${label}`;
        break;
      case 'dragging-item':
        props['aria-grabbed'] = true;
        props['aria-label'] = `正在拖拽: ${label}`;
        break;
      case 'matching-item':
        props['role'] = 'button';
        props['aria-label'] = `可配对项: ${label}`;
        props['tabIndex'] = 0;
        break;
      case 'connected-item':
        props['role'] = 'button';
        props['aria-pressed'] = true;
        props['aria-label'] = `已连接: ${label}`;
        break;
      case 'timer':
        props['role'] = 'timer';
        props['aria-live'] = 'off';
        props['aria-atomic'] = true;
        break;
      case 'progress':
        props['role'] = 'progressbar';
        props['aria-label'] = label || '进度';
        break;
      case 'mark-button':
        props['role'] = 'button';
        props['aria-label'] = label || '标记题目';
        props['aria-pressed'] = false;
        break;
      case 'marked-button':
        props['role'] = 'button';
        props['aria-pressed'] = true;
        props['aria-label'] = '已标记，点击取消标记';
        break;
      case 'collect-button':
        props['role'] = 'button';
        props['aria-label'] = label || '收藏题目';
        props['aria-pressed'] = false;
        break;
      case 'collected-button':
        props['role'] = 'button';
        props['aria-pressed'] = true;
        props['aria-label'] = '已收藏，点击取消收藏';
        break;
      case 'audio-player':
        props['role'] = 'application';
        props['aria-label'] = label || '音频播放器';
        break;
      case 'play-button':
        props['role'] = 'button';
        props['aria-label'] = '播放音频';
        break;
      case 'pause-button':
        props['role'] = 'button';
        props['aria-label'] = '暂停播放';
        break;
      case 'analysis-panel':
        props['role'] = 'region';
        props['aria-label'] = '答案解析';
        props['aria-live'] = 'polite';
        break;
      default:
        if (label) props['aria-label'] = label;
    }

    return props;
  }, []);

  return {
    announce,
    announceError,
    announceSuccess,
    announceInfo,
    announceStatus,
    getLiveRegion,
    focusElement,
    getAriaProps,
  };
}
