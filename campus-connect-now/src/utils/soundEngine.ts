import { useSettingsStore } from '@/store/settingsStore';

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Ensure audio context is resumed on user interactions to bypass autoplay policy
if (typeof window !== 'undefined') {
  const resumeAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', resumeAudio, { once: false, capture: true });
  window.addEventListener('touchstart', resumeAudio, { once: false, capture: true });
}

export type SoundEffectType =
  | 'incoming_message'
  | 'outgoing_message'
  | 'read_receipt'
  | 'new_match'
  | 'friend_request'
  | 'voice_received'
  | 'voice_sent'
  | 'ringtone'
  | 'call_connected'
  | 'call_ended'
  | 'error'
  | 'cinematic_pad'
  | 'cinematic_particle'
  | 'cinematic_connect'
  | 'cinematic_sweep'
  | 'cinematic_sparkle';

export const playSoundEffect = (type: SoundEffectType, overrideSoundPack?: string) => {
  const store = useSettingsStore.getState();
  const settings = store.settings;

  // Respect Sound Effects master setting
  if (!settings.soundEffects) return;

  const soundPack = overrideSoundPack || settings.notificationSound || 'Default';
  if (soundPack === 'Silent') return;

  const ctx = getAudioContext();
  if (!ctx) return;

  // Determine volume scaling factor based on the action type
  let categoryVolumeScale = 1.0;
  if (type === 'outgoing_message') categoryVolumeScale = 0.55;
  else if (type === 'read_receipt') categoryVolumeScale = 0.35;
  else if (type === 'voice_sent') categoryVolumeScale = 0.55;
  else if (type === 'error') categoryVolumeScale = 0.40;
  else if (type === 'cinematic_pad') categoryVolumeScale = 0.50;
  else if (type === 'cinematic_particle') categoryVolumeScale = 0.65;
  else if (type === 'cinematic_connect') categoryVolumeScale = 0.85;
  else if (type === 'cinematic_sweep') categoryVolumeScale = 0.45;
  else if (type === 'cinematic_sparkle') categoryVolumeScale = 0.60;

  // Get master user volume setting (0 to 100)
  let userVolume = 80;
  try {
    const prefStore = (window as any).__preferencesStore || require('@/store/preferencesStore')?.usePreferencesStore?.getState?.();
    if (prefStore && prefStore.preferences && prefStore.preferences.notificationVolume !== undefined) {
      userVolume = prefStore.preferences.notificationVolume;
    }
  } catch (e) {
    // Fallback to default
  }

  const finalVolume = (userVolume / 100) * categoryVolumeScale;
  if (finalVolume <= 0) return;

  try {
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(finalVolume, ctx.currentTime);
    gainNode.connect(ctx.destination);

    // Dynamic Tone Generator with Custom Envelopes
    const playTone = (
      freqs: number[],
      duration: number,
      oscType: OscillatorType = 'sine',
      staggerMs = 0,
      customEnvelope?: (gainParam: AudioParam, startTime: number) => void
    ) => {
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = oscType;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * (staggerMs / 1000));

        osc.connect(oscGain);
        oscGain.connect(gainNode);

        const startTime = ctx.currentTime + idx * (staggerMs / 1000);
        const stopTime = startTime + duration;

        if (customEnvelope) {
          customEnvelope(oscGain.gain, startTime);
        } else {
          // Default smooth exponential decay envelope
          oscGain.gain.setValueAtTime(1.0, startTime);
          oscGain.gain.exponentialRampToValueAtTime(0.001, stopTime);
        }

        osc.start(startTime);
        osc.stop(stopTime);
      });
    };

    switch (type) {
      case 'cinematic_pad': {
        // Soft cinematic ambient pad: detuned warm waves, slow attack, slow decay
        playTone([110, 165, 220], 3.5, 'triangle', 0, (g, t) => {
          g.setValueAtTime(0.001, t);
          g.linearRampToValueAtTime(0.5, t + 1.2);
          g.linearRampToValueAtTime(0.3, t + 2.5);
          g.exponentialRampToValueAtTime(0.001, t + 3.5);
        });
        break;
      }
      case 'cinematic_particle': {
        // Crystal glass chimes for energy particles
        playTone([880, 1046.5, 1318.51], 0.6, 'sine', 60, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.6, t + 0.05);
          g.exponentialRampToValueAtTime(0.001, t + 0.6);
        });
        break;
      }
      case 'cinematic_connect': {
        // Warm magnetic connection: low drop with high sparkle
        playTone([80, 120, 240], 0.8, 'sine', 0, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(1.0, t + 0.04);
          g.exponentialRampToValueAtTime(0.001, t + 0.8);
        });
        // Shimmer accent
        playTone([1567.98, 2093.00], 0.5, 'sine', 40, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.3, t + 0.02);
          g.exponentialRampToValueAtTime(0.001, t + 0.5);
        });
        break;
      }
      case 'cinematic_sweep': {
        // Soft metallic shimmer sweep
        playTone([3135.96, 4186.01], 0.7, 'sine', 100, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.4, t + 0.15);
          g.exponentialRampToValueAtTime(0.001, t + 0.7);
        });
        break;
      }
      case 'cinematic_sparkle': {
        // High quality typography sparkle chime
        playTone([523.25, 659.25, 783.99, 1046.50, 1318.51], 0.7, 'sine', 40, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.8, t + 0.02);
          g.exponentialRampToValueAtTime(0.001, t + 0.7);
        });
        break;
      }
      case 'incoming_message': {
        if (soundPack === 'Aurora') {
          playTone([880, 1318.5], 0.35, 'sine', 80, (g, t) => {
            g.setValueAtTime(0.01, t);
            g.linearRampToValueAtTime(1.0, t + 0.01);
            g.exponentialRampToValueAtTime(0.001, t + 0.35);
          });
          playTone([2637], 0.25, 'sine', 0, (g, t) => {
            g.setValueAtTime(0.01, t);
            g.linearRampToValueAtTime(0.15, t + 0.01);
            g.exponentialRampToValueAtTime(0.001, t + 0.25);
          });
        } else if (soundPack === 'Pulse') {
          playTone([587.33, 880], 0.18, 'triangle', 40, (g, t) => {
            g.setValueAtTime(0.01, t);
            g.linearRampToValueAtTime(0.8, t + 0.005);
            g.exponentialRampToValueAtTime(0.001, t + 0.18);
          });
        } else if (soundPack === 'Zen') {
          playTone([523.25], 0.3, 'sine', 0, (g, t) => {
            g.setValueAtTime(0.01, t);
            g.linearRampToValueAtTime(0.5, t + 0.05);
            g.exponentialRampToValueAtTime(0.001, t + 0.3);
          });
        } else if (soundPack === 'Echo') {
          playTone([220, 440], 0.4, 'sine', 0, (g, t) => {
            g.setValueAtTime(0.01, t);
            g.linearRampToValueAtTime(0.7, t + 0.02);
            g.exponentialRampToValueAtTime(0.001, t + 0.4);
          });
        } else if (soundPack === 'Campus') {
          playTone([659.25, 880, 987.77, 1318.51], 0.25, 'sine', 50, (g, t) => {
            g.setValueAtTime(0.01, t);
            g.linearRampToValueAtTime(0.9, t + 0.01);
            g.exponentialRampToValueAtTime(0.001, t + 0.25);
          });
        } else if (soundPack === 'Minimal') {
          playTone([1000], 0.06, 'sine', 0, (g, t) => {
            g.setValueAtTime(0.01, t);
            g.linearRampToValueAtTime(0.6, t + 0.002);
            g.exponentialRampToValueAtTime(0.001, t + 0.06);
          });
        } else {
          playTone([523.25, 783.99], 0.22, 'sine', 60, (g, t) => {
            g.setValueAtTime(0.01, t);
            g.linearRampToValueAtTime(0.8, t + 0.008);
            g.exponentialRampToValueAtTime(0.001, t + 0.22);
          });
        }
        break;
      }
      case 'outgoing_message': {
        playTone([329.63], 0.08, 'sine', 0, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.5, t + 0.005);
          g.exponentialRampToValueAtTime(0.001, t + 0.08);
        });
        break;
      }
      case 'read_receipt': {
        playTone([2500, 3750], 0.05, 'sine', 15, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.3, t + 0.002);
          g.exponentialRampToValueAtTime(0.001, t + 0.05);
        });
        break;
      }
      case 'new_match': {
        playTone([440, 554.37, 659.25, 830.61, 1108.73], 0.5, 'sine', 35, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.8, t + 0.015);
          g.exponentialRampToValueAtTime(0.001, t + 0.5);
        });
        break;
      }
      case 'friend_request': {
        playTone([587.33, 700], 0.45, 'sine', 0, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.7, t + 0.03);
          g.exponentialRampToValueAtTime(0.001, t + 0.45);
        });
        break;
      }
      case 'voice_received': {
        playTone([300, 450], 0.12, 'triangle', 25, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.8, t + 0.01);
          g.exponentialRampToValueAtTime(0.001, t + 0.12);
        });
        break;
      }
      case 'voice_sent': {
        playTone([800], 0.03, 'sine', 0, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.4, t + 0.001);
          g.exponentialRampToValueAtTime(0.001, t + 0.03);
        });
        break;
      }
      case 'ringtone': {
        const notes = [659.25, 830.61, 987.77, 1318.51, 987.77, 830.61];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.18);
          osc.connect(oscGain);
          oscGain.connect(gainNode);

          const startTime = ctx.currentTime + idx * 0.18;
          const noteDuration = 0.35;
          oscGain.gain.setValueAtTime(0.01, startTime);
          oscGain.gain.linearRampToValueAtTime(0.8, startTime + 0.02);
          oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

          osc.start(startTime);
          osc.stop(startTime + noteDuration);
        });
        break;
      }
      case 'call_connected': {
        playTone([523.25, 659.25], 0.25, 'sine', 80, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.6, t + 0.01);
          g.exponentialRampToValueAtTime(0.001, t + 0.25);
        });
        break;
      }
      case 'call_ended': {
        playTone([440, 329.63], 0.3, 'sine', 100, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.5, t + 0.01);
          g.exponentialRampToValueAtTime(0.001, t + 0.3);
        });
        break;
      }
      case 'error': {
        playTone([220, 216], 0.25, 'sine', 0, (g, t) => {
          g.setValueAtTime(0.01, t);
          g.linearRampToValueAtTime(0.4, t + 0.02);
          g.exponentialRampToValueAtTime(0.001, t + 0.25);
        });
        break;
      }
    }
  } catch (err) {
    console.warn('[SoundEngine] Playback failed:', err);
  }
};
