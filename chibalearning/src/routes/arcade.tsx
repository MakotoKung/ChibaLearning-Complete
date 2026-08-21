import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { GameHeader } from "@/components/GameHeader";
import { AskAiFab } from "@/components/AskAiFab";
import { useAuth } from "@/hooks/useAuth";
import { addXp, fetchProfile } from "@/lib/game-data";
import { avatarSrc } from "@/lib/avatars";
import {
  CARDS,
  drawCard,
  loadCollection,
  RARITY_STYLE,
  saveCollection,
  type Card,
} from "@/lib/cards";

export const Route = createFileRoute("/arcade")({
  head: () => ({
    meta: [
      { title: "Card Summon: เปิดการ์ดสุ่มตัวละครพิกเซล | PixelPath" },
      {
        name: "description",
        content:
          "พักสมองด้วยการเปิดการ์ดสุ่มตัวละครพิกเซล เก็บสะสมให้ครบทุกใบ ยิ่งการ์ดหายากยิ่งได้ XP มาก",
      },
      { property: "og:title", content: "Card Summon | PixelPath" },
      { property: "og:description", content: "มินิเกมเปิดการ์ดสุ่มตัวละครพิกเซลของ PixelPath" },
    ],
  }),
  component: ArcadePage,
});

function ArcadePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [collection, setCollection] = useState<Record<string, number>>({});
  const [flipping, setFlipping] = useState(false);
  const [pulled, setPulled] = useState<Card | null>(null);

  useEffect(() => {
    setCollection(loadCollection());
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id).then((p) => setAvatar(p?.avatar_key ?? null));
  }, [user]);

  const summon = useCallback(async () => {
    if (flipping) return;
    setFlipping(true);
    setPulled(null);
    await new Promise((r) => setTimeout(r, 900));
    const card = drawCard();
    setPulled(card);
    setCollection((prev) => {
      const next = { ...prev, [card.id]: (prev[card.id] ?? 0) + 1 };
      saveCollection(next);
      return next;
    });
    setFlipping(false);

    const xp = RARITY_STYLE[card.rarity].xp;
    if (user) {
      await addXp(user.id, xp);
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["learner-stats", user.id] });
    }
    toast.success(`ได้ ${card.name} (${RARITY_STYLE[card.rarity].label}) +${xp} XP`);
  }, [flipping, user, queryClient]);

  const owned = Object.keys(collection).length;

  return (
    <>
      <GameHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-primary text-sm">ARCADE · CARD SUMMON</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          เปิดการ์ดสุ่มตัวละครพิกเซล! การ์ดยิ่งหายากยิ่งได้ XP มาก (Common 5 / Rare 15 / Epic 35 /
          Legendary 80)
        </p>

        <div className="pixel-panel scanlines mt-5 p-5">
          <div className="mb-4 flex items-center gap-3">
            <img
              src={avatarSrc(avatar)}
              alt="ตัวละครพิกเซลของคุณ"
              width={48}
              height={48}
              loading="lazy"
              className="float-idle h-12 w-12"
            />
            <p className="pixel-text text-gold text-[0.55rem]">
              COLLECTION {owned}/{CARDS.length}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`pixel-inset flex h-56 w-40 flex-col items-center justify-center p-3 text-center transition-transform ${
                flipping ? "animate-pulse" : ""
              }`}
            >
              {flipping ? (
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
              ) : pulled ? (
                <>
                  <span className="text-5xl">{pulled.emoji}</span>
                  <p className="pixel-text mt-3 text-[0.5rem]">{pulled.name}</p>
                  <p
                    className={`pixel-text mt-2 text-[0.45rem] ${RARITY_STYLE[pulled.rarity].class}`}
                  >
                    {RARITY_STYLE[pulled.rarity].label}
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm">{pulled.blurb}</p>
                </>
              ) : (
                <>
                  <span className="text-5xl">🎴</span>
                  <p className="pixel-text text-muted-foreground mt-3 text-[0.45rem]">
                    กดปุ่มเพื่อเปิดการ์ด
                  </p>
                </>
              )}
            </div>

            <button
              onClick={summon}
              disabled={flipping}
              className="pixel-btn bg-gold text-gold-foreground mt-5 flex w-full items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" /> {flipping ? "SUMMONING..." : "SUMMON CARD"}
            </button>
            {!user && (
              <p className="text-muted-foreground mt-3 text-center text-sm">
                เข้าสู่ระบบเพื่อเก็บ XP จากการเปิดการ์ด
              </p>
            )}
          </div>
        </div>

        <h2 className="text-accent mt-8 text-[0.6rem]">CARD ALBUM</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CARDS.map((c) => {
            const count = collection[c.id] ?? 0;
            return (
              <div
                key={c.id}
                className={`pixel-inset p-3 text-center ${count ? "" : "opacity-35"}`}
              >
                <span className="text-3xl">{count ? c.emoji : "❔"}</span>
                <p className="pixel-text mt-2 text-[0.45rem]">{count ? c.name : "???"}</p>
                <p className={`pixel-text mt-1 text-[0.4rem] ${RARITY_STYLE[c.rarity].class}`}>
                  {RARITY_STYLE[c.rarity].label}
                  {count > 1 ? ` ×${count}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </main>
      <AskAiFab context="ผู้เรียนอยู่ในหน้า Arcade เกมเปิดการ์ดสุ่มตัวละครพิกเซลของ PixelPath" />
    </>
  );
}
