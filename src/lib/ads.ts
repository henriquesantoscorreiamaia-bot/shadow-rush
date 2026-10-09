export type AdPlacement = "interstitial" | "rewarded" | "banner";

export const adConfig = {
  mode: "demo" as "demo" | "admob",
  interstitialEveryCompletedRuns: 4,
  minimumSecondsBetweenAds: 90,
  testDeviceOnly: true,
};

export function canShowAd(isPremium: boolean, placement: AdPlacement) {
  return !isPremium && adConfig.mode === "admob" && placement !== "rewarded";
}

export function requestRewardedAd(isPremium: boolean): Promise<boolean> {
  if (isPremium || adConfig.mode !== "admob") return Promise.resolve(false);
  return Promise.resolve(false);
}

export const adDisclosure = "Modo demonstração: nenhum anúncio real é carregado na versão web.";
