/** Kleine Komfortfunktionen über localStorage – darf fehlschlagen (privater Modus usw.). */
export function loadValue(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function saveValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignorieren: nur Komfort
  }
}

export const NAME_KEY = "smartcraft.name";
