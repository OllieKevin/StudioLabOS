export interface UiPreferences {
  motionIntensity: number;
}

const UI_PREFS_KEY = "mixarlab.ui.preferences.v1";

const DEFAULTS: UiPreferences = {
  motionIntensity: 68
};

export function getUiPreferences(): UiPreferences {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<UiPreferences>;
    return {
      motionIntensity: clampIntensity(parsed.motionIntensity)
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveUiPreferences(next: UiPreferences): UiPreferences {
  const normalized: UiPreferences = {
    motionIntensity: clampIntensity(next.motionIntensity)
  };
  localStorage.setItem(UI_PREFS_KEY, JSON.stringify(normalized));
  return normalized;
}

function clampIntensity(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULTS.motionIntensity;
  const n = Number(value);
  return Math.max(0, Math.min(100, Math.round(n)));
}
