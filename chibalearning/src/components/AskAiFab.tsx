import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

import { askTutor } from "@/lib/ai.functions";
import { PixelMarkdown } from "@/components/PixelMarkdown";

type Turn = { role: "user" | "ai"; text: string };

export function AskAiFab({ context }: { context: string }) {
  const ask = useServerFn(askTutor);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  async function send() {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await ask({ data: { question, context } });
      setTurns((t) => [...t, { role: "ai", text: res.answer }]);
    } catch {
      setTurns((t) => [
        ...t,
        { role: "ai", text: "ขออภัย ตอนนี้ติวเตอร์ AI ตอบไม่ได้ ลองอีกครั้งใน 1 นาที" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <div className="pixel-panel fixed right-4 bottom-24 z-50 flex h-[26rem] w-[min(24rem,calc(100vw-2rem))] flex-col">
          <div className="border-border bg-surface-2 flex items-center justify-between border-b-3 px-3 py-2">
            <span className="pixel-text text-primary text-[0.6rem]">ถาม AI ในบทนี้</span>
            <button onClick={() => setOpen(false)} aria-label="ปิด">
              <X className="text-muted-foreground hover:text-foreground h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {turns.length === 0 && (
              <p className="text-muted-foreground text-sm">
                สงสัยอะไรในบทเรียนนี้ถามได้เลย เช่น &quot;อธิบาย loop ให้ง่ายกว่านี้&quot;
              </p>
            )}
            {turns.map((t, i) =>
              t.role === "user" ? (
                <p key={i} className="bg-surface-2 border-border border-l-4 p-2 text-sm">
                  {t.text}
                </p>
              ) : (
                <div key={i} className="pixel-inset p-2">
                  <PixelMarkdown source={t.text} />
                </div>
              ),
            )}
            {busy && (
              <div className="text-primary flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> กำลังคิด...
              </div>
            )}
          </div>
          <div className="border-border flex gap-2 border-t-3 p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="พิมพ์คำถาม..."
              className="pixel-inset text-foreground flex-1 px-2 py-2 text-sm outline-none"
            />
            <button
              onClick={send}
              disabled={busy}
              aria-label="ส่งคำถาม"
              className="bg-primary text-primary-foreground px-3"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="ถาม AI"
        className="pixel-btn bg-accent text-accent-foreground fixed right-4 bottom-4 z-50 flex items-center gap-2"
      >
        <Sparkles className="h-4 w-4" />
        ASK AI
      </button>
    </>
  );
}
