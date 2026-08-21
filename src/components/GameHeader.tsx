import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gamepad2, LogOut, Map, MessageSquare, ScrollText, Swords } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile } from "@/lib/game-data";
import { avatarSrc } from "@/lib/avatars";
import chichiLogo from "@/assets/logo.png";

const NAV = [
  { to: "/", label: "ChiChi", icon: MessageSquare },
  { to: "/path", label: "Path", icon: Map },
  { to: "/ranking", label: "Rank", icon: Swords },
  { to: "/arcade", label: "Cards", icon: Gamepad2 },
  { to: "/certificate", label: "Cert", icon: ScrollText },
] as const;

export function GameHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  return (
    <header className="border-border bg-surface/95 sticky top-0 z-40 border-b-4 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/" className="mr-2 flex items-center gap-2">
          <img
            src={chichiLogo}
            alt="โลโก้ PixelPath รูปหัวแมวพิกเซล"
            width={36}
            height={36}
            className="pixel-inset h-9 w-9 p-0.5"
          />
          <span className="pixel-text text-primary text-[0.7rem] sm:text-xs">
            PIXEL<span className="text-gold">PATH</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-muted-foreground hover:text-primary hover:bg-surface-2 flex items-center gap-2 px-2 py-2 text-sm"
              activeProps={{ className: "text-primary bg-surface-2" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              <item.icon className="h-4 w-4" />
              <span className="pixel-text text-[0.55rem]">{item.label}</span>
            </Link>
          ))}
        </nav>

        {user ? (
          <div className="flex items-center gap-3">
            <Link to="/character" className="flex items-center gap-2">
              <img
                src={avatarSrc(profile?.avatar_key)}
                alt="ตัวละครของคุณ"
                width={40}
                height={40}
                loading="lazy"
                className="pixel-inset h-10 w-10 p-0.5"
              />
              <span className="hidden sm:block">
                <span className="pixel-text text-foreground block text-[0.55rem]">
                  {profile?.display_name ?? "Adventurer"}
                </span>
                <span className="pixel-text text-gold block text-[0.5rem]">
                  {profile?.xp ?? 0} XP
                </span>
              </span>
            </Link>
            <button
              aria-label="ออกจากระบบ"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              className="text-muted-foreground hover:text-destructive p-2"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link to="/auth" className="pixel-btn bg-primary text-primary-foreground">
            LOGIN
          </Link>
        )}
      </div>
    </header>
  );
}
