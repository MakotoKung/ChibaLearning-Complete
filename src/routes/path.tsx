import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Check, Lock, Loader2 } from "lucide-react";

import { GameHeader } from "@/components/GameHeader";
import { AskAiFab } from "@/components/AskAiFab";
import { useAuth } from "@/hooks/useAuth";
import { fetchActiveRoadmap, fetchProgress } from "@/lib/game-data";
import chichiLogo from "@/assets/logo.png";

export const Route = createFileRoute("/path")({
  head: () => ({
    meta: [
      { title: "เส้นทางการเรียน (Learning Path) | PixelPath" },
      {
        name: "description",
        content: "ไล่เรียนทีละ node จากง่ายไปยาก ปลดล็อกระดับถัดไปเมื่อผ่าน quiz ของบทก่อนหน้า",
      },
      { property: "og:title", content: "เส้นทางการเรียนของคุณ | PixelPath" },
      { property: "og:description", content: "แผนที่การเรียนแบบเกม ไล่ระดับทีละ node" },
    ],
  }),
  component: PathPage,
});

const SUBJECT_COLOR: Record<string, string> = {
  coding: "bg-primary text-primary-foreground",
  science: "bg-accent text-accent-foreground",
  math: "bg-magic text-primary-foreground",
  theory: "bg-surface-2 text-foreground",
  project: "bg-gold text-gold-foreground",
};

function PathPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: roadmap, isLoading } = useQuery({
    queryKey: ["roadmap", user?.id],
    queryFn: fetchActiveRoadmap,
    enabled: !!user,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress", roadmap?.id],
    queryFn: () => fetchProgress(roadmap!.id),
    enabled: !!roadmap,
  });

  const done = new Set(progress.map((p) => p.node_index));
  const total = roadmap?.nodes.length ?? 0;
  const allDone = total > 0 && done.size >= total;

  return (
    <>
      <GameHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {isLoading && (
          <p className="text-primary flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดแผนที่...
          </p>
        )}

        {!isLoading && !roadmap && (
          <div className="pixel-panel p-6 text-center">
            <h1 className="text-primary text-sm">ยังไม่มีเส้นทาง</h1>
            <p className="text-muted-foreground mt-3 text-sm">
              คุยกับ ChiChi ก่อน เพื่อให้สร้าง roadmap ให้คุณ
            </p>
            <Link to="/" className="pixel-btn bg-primary text-primary-foreground mt-4 inline-block">
              ไปคุยกับ CHICHI
            </Link>
          </div>
        )}

        {roadmap && (
          <>
            <div className="pixel-panel mb-6 p-5">
              <h1 className="text-primary text-sm">{roadmap.title}</h1>
              <p className="text-muted-foreground mt-3 text-sm">{roadmap.summary}</p>
              <div className="pixel-inset mt-4 h-5 w-full p-1">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${total ? (done.size / total) * 100 : 0}%` }}
                />
              </div>
              <p className="pixel-text text-gold mt-2 text-[0.55rem]">
                {done.size}/{total} NODES CLEARED
              </p>
              {allDone && (
                <Link
                  to="/certificate"
                  className="pixel-btn bg-gold text-gold-foreground mt-4 inline-block"
                >
                  รับ CERTIFICATE
                </Link>
              )}
            </div>

            <ol className="relative flex flex-col items-center gap-2">
              {roadmap.nodes.map((node, i) => {
                const cleared = done.has(i);
                const unlocked = i === 0 || done.has(i - 1);
                // เยื้องซ้าย-ขวาเป็นเส้นทางคดเคี้ยวแบบ Duolingo
                const offsets = [0, 68, 96, 68, 0, -68, -96, -68];
                const dx = offsets[i % offsets.length]!;
                const circle = cleared
                  ? "bg-terminal text-background"
                  : unlocked
                    ? SUBJECT_COLOR[node.subject] ?? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground";
                return (
                  <li
                    key={i}
                    className="flex w-full flex-col items-center"
                    style={{ transform: `translateX(${dx / 2}px)` }}
                  >
                    {i > 0 && (
                      <span
                        aria-hidden
                        className={`mb-1 h-8 w-2 ${cleared ? "bg-terminal/60" : "bg-border"}`}
                      />
                    )}
                    <div className="group relative flex flex-col items-center">
                      {unlocked ? (
                        <Link
                          to="/learn/$nodeIndex"
                          params={{ nodeIndex: String(i) }}
                          aria-label={`ระดับ ${i + 1}: ${node.title}`}
                          className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-background shadow-[0_6px_0_0_hsl(var(--border))] transition-transform hover:-translate-y-0.5 active:translate-y-1 ${circle}`}
                        >
                          {cleared ? (
                            <Check className="h-8 w-8" />
                          ) : (
                            <span className="pixel-text text-[0.7rem]">{i + 1}</span>
                          )}
                        </Link>
                      ) : (
                        <span
                          aria-label={`ระดับ ${i + 1} ยังล็อกอยู่`}
                          className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-background ${circle}`}
                        >
                          <Lock className="h-6 w-6" />
                        </span>
                      )}
                      <div
                        className="pixel-panel mt-2 max-w-[15rem] p-2 text-center"
                        style={{ transform: `translateX(${-dx / 2}px)` }}
                      >
                        <p className="text-foreground text-[0.55rem]">{node.title}</p>
                        <p className="pixel-text text-muted-foreground mt-2 text-[0.45rem]">
                          {node.subject.toUpperCase()} · ~{node.estimatedHours}H
                          {unlocked ? (cleared ? " · CLEARED" : " · เริ่มเลย") : " · LOCKED"}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
              <li className="mt-4 flex flex-col items-center">
                <span aria-hidden className="mb-2 h-8 w-2 bg-border" />
                <img
                  src={chichiLogo}
                  alt="ChiChi รออยู่ปลายทาง"
                  width={72}
                  height={72}
                  loading="lazy"
                  className="float-idle h-18 w-18"
                />
                <p className="pixel-text text-gold mt-2 text-[0.5rem]">GOAL: CERTIFICATE</p>
              </li>
            </ol>
          </>
        )}
      </main>
      <AskAiFab
        context={`ผู้เรียนกำลังดูเส้นทางการเรียนเพื่อเป็น ${roadmap?.goal ?? "อาชีพสายเทค"}`}
      />
    </>
  );
}
