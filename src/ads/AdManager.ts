import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';

const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';
const INTERSTITIAL_COOLDOWN_MS = 60_000;

const isNativePlatform = (): boolean => {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
};

class AdManagerImpl {
  private initialized = false;
  private lastInterstitialAt = -Infinity;

  async init(): Promise<void> {
    if (!isNativePlatform()) return;
    try {
      await AdMob.initialize({
        initializeForTesting: true,
        testingDevices: [],
      });
      await AdMob.showBanner({
        adId: TEST_BANNER_ID,
        adSize: BannerAdSize.BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: true,
      });
      this.initialized = true;
    } catch (e) {
      console.warn('[AdMob] init failed', e);
    }
  }

  async showInterstitial(): Promise<void> {
    if (!this.initialized || !isNativePlatform()) return;
    const now = performance.now();
    if (now - this.lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return;
    try {
      await AdMob.prepareInterstitial({
        adId: TEST_INTERSTITIAL_ID,
        isTesting: true,
      });
      await AdMob.showInterstitial();
      this.lastInterstitialAt = now;
    } catch (e) {
      console.warn('[AdMob] interstitial failed', e);
    }
  }

  async showReward(): Promise<boolean> {
    return false;
  }
}

export const AdManager = new AdManagerImpl();
