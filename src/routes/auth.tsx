import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import knight from "@/assets/avatar-knight.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ | PixelPath เส้นทางเรียนรู้สายอาชีพ" },
      {
        name: "description",
        content: "เข้าสู่ระบบ PixelPath เพื่อเก็บความคืบหน้า XP และเส้นทางการเรียนรู้ของคุณ",
      },
      { property: "og:title", content: "เข้าสู่ระบบ | PixelPath" },
      { property: "og:description", content: "สมัครหรือเข้าสู่ระบบเพื่อเริ่มเส้นทางการเรียนรู้" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/path" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("สมัครสำเร็จ! เช็คอีเมลเพื่อยืนยันก่อนเข้าสู่ระบบ");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (result.error) {
      toast.error("เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
      return;
    }
    if (result.redirected) return;
  }


  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="pixel-panel w-full max-w-md p-6">
        <div className="mb-5 flex items-center gap-3">
          <img
            src={knight}
            alt="ตัวละครพิกเซลต้อนรับผู้เล่น"
            width={64}
            height={64}
            className="float-idle h-16 w-16"
          />
          <div>
            <h1 className="text-primary text-sm">
              {mode === "login" ? "LOAD GAME" : "NEW GAME"}
            </h1>
            <p className="text-muted-foreground text-sm">
              เก็บ progress, XP และ certificate ของคุณ
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="อีเมล"
            className="pixel-inset w-full px-3 py-3 text-sm outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน (6 ตัวขึ้นไป)"
            className="pixel-inset w-full px-3 py-3 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="pixel-btn bg-primary text-primary-foreground w-full"
          >
            {mode === "login" ? "PRESS START" : "CREATE HERO"}
          </button>
        </form>

        <button
          onClick={google}
          className="pixel-btn bg-surface-2 text-foreground mt-3 w-full"
        >
          SIGN IN WITH GOOGLE
        </button>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="text-muted-foreground hover:text-primary mt-4 w-full text-sm"
        >
          {mode === "login" ? "ยังไม่มีบัญชี? สมัครเลย" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
        </button>

        <Link to="/" className="text-muted-foreground hover:text-primary mt-2 block text-center text-sm">
          กลับไปคุยกับ ChiChi
        </Link>
      </div>
    </main>
  );
}
