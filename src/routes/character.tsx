import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gamepad2, Save } from "lucide-react";

import { GameHeader } from "@/components/GameHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile } from "@/lib/game-data";
import { AVATARS } from "@/lib/avatars";

export const Route = createFileRoute("/character")({
  head: () => ({
    meta: [
      { title: "ตัวละครพิกเซลของคุณ | PixelPath" },
      {
        name: "description",
        content: "เลือกตัวละครพิกเซล ตั้งชื่อฮีโร่ และดูเลเวลกับ XP ที่ได้จากการเรียนและมินิเกม",
      },
      { property: "og:title", content: "ตัวละครพิกเซลของคุณ | PixelPath" },
      { property: "og:description", content: "เลือก avatar และดูเลเวลของฮีโร่นักเรียนของคุณ" },
    ],
  }),
  component: CharacterPage,
});

function CharacterPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [avatarKey, setAvatarKey] = useState<string>("knight");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setName(profile.display_name);
      setAvatarKey(profile.avatar_key);
    }
  }, [profile]);

  const xp = profile?.xp ?? 0;
  const level = Math.floor(xp / 200) + 1;
  const progressToNext = ((xp % 200) / 200) * 100;

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name.trim() || "Adventurer", avatar_key: avatarKey })
        .eq("id", user.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("บันทึกตัวละครแล้ว");
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <GameHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-primary text-sm">YOUR CHARACTER</h1>

        <div className="pixel-panel mt-5 p-5">
          <p className="pixel-text text-gold text-[0.6rem]">
            LV.{level} · {xp} XP
          </p>
          <div className="pixel-inset mt-3 h-5 w-full p-1">
            <div className="bg-gold h-full" style={{ width: `${progressToNext}%` }} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {AVATARS.map((a) => (
              <button
                key={a.key}
                onClick={() => setAvatarKey(a.key)}
                className={`pixel-inset p-3 text-center ${
                  avatarKey === a.key ? "border-primary" : ""
                }`}
              >
                <img
                  src={a.src}
                  alt={a.name}
                  width={96}
                  height={96}
                  loading="lazy"
                  className={`mx-auto h-24 w-24 ${avatarKey === a.key ? "float-idle" : ""}`}
                />
                <p className="pixel-text text-foreground mt-2 text-[0.5rem]">{a.name}</p>
                <p className="text-muted-foreground mt-2 text-sm">{a.blurb}</p>
              </button>
            ))}
          </div>

          <label className="text-muted-foreground mt-5 block text-sm">ชื่อฮีโร่</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            className="pixel-inset mt-2 w-full px-3 py-3 text-sm outline-none"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="pixel-btn bg-primary text-primary-foreground inline-flex items-center gap-2"
            >
              <Save className="h-4 w-4" /> SAVE
            </button>
            <Link
              to="/arcade"
              className="pixel-btn bg-accent text-accent-foreground inline-flex items-center gap-2"
            >
              <Gamepad2 className="h-4 w-4" /> เล่นมินิเกม
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
