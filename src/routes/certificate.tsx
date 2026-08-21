import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Award, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { GameHeader } from "@/components/GameHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchActiveRoadmap, fetchProfile, fetchProgress } from "@/lib/game-data";
import { avatarSrc } from "@/lib/avatars";

export const Route = createFileRoute("/certificate")({
  head: () => ({
    meta: [
      { title: "ใบรับรองการเรียนจบเส้นทาง | PixelPath" },
      {
        name: "description",
        content: "เมื่อเรียนครบทุก node ในเส้นทางอาชีพ รับใบรับรองสไตล์พิกเซลพร้อมรหัสยืนยัน",
      },
      { property: "og:title", content: "ใบรับรอง PixelPath" },
      { property: "og:description", content: "รับ certificate หลังเคลียร์ทุก node ในเส้นทาง" },
    ],
  }),
  component: CertificatePage,
});

function CertificatePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: roadmap } = useQuery({
    queryKey: ["roadmap", user?.id],
    queryFn: fetchActiveRoadmap,
    enabled: !!user,
  });
  const { data: progress = [] } = useQuery({
    queryKey: ["progress", roadmap?.id],
    queryFn: () => fetchProgress(roadmap!.id),
    enabled: !!roadmap,
  });
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });
  const { data: cert, refetch } = useQuery({
    queryKey: ["certificate", roadmap?.id],
    enabled: !!roadmap,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("roadmap_id", roadmap!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const total = roadmap?.nodes.length ?? 0;
  const cleared = progress.length;
  const eligible = total > 0 && cleared >= total;

  async function issue() {
    if (!user || !roadmap) return;
    setIssuing(true);
    try {
      const code = `PXP-${roadmap.id.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase
        .from("certificates")
        .insert({ user_id: user.id, roadmap_id: roadmap.id, code });
      if (error) throw error;
      await refetch();
      toast.success("ออกใบรับรองสำเร็จ!");
    } catch {
      toast.error("ออกใบรับรองไม่สำเร็จ");
    } finally {
      setIssuing(false);
    }
  }

  return (
    <>
      <GameHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-primary text-sm">CERTIFICATE</h1>

        {!roadmap && (
          <p className="text-muted-foreground mt-4 text-sm">
            ยังไม่มีเส้นทางการเรียน —{" "}
            <Link to="/" className="text-primary">
              คุยกับ ChiChi ก่อน
            </Link>
          </p>
        )}

        {roadmap && !eligible && (
          <div className="pixel-panel mt-5 p-6 text-center">
            <Award className="text-muted-foreground mx-auto h-10 w-10" />
            <p className="mt-3 text-sm">
              เคลียร์ครบทุก node ก่อนจึงจะรับใบรับรองได้ ({cleared}/{total})
            </p>
            <Link to="/path" className="pixel-btn bg-primary text-primary-foreground mt-4 inline-block">
              กลับไปเรียนต่อ
            </Link>
          </div>
        )}

        {roadmap && eligible && !cert && (
          <div className="pixel-panel mt-5 p-6 text-center">
            <h2 className="text-gold text-[0.7rem]">QUEST COMPLETE!</h2>
            <p className="text-muted-foreground mt-3 text-sm">
              คุณเคลียร์ครบทั้ง {total} node ของเส้นทาง {roadmap.title}
            </p>
            <button
              onClick={issue}
              disabled={issuing}
              className="pixel-btn bg-gold text-gold-foreground mt-4 inline-flex items-center gap-2"
            >
              {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
              ขอใบรับรอง
            </button>
          </div>
        )}

        {roadmap && cert && (
          <>
            <div className="pixel-panel bg-surface mt-5 p-8 text-center">
              <p className="pixel-text text-primary text-[0.6rem]">PIXELPATH ACADEMY</p>
              <div className="border-gold mt-5 border-3 p-6">
                <img
                  src={avatarSrc(profile?.avatar_key)}
                  alt="ตัวละครพิกเซลของผู้เรียน"
                  width={80}
                  height={80}
                  loading="lazy"
                  className="mx-auto h-20 w-20"
                />
                <h2 className="text-gold mt-4 text-[0.7rem]">CERTIFICATE OF COMPLETION</h2>
                <p className="text-muted-foreground mt-4 text-sm">มอบให้แก่</p>
                <p className="pixel-text text-foreground mt-2 text-[0.75rem]">
                  {profile?.display_name ?? "Adventurer"}
                </p>
                <p className="text-muted-foreground mt-4 text-sm">
                  ผู้เรียนจบเส้นทาง {total} ระดับ เพื่อเป็น
                </p>
                <p className="text-primary mt-2 text-sm">{roadmap.goal}</p>
                <p className="terminal-text text-muted-foreground mt-5">
                  CODE: {cert.code} · {new Date(cert.issued_at).toLocaleDateString("th-TH")} ·{" "}
                  {profile?.xp ?? 0} XP
                </p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="pixel-btn bg-primary text-primary-foreground mt-4 inline-flex items-center gap-2"
            >
              <Printer className="h-4 w-4" /> พิมพ์ / บันทึก PDF
            </button>
          </>
        )}
      </main>
    </>
  );
}
