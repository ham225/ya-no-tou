import { Storage } from '../state/Storage';

class SoundFxImpl {
  private ctx: AudioContext | null = null;
  private muted: boolean;
  private lastShootAt = 0;
  private lastEnemyHitAt = 0;

  constructor() {
    this.muted = Storage.getMuted();
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    Storage.setMuted(this.muted);
    return this.muted;
  }

  private getCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  private tone(opts: {
    freqStart: number;
    freqEnd?: number;
    durMs: number;
    type?: OscillatorType;
    volume?: number;
    delayMs?: number;
  }): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const start = ctx.currentTime + (opts.delayMs ?? 0) / 1000;
    const stop = start + opts.durMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? 'square';
    osc.frequency.setValueAtTime(opts.freqStart, start);
    if (opts.freqEnd !== undefined && opts.freqEnd !== opts.freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), stop);
    }
    const vol = opts.volume ?? 0.1;
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(stop);
  }

  shoot(): void {
    const now = performance.now();
    if (now - this.lastShootAt < 40) return;
    this.lastShootAt = now;
    this.tone({ freqStart: 880, freqEnd: 700, durMs: 70, type: 'square', volume: 0.05 });
  }

  enemyHit(): void {
    const now = performance.now();
    if (now - this.lastEnemyHitAt < 50) return;
    this.lastEnemyHitAt = now;
    this.tone({ freqStart: 520, freqEnd: 380, durMs: 60, type: 'square', volume: 0.06 });
  }

  enemyKill(): void {
    this.tone({ freqStart: 660, freqEnd: 180, durMs: 180, type: 'sawtooth', volume: 0.09 });
  }

  playerHurt(): void {
    this.tone({ freqStart: 220, freqEnd: 90, durMs: 220, type: 'sawtooth', volume: 0.16 });
  }

  stageClear(): void {
    this.tone({ freqStart: 523, durMs: 110, type: 'triangle', volume: 0.12, delayMs: 0 });
    this.tone({ freqStart: 659, durMs: 110, type: 'triangle', volume: 0.12, delayMs: 110 });
    this.tone({ freqStart: 784, durMs: 180, type: 'triangle', volume: 0.13, delayMs: 220 });
  }

  allClear(): void {
    this.tone({ freqStart: 523, durMs: 130, type: 'triangle', volume: 0.13, delayMs: 0 });
    this.tone({ freqStart: 659, durMs: 130, type: 'triangle', volume: 0.13, delayMs: 130 });
    this.tone({ freqStart: 784, durMs: 130, type: 'triangle', volume: 0.13, delayMs: 260 });
    this.tone({ freqStart: 1046, durMs: 280, type: 'triangle', volume: 0.14, delayMs: 390 });
  }

  gameOver(): void {
    this.tone({ freqStart: 440, freqEnd: 110, durMs: 700, type: 'sawtooth', volume: 0.18 });
  }

  upgradeSelect(): void {
    this.tone({ freqStart: 659, durMs: 80, type: 'triangle', volume: 0.13 });
    this.tone({ freqStart: 988, durMs: 120, type: 'triangle', volume: 0.13, delayMs: 80 });
  }

  bossSpawn(): void {
    this.tone({ freqStart: 180, freqEnd: 70, durMs: 500, type: 'sawtooth', volume: 0.2 });
  }
}

export const SoundFx = new SoundFxImpl();
