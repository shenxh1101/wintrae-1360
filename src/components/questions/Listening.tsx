import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { useA11y } from '../../hooks/useA11y';
import type {
  ListeningQuestion as ListeningQuestionType,
  ListeningAnswer,
  MultipleChoiceAnswer,
  FillBlankAnswer,
  ScoreDetail,
  AnswerData,
} from '../../types';
import { MultipleChoice } from './MultipleChoice';
import { FillBlank } from './FillBlank';

export interface ListeningProps {
  question: ListeningQuestionType;
  value?: ListeningAnswer | null;
  onChange?: (answer: ListeningAnswer) => void;
  onAnswerDataChange?: (answer: AnswerData) => void;
  isSubmitted?: boolean;
  scoreResult?: ScoreDetail | null;
  readOnly?: boolean;
  disabled?: boolean;
  showCorrectAnswer?: boolean;
  style?: CSSProperties;
}

interface AudioPlayerProps {
  url: string;
  title?: string;
  canReplay: boolean;
  maxReplays: number;
  replayCount: number;
  onReplay: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

const PlayIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const PauseIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

const ReplayIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const VolumeIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const MuteIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  url,
  title,
  canReplay,
  maxReplays,
  replayCount,
  onReplay,
  disabled = false,
  ariaLabel,
}) => {
  const { theme } = useTheme();
  const { getAriaProps, announce } = useA11y();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  const canReplayNow = canReplay && replayCount < maxReplays;
  const replayRemaining = Math.max(0, maxReplays - replayCount);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setHasPlayedOnce(true);
      announce('音频播放结束');
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);
    const handleError = () => {
      setError('音频加载失败，请检查网络连接');
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('error', handleError);
    };
  }, [url, announce]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || disabled) return;

    if (isPlaying) {
      audio.pause();
      announce('已暂停播放');
    } else {
      if (!hasPlayedOnce || canReplayNow) {
        if (hasPlayedOnce && canReplayNow) {
          onReplay();
        }
        audio.play().catch(err => {
          console.error('Play failed:', err);
          setError('播放失败，请重试');
        });
      } else if (!canReplay && hasPlayedOnce) {
        announce('播放次数已用完');
        return;
      }
    }
  }, [isPlaying, hasPlayedOnce, canReplayNow, canReplay, onReplay, disabled, announce]);

  const seekTo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || disabled) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }, [disabled]);

  const formatTime = (t: number) => {
    if (isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      {...getAriaProps('audio-player', ariaLabel || '音频播放器')}
      style={{
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.lg,
      }}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      {title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.md,
            paddingBottom: theme.spacing.md,
            borderBottom: `1px solid ${theme.colors.border}`,
          }}
        >
          <VolumeIcon size={20} />
          <span
            style={{
              fontSize: theme.fontSize.base,
              fontWeight: theme.fontWeights.medium,
              color: theme.colors.text,
            }}
          >
            {title}
          </span>
        </div>
      )}

      {error && (
        <div
          className="edu-fade-in"
          style={{
            padding: theme.spacing.sm,
            backgroundColor: `${theme.colors.error}10`,
            color: theme.colors.error,
            borderRadius: theme.borderRadius.sm,
            marginBottom: theme.spacing.md,
            fontSize: theme.fontSize.sm,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={togglePlay}
          disabled={disabled || (!hasPlayedOnce ? false : !canReplayNow)}
          aria-label={isPlaying ? '暂停' : '播放'}
          {...getAriaProps(isPlaying ? 'pause-button' : 'play-button')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: theme.borderRadius.full,
            backgroundColor: theme.colors.primary,
            color: '#ffffff',
            border: 'none',
            cursor:
              disabled || (!hasPlayedOnce ? false : !canReplayNow)
                ? 'not-allowed'
                : 'pointer',
            opacity:
              disabled || (!hasPlayedOnce ? false : !canReplayNow) ? 0.6 : 1,
            transition: `all ${theme.transitions.fast}`,
            flexShrink: 0,
          }}
        >
          {isLoading ? (
            <span
              style={{
                width: '20px',
                height: '20px',
                border: '2px solid #ffffff',
                borderTopColor: 'transparent',
                borderRadius: theme.borderRadius.full,
                animation: 'edu-spin 0.8s linear infinite',
              }}
            />
          ) : isPlaying ? (
            <PauseIcon size={20} />
          ) : (
            <PlayIcon size={20} />
          )}
        </button>

        <div
          style={{
            flex: 1,
            minWidth: '150px',
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xs,
          }}
        >
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={seekTo}
            disabled={disabled}
            aria-label="播放进度"
            style={{
              width: '100%',
              height: '6px',
              borderRadius: theme.borderRadius.full,
              appearance: 'none',
              background: `linear-gradient(to right, ${theme.colors.primary} ${progress}%, ${theme.colors.border} ${progress}%)`,
              outline: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: theme.fontSize.xs,
              color: theme.colors.textSecondary,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsMuted(m => !m);
              announce(isMuted ? '取消静音' : '已静音');
            }}
            disabled={disabled}
            aria-label={isMuted ? '取消静音' : '静音'}
            style={{
              background: 'none',
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: theme.colors.textSecondary,
              padding: theme.spacing.xs,
              borderRadius: theme.borderRadius.sm,
              display: 'inline-flex',
              alignItems: 'center',
              transition: `all ${theme.transitions.fast}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.colors.textSecondary;
            }}
          >
            {isMuted || volume === 0 ? <MuteIcon size={18} /> : <VolumeIcon size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              setIsMuted(v === 0);
            }}
            disabled={disabled}
            aria-label="音量"
            style={{
              width: '80px',
              height: '4px',
              borderRadius: theme.borderRadius.full,
              appearance: 'none',
              background: theme.colors.border,
              outline: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: theme.spacing.md,
          paddingTop: theme.spacing.md,
          borderTop: `1px solid ${theme.colors.border}`,
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            fontSize: theme.fontSize.sm,
          }}
        >
          <ReplayIcon size={16} />
          <span style={{ color: theme.colors.textSecondary }}>
            剩余重听次数：
          </span>
          <span
            style={{
              fontWeight: theme.fontWeights.bold,
              color: canReplay ? (replayRemaining > 0 ? theme.colors.success : theme.colors.error) : theme.colors.textSecondary,
            }}
          >
            {canReplay ? `${replayRemaining}/${maxReplays}` : '无限次'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            const audio = audioRef.current;
            if (!audio || disabled || !canReplayNow) return;
            audio.currentTime = 0;
            onReplay();
            audio.play().catch(() => {});
          }}
          disabled={disabled || !canReplayNow}
          aria-label="重新播放"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            backgroundColor: canReplayNow ? theme.colors.background : theme.colors.disabled,
            border: `1px solid ${canReplayNow ? theme.colors.primary : theme.colors.border}`,
            borderRadius: theme.borderRadius.sm,
            color: canReplayNow ? theme.colors.primary : theme.colors.disabledText,
            cursor: disabled || !canReplayNow ? 'not-allowed' : 'pointer',
            fontSize: theme.fontSize.sm,
            transition: `all ${theme.transitions.fast}`,
          }}
        >
          <ReplayIcon size={14} />
          重新播放
        </button>
      </div>
    </div>
  );
};

export const Listening: React.FC<ListeningProps> = ({
  question,
  value,
  onChange,
  onAnswerDataChange,
  isSubmitted = false,
  scoreResult,
  readOnly = false,
  disabled = false,
  showCorrectAnswer = true,
  style,
}) => {
  const { theme } = useTheme();
  const { announce } = useA11y();

  const internalAnswer = useMemo<ListeningAnswer>(() => {
    if (value) return value;
    if (question.questions.type === 'multiple-choice') {
      return { inner: { selected: [] }, replayCount: 0 };
    } else {
      return { inner: { blanks: {} }, replayCount: 0 };
    }
  }, [value, question.questions.type]);

  const [localAnswer, setLocalAnswer] = useState<ListeningAnswer>(internalAnswer);

  useEffect(() => {
    setLocalAnswer(internalAnswer);
  }, [internalAnswer]);

  const handleReplay = useCallback(() => {
    setLocalAnswer(prev => {
      const newAnswer = {
        ...prev,
        replayCount: prev.replayCount + 1,
      };
      onChange?.(newAnswer);
      onAnswerDataChange?.(newAnswer);
      announce(`已重听第 ${newAnswer.replayCount} 次`);
      return newAnswer;
    });
  }, [onChange, onAnswerDataChange, announce]);

  const handleInnerChange = useCallback((innerAnswer: MultipleChoiceAnswer | FillBlankAnswer) => {
    setLocalAnswer(prev => {
      const newAnswer = {
        ...prev,
        inner: innerAnswer,
      };
      onChange?.(newAnswer);
      onAnswerDataChange?.(newAnswer);
      return newAnswer;
    });
  }, [onChange, onAnswerDataChange]);

  const handleInnerAnswerDataChange = useCallback((data: AnswerData) => {
    setLocalAnswer(prev => {
      const newAnswer = {
        ...prev,
        inner: data as MultipleChoiceAnswer | FillBlankAnswer,
      };
      onAnswerDataChange?.(newAnswer);
      return newAnswer;
    });
  }, [onAnswerDataChange]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
      className="edu-fade-in"
    >
      <AudioPlayer
        url={question.audioUrl}
        title={question.audioTitle || '听力音频'}
        canReplay={question.canReplay ?? true}
        maxReplays={question.maxReplays ?? 5}
        replayCount={localAnswer.replayCount}
        onReplay={handleReplay}
        disabled={readOnly || disabled}
      />

      <div
        style={{
          padding: theme.spacing.lg,
          backgroundColor: `${theme.colors.primary}05`,
          borderLeft: `4px solid ${theme.colors.primary}`,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.lg,
          fontSize: theme.fontSize.sm,
          color: theme.colors.textSecondary,
        }}
      >
        🎧 请仔细听音频后完成下面的题目
      </div>

      {question.questions.type === 'multiple-choice' ? (
        <MultipleChoice
          question={question.questions}
          value={localAnswer.inner as MultipleChoiceAnswer}
          onChange={(ans) => handleInnerChange(ans)}
          onAnswerDataChange={handleInnerAnswerDataChange}
          isSubmitted={isSubmitted}
          scoreResult={scoreResult}
          readOnly={readOnly}
          disabled={disabled}
          showCorrectAnswer={showCorrectAnswer}
        />
      ) : (
        <FillBlank
          question={question.questions}
          value={localAnswer.inner as FillBlankAnswer}
          onChange={(ans) => handleInnerChange(ans)}
          onAnswerDataChange={handleInnerAnswerDataChange}
          isSubmitted={isSubmitted}
          scoreResult={scoreResult}
          readOnly={readOnly}
          disabled={disabled}
          showCorrectAnswer={showCorrectAnswer}
        />
      )}
    </div>
  );
};

Listening.displayName = 'Listening';
