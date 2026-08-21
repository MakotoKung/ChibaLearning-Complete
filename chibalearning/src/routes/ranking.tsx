import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Medal, Star, Swords } from "lucide-react";

import { GameHeader } from "@/components/GameHeader";
import { AskAiFab } from "@/components/AskAiFab";
import { useAuth } from "@/hooks/useAuth";
import { fetchLearnerStats } from "@/lib/game-data";
import { computeBadges, computeRank, nextRankProgress, RANKS } from "@/lib/rank";
import { bonusDoneCount, loadCollection } from "@/lib/cards";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking Board: Iron ถึง Diamond | PixelPath" },
      {
        name: "description",
        content:
          "ดูแรงค์ของคุณจากจำนวนบทเรียนที่จบ Iron, Silver, Gold, Diamond พร้อมเหรียญตราและ EXP ที่เก็บได้",
      },
      { property: "og:title", content: "Ranking Board | PixelPath" },
      { property: "og:description", content: "เลื่อนแรงค์จาก Iron ไป Diamond ด้วยการเรียนให้จบ" },
    ],
  }),
  component: RankingPage,
});

function RankingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [cardsOwned, setCardsOwned] = useState(0);
  const [bonusDone, setBonusDone] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    setCardsOwned(Object.keys(loadCollection()).length);
    setBonusDone(bonusDoneCount());
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["learner-stats", user?.id],
    queryFn: () => fetchLearnerStats(user!.id),
    enabled: !!user,
  });

  const rank = computeRank(stats?.nodesCleared ?? 0, stats?.roadmapsCompleted ?? 0);
  const rankInfo = RANKS.find((r) => r.key === rank)!;
  const progress = nextRankProgress(stats?.nodesCleared ?? 0, stats?.roadmapsCompleted ?? 0);
  const badges = computeBadges({
    nodesCleared: stats?.nodesCleared ?? 0,
    roadmapsCompleted: stats?.roadmapsCompleted ?? 0,
    xp: stats?.xp ?? 0,
    perfectQuizzes: stats?.perfectQuizzes ?? 0,
    bonusDone,
    cardsOwned,
  });

  return (
    <>
      <GameHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-primary flex items-center gap-2 text-sm">
          <Swords className="h-4 w-4" /> RANKING BOARD
        </h1>

        {isLoading && (
          <p className="text-primary mt-4 flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังรวบรวมสถิติ...
          </p>
        )}

        {stats && (
          <>
            <div className="pixel-panel mt-5 p-5 text-center">
              <p className={`pixel-text text-lg ${rankInfo.color}`}>{rankInfo.name}</p>
              <p className="text-muted-foreground mt-3 text-sm">{rankInfo.requirement}</p>
              <div className="pixel-inset mt-4 h-5 w-full p-1">
                <div
                  className="bg-gold h-full transition-all"
                  style={{ width: `${Math.min(progress.percent, 100)}%` }}
                />
              </div>
              <p className="pixel-text text-gold mt-2 text-[0.55rem]">{progress.label}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "EXP", value: stats.xp },
                { label: "NODES", value: stats.nodesCleared },
                { label: "บทที่จบ", value: stats.roadmapsCompleted },
                { label: "QUIZ เต็ม", value: stats.perfectQuizzes },
              ].map((s) => (
                <div key={s.label} className="pixel-inset p-3 text-center">
                  <p className="pixel-text text-primary text-[0.7rem]">{s.value}</p>
                  <p className="pixel-text text-muted-foreground mt-2 text-[0.45rem]">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="pixel-panel mt-4 p-5">
              <h2 className="text-gold flex items-center gap-2 text-[0.6rem]">
                <Star className="h-4 w-4" /> ลำดับแรงค์
              </h2>
              <div className="mt-4 space-y-2">
                {RANKS.map((r) => (
                  <div
                    key={r.key}
                    className={`flex items-center justify-between px-3 py-2 text-sm ${
                      r.key === rank ? "bg-surface-2 border-gold border-l-4" : ""
                    }`}
                  >
                    <span className={`pixel-text text-[0.55rem] ${r.color}`}>{r.name}</span>
                    <span className="text-muted-foreground ml-3 text-right text-sm">
                      {r.requirement}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pixel-panel mt-4 p-5">
              <h2 className="text-accent flex items-center gap-2 text-[0.6rem]">
                <Medal className="h-4 w-4" /> BADGES ({badges.filter((b) => b.earned).length}/
                {badges.length})
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {badges.map((b) => (
                  <div
                    key={b.key}
                    className={`pixel-inset flex items-center gap-3 p-3 ${
                      b.earned ? "" : "opacity-40"
                    }`}
                  >
                    <Medal className={`h-6 w-6 ${b.earned ? "text-gold" : "text-muted-foreground"}`} />
                    <div>
                      <p className="pixel-text text-[0.5rem]">{b.name}</p>
                      <p className="text-muted-foreground mt-1 text-sm">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/path"
              className="pixel-btn bg-primary text-primary-foreground mt-5 inline-block"
            >
              เรียนต่อเพื่อเลื่อนแรงค์
            </Link>
          </>
        )}
      </main>
      <AskAiFab context="ผู้เรียนกำลังดู Ranking board ของ PixelPath (Iron/Silver/Gold/Diamond)" />
    </>
  );
}
