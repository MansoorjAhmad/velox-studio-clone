"use client";

export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { ZenithAgent } from "@/components/zenith/zenith-agent";
import { TopBar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { syncTradingConfigFromServer } from "@/lib/trading-config";
import { syncStrategiesFromServer } from "@/lib/journal/strategies";
import { syncActiveAccountFromServer } from "@/lib/accounts/active-account";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
      } else {
        await Promise.all([
          syncTradingConfigFromServer(),
          syncStrategiesFromServer(),
          syncActiveAccountFromServer(),
        ]);
        if (session.user?.email) {
          setUsername(session.user.email.split("@")[0]);
        }
        setLoading(false);
      }
    };
    check();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-brand/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand animate-spin" style={{ animationDuration: "0.8s" }} />
          </div>
          <p className="text-xs text-foreground-subtle tracking-wide">Loading Velox Studio…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="md:ml-60 ml-0 flex flex-col min-h-screen">
        <TopBar username={username} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 animate-slide-up">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav />
      {/* Zenith Agent — floating chat bubble, bottom-right */}
      <ZenithAgent />
      {/* Command Palette — ⌘K */}
      <CommandPalette />
    </div>
  );
}
