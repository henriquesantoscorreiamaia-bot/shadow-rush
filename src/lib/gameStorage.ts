export type Settings = {
  music: boolean;
  sounds: boolean;
  vibration: boolean;
  volume: number;
  particles: boolean;
  sensitivity: number;
  language: "pt-BR";
};

export type GameSave = {
  fragments: number;
  crystals: number;
  level: number;
  xp: number;
  bestFlight: number;
  bestCombo: number;
  totalRuns: number;
  totalDefeated: number;
  victories: number;
  unlockedSkins: string[];
  unlockedSkills: string[];
  achievements: string[];
  missions: Record<string, number>;
  settings: Settings;
};

const STORAGE_KEY = "shadow-rush-save-v1";

export const defaultSave: GameSave = {
  fragments: 180,
  crystals: 4,
  level: 3,
  xp: 120,
  bestFlight: 1240,
  bestCombo: 6,
  totalRuns: 8,
  totalDefeated: 27,
  victories: 2,
  unlockedSkins: ["crimson"],
  unlockedSkills: ["shadow-cut", "dark-impulse", "energy-burst"],
  achievements: ["first-run"],
  missions: { distance: 820, defeat: 4, collect: 36, fighter: 1 },
  settings: {
    music: true,
    sounds: true,
    vibration: true,
    volume: 0.72,
    particles: true,
    sensitivity: 1,
    language: "pt-BR",
  },
};

export function loadGame(): GameSave {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultSave;
    const parsed = JSON.parse(stored) as Partial<GameSave>;
    return {
      ...defaultSave,
      ...parsed,
      settings: { ...defaultSave.settings, ...(parsed.settings ?? {}) },
      unlockedSkins: parsed.unlockedSkins ?? defaultSave.unlockedSkins,
      unlockedSkills: parsed.unlockedSkills ?? defaultSave.unlockedSkills,
      achievements: parsed.achievements ?? defaultSave.achievements,
      missions: { ...defaultSave.missions, ...(parsed.missions ?? {}) },
    };
  } catch {
    return defaultSave;
  }
}

export function saveGame(save: GameSave) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

export function clearGame() {
  localStorage.removeItem(STORAGE_KEY);
}
