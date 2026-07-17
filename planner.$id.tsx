// Shared helpers for shoot type colors and templates
export const SHOOT_TYPES = ["Sports", "Nightclub", "Portrait", "Wedding", "Street", "Custom"] as const;
export type ShootType = typeof SHOOT_TYPES[number];

export const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Sports: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  Nightclub: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  Portrait: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  Wedding: { bg: "bg-pink-100", text: "text-pink-700", dot: "bg-pink-500" },
  Street: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  Custom: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500" },
};

export const MOODS = ["High contrast", "Moody", "Cinematic", "Golden", "Gritty", "Clean", "Editorial", "Dark", "Vibrant", "Soft", "Natural", "Dramatic"];

export const GEAR = ["Camera body", "24-70mm f/2.8", "70-200mm f/2.8", "50mm f/1.8", "35mm f/1.8", "Wide angle", "Flash", "Speedlight", "Extra batteries", "Memory cards", "Monopod", "Tripod", "Reflector", "ND filters", "Rain cover"];

export const SHOT_TAGS = ["Action", "Candid", "Editorial", "Portrait", "Atmosphere", "Detail", "Custom"];

export type Shot = { id: string; text: string; tag: string; done: boolean };

export const TEMPLATES: Record<string, { moods: string[]; shots: string[] }> = {
  Nightclub: {
    moods: ["Dark", "Gritty", "High contrast"],
    shots: ["Arrivals at door", "Dance floor wide", "Dance floor close", "DJ booth", "Group shots", "Bar area", "Details / decor", "End of night crowd"],
  },
  Sports: {
    moods: ["High contrast", "Gritty", "Dramatic"],
    shots: ["Warm up", "Team huddle", "Kick off / tip off", "Action close up", "Crowd reaction", "Celebration", "Post match portrait", "Trophy / award"],
  },
  Portrait: {
    moods: ["Clean", "Soft", "Natural"],
    shots: ["Wide establishing", "3/4 length", "Close up face", "Looking away", "Laughing natural", "Hands / detail", "Environmental context"],
  },
  Wedding: {
    moods: ["Golden", "Cinematic", "Editorial"],
    shots: ["Getting ready detail", "First look", "Ceremony wide", "Vows close up", "Ring exchange", "First kiss", "Confetti / exit", "Reception speeches", "First dance", "Couple portraits golden hour"],
  },
  Street: {
    moods: ["Moody", "Cinematic", "Natural"],
    shots: ["Street wide", "Faces in crowd", "Motion blur", "Reflections", "Light and shadow", "Candid moment", "Architecture detail"],
  },
};

export function progressOf(shotList: Shot[] | undefined): { done: number; total: number; pct: number } {
  const total = shotList?.length ?? 0;
  const done = shotList?.filter((s) => s.done).length ?? 0;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}
