interface AdManagerLike {
  init(): Promise<void>;
  showInterstitial(): Promise<void>;
  showReward(): Promise<boolean>;
}

const isNativePlatform = (): boolean => {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
};

class StubAdManager implements AdManagerLike {
  async init(): Promise<void> {
    // No-op on web. Phase 6 will add Capacitor + AdMob plugin and replace this.
  }
  async showInterstitial(): Promise<void> {
    // No-op
  }
  async showReward(): Promise<boolean> {
    return false;
  }
}

export const AdManager: AdManagerLike = isNativePlatform()
  ? new StubAdManager()
  : new StubAdManager();
