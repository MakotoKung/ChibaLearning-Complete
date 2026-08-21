import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { GameHeader } from "@/components/GameHeader";
import { PixelMarkdown } from "@/components/PixelMarkdown";
import { advisorChat, buildRoadmap } from "@/lib/ai.functions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import heroBg from "@/assets/hero-pixel.jpg";
import chichiLogo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PixelPath — คุยกับ AI หาเส้นทางเรียนสายอาชีพ" },
      {
        name: "description",
        content:
          "คุยกับ ChiChi (AI แมวพิกเซล) เพื่อรู้ว่าอาชีพที่อยากเป็นต้องเรียนอะไรบ้าง แล้วไล่เรียนทีละ node สไตล์เกมพิกเซล 16-bit",
      },
      { property: "og:title", content: "PixelPath — เส้นทางเรียนรู้สายอาชีพด้วย AI" },
      {
        property: "og:description",
        content: "AI สร้าง roadmap ให้คุณเรียนทีละระดับ ไม่หลงทาง ไม่เรียนเกินจำเป็น",
      },
    ],
  }),
  component: ChiChiPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const OPENER: Msg = {
  role: "assistant",
  content:
    "ยินดีต้อนรับสู่ PixelPath! บอก ChiChi หน่อยว่าอยากเป็นอะไร เช่น *Frontend Developer*, *Data Scientist*, *Game Dev* หรือเล่าความสนใจของคุณมาก็ได้",
};

const QUICK = ["Frontend Developer", "Data Scientist", "Game Developer", "Biotech Researcher"];

const LEVELS = [
  { label: "มือใหม่ 0%", text: "พื้นฐานของฉัน: เริ่มจากศูนย์ ยังไม่เคยเขียนโค้ดเลย" },
  { label: "พอรู้บ้าง", text: "พื้นฐานของฉัน: เคยเขียนโค้ดเล็กน้อย เข้าใจ variable กับ loop" },
  { label: "ปานกลาง", text: "พื้นฐานของฉัน: เขียนโปรแกรมเล็ก ๆ ได้เอง เคยทำโปรเจกต์" },
  { label: "ขั้นสูง", text: "พื้นฐานของฉัน: ทำงาน/ฝึกงานสายนี้มาแล้ว อยากต่อยอดเชิงลึก" },
];

const TIMES = [
  { label: "1-3 ชม./สัปดาห์", text: "เวลาที่ว่าง: 1-3 ชั่วโมงต่อสัปดาห์" },
  { label: "4-7 ชม./สัปดาห์", text: "เวลาที่ว่าง: 4-7 ชั่วโมงต่อสัปดาห์" },
  { label: "8+ ชม./สัปดาห์", text: "เวลาที่ว่าง: มากกว่า 8 ชั่วโมงต่อสัปดาห์" },
];

function ChiChiPage() {
  const chat = useServerFn(advisorChat);
  const makeRoadmap = useServerFn(buildRoadmap);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([OPENER]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [goal, setGoal] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await chat({ data: { messages: next } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      if (res.readyToBuild && res.careerGoal) setGoal(res.careerGoal);
    } catch {
      toast.error("ChiChi ตอบไม่ได้ตอนนี้ ลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  async function createPath() {
    if (!goal) return;
    if (!user) {
      window.localStorage.setItem("pixelpath_goal", goal);
      navigate({ to: "/auth" });
      return;
    }
    setBuilding(true);
    try {
      const roadmap = await makeRoadmap({ data: { goal } });
      const { error } = await supabase.from("roadmaps").insert({
        user_id: user.id,
        goal,
        title: roadmap.title,
        summary: roadmap.summary,
        nodes: roadmap.nodes,
      });
      if (error) throw error;
      toast.success("สร้างเส้นทางเรียบร้อย!");
      navigate({ to: "/path" });
    } catch {
      toast.error("สร้างเส้นทางไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setBuilding(false);
    }
  }

  // ผู้ใช้ที่เพิ่ง login กลับมาพร้อมเป้าหมายที่คุยไว้
  useEffect(() => {
    if (!user) return;
    const saved = window.localStorage.getItem("pixelpath_goal");
    if (saved) setGoal(saved);
  }, [user]);

  return (
    <>
      <GameHeader />
      <main className="relative min-h-[calc(100vh-4.5rem)]">
        <img
          src={heroBg}
          alt="ฉากพิกเซลเกาะลอยฟ้ายามค่ำคืน"
          width={1536}
          height={768}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-8">
          <div className="mb-6 text-center">
            <h1 className="text-primary text-base sm:text-xl">
              อยากเป็นอะไร? <span className="text-gold">ChiChi</span> จะจัดเส้นทางให้
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">
              คุยกับ AI สั้น ๆ แล้วรับ roadmap ที่ตัดสิ่งที่ไม่จำเป็นออกให้หมด
            </p>
          </div>

          <div className="pixel-panel scanlines flex h-[30rem] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((m, i) =>
                m.role === "assistant" ? (
                  <div key={i} className="flex gap-3">
                    <img
                      src={chichiLogo}
                      alt="ChiChi AI แมวพิกเซล"
                      width={40}
                      height={40}
                      loading="lazy"
                      className="h-10 w-10 shrink-0"
                    />
                    <div className="pixel-inset flex-1 p-3">
                      <PixelMarkdown source={m.content} />
                    </div>
                  </div>
                ) : (
                  <p
                    key={i}
                    className="bg-surface-2 border-primary ml-10 border-l-4 p-3 text-sm"
                  >
                    {m.content}
                  </p>
                ),
              )}
              {busy && (
                <div className="text-primary flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> ChiChi กำลังคิด
                  <span className="blink-cursor">▮</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {goal && (
              <div className="border-border bg-surface-2 border-t-3 p-3">
                <p className="text-sm">
                  เป้าหมาย: <span className="text-gold">{goal}</span>
                </p>
                <button
                  onClick={createPath}
                  disabled={building}
                  className="pixel-btn bg-gold text-gold-foreground mt-2 flex w-full items-center justify-center gap-2"
                >
                  {building ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังสร้าง...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> สร้างเส้นทางการเรียน
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="border-border flex gap-2 border-t-3 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="พิมพ์ที่นี่..."
                className="pixel-inset flex-1 px-3 py-3 text-sm outline-none"
              />
              <button
                onClick={() => send(input)}
                disabled={busy}
                aria-label="ส่งข้อความ"
                className="bg-primary text-primary-foreground px-4"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => send(`อยากเป็น ${q}`)}
                className="pixel-inset hover:text-primary px-3 py-2 text-sm"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <p className="pixel-text text-muted-foreground mb-2 text-[0.45rem]">
                เลือกระดับพื้นฐานของคุณ (หรือพิมพ์เองก็ได้)
              </p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.label}
                    onClick={() => send(l.text)}
                    disabled={busy}
                    className="pixel-inset hover:text-gold px-3 py-2 text-sm"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="pixel-text text-muted-foreground mb-2 text-[0.45rem]">
                เวลาที่ว่างเรียนต่อสัปดาห์
              </p>
              <div className="flex flex-wrap gap-2">
                {TIMES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => send(t.text)}
                    disabled={busy}
                    className="pixel-inset hover:text-primary px-3 py-2 text-sm"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
