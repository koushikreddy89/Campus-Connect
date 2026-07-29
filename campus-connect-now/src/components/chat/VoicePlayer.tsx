import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Lock } from 'lucide-react';

interface VoicePlayerProps {
  audioUrl: string;
  duration?: number; // Optional duration in seconds
  isOwn?: boolean;
  isViewOnce?: boolean;
  onPlayEnd?: () => void;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ audioUrl, duration: initialDuration, isOwn = false, isViewOnce = false, onPlayEnd }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerId = useRef(Math.random().toString(36).substr(2, 9));
  const onPlayEndRef = useRef(onPlayEnd);

  useEffect(() => {
    onPlayEndRef.current = onPlayEnd;
  }, [onPlayEnd]);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (!initialDuration) {
        setDuration(audio.duration || 0);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPlayEndRef.current?.();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    // Stop playback if another player starts playing
    const handleGlobalPlay = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.playerId !== playerId.current) {
        audio.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener('voice-player:play', handleGlobalPlay);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      window.removeEventListener('voice-player:play', handleGlobalPlay);
      audioRef.current = null;
    };
  }, [audioUrl, initialDuration]);

  // Adjust playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Dispatch global play event so other players stop
      window.dispatchEvent(
        new CustomEvent('voice-player:play', {
          detail: { playerId: playerId.current }
        })
      );
      audioRef.current.play().catch(err => {
        console.error('Audio play failed:', err);
      });
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const cycleSpeed = () => {
    if (speed === 1) setSpeed(1.5);
    else if (speed === 1.5) setSpeed(2);
    else setSpeed(1);
  };

  return (
    <div className={`flex items-center gap-3 py-1 px-1.5 w-full max-w-[280px] text-zinc-100`}>
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
          isOwn 
            ? 'bg-white/20 hover:bg-white/30 text-white' 
            : 'bg-violet-600 hover:bg-violet-700 text-white'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current text-white" />
        ) : (
          <Play className="w-4 h-4 fill-current text-white ml-0.5" />
        )}
      </button>

      {/* Progress & Duration */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className={`w-full h-1 rounded-lg appearance-none cursor-pointer outline-none bg-white/20 accent-[#8B5CF6]`}
          style={{
            background: `linear-gradient(to right, ${isOwn ? '#ffffff80' : '#8B5CF6'} 0%, ${isOwn ? '#ffffff80' : '#8B5CF6'} ${
              duration ? (currentTime / duration) * 100 : 0
            }%, #ffffff15 ${duration ? (currentTime / duration) * 100 : 0}%, #ffffff15 100%)`,
          }}
        />
        <div className="flex justify-between items-center text-[9px] text-zinc-400 select-none">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Speed Selector */}
      <button
        onClick={cycleSpeed}
        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full select-none transition-colors border ${
          isOwn 
            ? 'border-white/20 hover:bg-white/10 text-white' 
            : 'border-white/10 hover:bg-white/5 text-zinc-350'
        }`}
      >
        {speed}x
      </button>

      {/* View Once Badge */}
      {isViewOnce && (
        <span className="text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-450 font-bold px-1.5 py-0.5 rounded-full select-none flex items-center gap-0.5 shrink-0" title="Play Once Voice Message">
          <Lock className="w-2.5 h-2.5" /> 1x
        </span>
      )}
    </div>
  );
};
