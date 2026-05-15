export interface BestRun {
  stage: number;
  kills: number;
}

const KEY_BEST = 'yanotou:best';
const KEY_MUTED = 'yanotou:muted';

export const Storage = {
  getBest(): BestRun | null {
    try {
      const raw = localStorage.getItem(KEY_BEST);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<BestRun>;
      if (typeof parsed.stage === 'number' && typeof parsed.kills === 'number') {
        return { stage: parsed.stage, kills: parsed.kills };
      }
      return null;
    } catch {
      return null;
    }
  },

  updateBest(run: BestRun): boolean {
    const current = Storage.getBest();
    const isBetter =
      !current ||
      run.stage > current.stage ||
      (run.stage === current.stage && run.kills > current.kills);
    if (isBetter) {
      try {
        localStorage.setItem(KEY_BEST, JSON.stringify(run));
      } catch {
        // ignore
      }
      return true;
    }
    return false;
  },

  getMuted(): boolean {
    try {
      return localStorage.getItem(KEY_MUTED) === '1';
    } catch {
      return false;
    }
  },

  setMuted(muted: boolean): void {
    try {
      localStorage.setItem(KEY_MUTED, muted ? '1' : '0');
    } catch {
      // ignore
    }
  },
};
