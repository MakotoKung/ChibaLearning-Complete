export type RankKey = "iron" | "silver" | "gold" | "diamond";

export const RANKS: {
  key: RankKey;
  name: string;
  color: string;
  requirement: string;
}[] = [
  {
    key: "iron",
    name: "IRON",
    color: "text-muted-foreground",
    requirement: "เริ่มต้น — เรียนให้ครบ 4 หัวข้อเพื่อขึ้น Silver",
  },
  {
    key: "silver",
    name: "SILVER",
    color: "text-foreground",
    requirement: "เรียนครบ 4 หัวข้อ — เรียนจบ 1 บท (roadmap) เพื่อขึ้น Gold",
  },
  {
    key: "gold",
    name: "GOLD",
    color: "text-gold",
    requirement: "เรียนจบ 1 บท — เรียนจบ 3 บทเพื่อขึ้น Diamond",
  },
  { key: "diamond", name: "DIAMOND", color: "text-primary", requirement: "เรียนจบ 3 บทขึ้นไป" },
];

/** Iron -> Silver (4 nodes) -> Gold (จบ 1 บท) -> Diamond (จบ 3 บท) */
export function computeRank(nodesCleared: number, roadmapsCompleted: number): RankKey {
  if (roadmapsCompleted >= 3) return "diamond";
  if (roadmapsCompleted >= 1) return "gold";
  if (nodesCleared >= 4) return "silver";
  return "iron";
}

export function nextRankProgress(nodesCleared: number, roadmapsCompleted: number) {
  const rank = computeRank(nodesCleared, roadmapsCompleted);
  if (rank === "iron")
    return { label: `${nodesCleared}/4 หัวข้อ → SILVER`, percent: (nodesCleared / 4) * 100 };
  if (rank === "silver")
    return { label: `${roadmapsCompleted}/1 บทที่เรียนจบ → GOLD`, percent: roadmapsCompleted * 100 };
  if (rank === "gold")
    return {
      label: `${roadmapsCompleted}/3 บทที่เรียนจบ → DIAMOND`,
      percent: (roadmapsCompleted / 3) * 100,
    };
  return { label: "แรงค์สูงสุดแล้ว!", percent: 100 };
}

export type Badge = { key: string; name: string; desc: string; earned: boolean };

export function computeBadges(stats: {
  nodesCleared: number;
  roadmapsCompleted: number;
  xp: number;
  perfectQuizzes: number;
  bonusDone: number;
  cardsOwned: number;
}): Badge[] {
  return [
    {
      key: "first-step",
      name: "First Step",
      desc: "เรียนจบหัวข้อแรก",
      earned: stats.nodesCleared >= 1,
    },
    {
      key: "grinder",
      name: "Grinder",
      desc: "เรียนจบ 4 หัวข้อ",
      earned: stats.nodesCleared >= 4,
    },
    {
      key: "perfectionist",
      name: "Perfectionist",
      desc: "ทำ quiz ได้เต็ม 1 ครั้ง",
      earned: stats.perfectQuizzes >= 1,
    },
    {
      key: "overachiever",
      name: "Overachiever",
      desc: "ทำแบบฝึกหัดพิเศษสำเร็จ 3 ครั้ง",
      earned: stats.bonusDone >= 3,
    },
    {
      key: "xp-1000",
      name: "XP Hunter",
      desc: "เก็บครบ 1,000 XP",
      earned: stats.xp >= 1000,
    },
    {
      key: "collector",
      name: "Collector",
      desc: "สะสมการ์ดได้ 5 ใบ",
      earned: stats.cardsOwned >= 5,
    },
    {
      key: "graduate",
      name: "Graduate",
      desc: "เรียนจบครบทั้งบท",
      earned: stats.roadmapsCompleted >= 1,
    },
  ];
}
