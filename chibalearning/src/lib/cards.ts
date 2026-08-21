export type Rarity = "common" | "rare" | "epic" | "legendary";

export type Card = {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  blurb: string;
};

export const RARITY_STYLE: Record<Rarity, { label: string; class: string; xp: number }> = {
  common: { label: "COMMON", class: "text-muted-foreground", xp: 5 },
  rare: { label: "RARE", class: "text-primary", xp: 15 },
  epic: { label: "EPIC", class: "text-accent", xp: 35 },
  legendary: { label: "LEGENDARY", class: "text-gold", xp: 80 },
};

export const CARDS: Card[] = [
  { id: "chichi", name: "ChiChi", emoji: "🐱", rarity: "legendary", blurb: "แมวไกด์ประจำ PixelPath" },
  { id: "knight", name: "Code Knight", emoji: "🛡️", rarity: "rare", blurb: "อัศวินสายลงมือเขียนโค้ด" },
  { id: "mage", name: "Lab Mage", emoji: "🧪", rarity: "rare", blurb: "จอมเวทห้องแล็บ" },
  { id: "bot", name: "Byte Bot", emoji: "🤖", rarity: "rare", blurb: "หุ่นสายออโตเมชัน" },
  { id: "bug", name: "Bug Slime", emoji: "🐛", rarity: "common", blurb: "ศัตรูตัวจิ๋วที่เจอทุกวัน" },
  { id: "coffee", name: "Coffee Potion", emoji: "☕", rarity: "common", blurb: "ยาเพิ่มพลังโปรแกรมเมอร์" },
  { id: "terminal", name: "Terminal Ghost", emoji: "👻", rarity: "common", blurb: "วิญญาณใน command line" },
  { id: "rocket", name: "Deploy Rocket", emoji: "🚀", rarity: "epic", blurb: "ปล่อยของขึ้น production" },
  { id: "dragon", name: "Data Dragon", emoji: "🐉", rarity: "epic", blurb: "มังกรผู้เฝ้าฐานข้อมูล" },
  { id: "crown", name: "Architect Crown", emoji: "👑", rarity: "legendary", blurb: "มงกุฎของสถาปนิกระบบ" },
];

const WEIGHT: Record<Rarity, number> = { common: 60, rare: 25, epic: 12, legendary: 3 };

export function drawCard(): Card {
  const pool = CARDS.flatMap((c) => Array.from({ length: WEIGHT[c.rarity] }, () => c));
  return pool[Math.floor(Math.random() * pool.length)]!;
}

const KEY = "pixelpath_cards";

export function loadCollection(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function saveCollection(collection: Record<string, number>) {
  window.localStorage.setItem(KEY, JSON.stringify(collection));
}

const BONUS_KEY = "pixelpath_bonus_done";

export function bonusDoneCount() {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(BONUS_KEY) ?? "0");
}

export function markBonusDone() {
  window.localStorage.setItem(BONUS_KEY, String(bonusDoneCount() + 1));
}
