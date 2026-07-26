"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getProfile, upsertProfile } from "@/lib/settings/actions";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/zenith/api-key";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  User,
  Key,
  Palette,
  LogOut,
  Save,
  Loader2,
  Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";

export function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [accountType, setAccountType] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [zenithKey, setZenithKey] = useState("");
  const [zenithSaved, setZenithSaved] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: profile } = await getProfile();

      if (profile) {
        setDisplayName(profile.display_name ?? "");
        setCurrency(profile.base_currency ?? "USD");
        setAccountType(profile.account_type ?? "personal");
      } else if (user?.email) {
        setDisplayName(user.email.split("@")[0]);
      }

      // Load Zenith key from localStorage
      const storedKey = getApiKey();
      setZenithKey(storedKey ?? "");

      setLoading(false);
    };
    load();
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const res = await upsertProfile({
      display_name: displayName || null,
      account_type: accountType,
      base_currency: currency,
    });

    setSaving(false);
    if (!res.error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-brand/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-foreground-muted">
            Manage your profile and preferences.
          </p>
        </div>
      </div>

      {/* Profile section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </CardTitle>
          <CardDescription>
            Your display name and account information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Display Name</Label>
            <Input
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Account Type</Label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/50"
            >
              <option value="personal">Personal</option>
              <option value="prop">Prop Firm</option>
              <option value="funded">Funded Account</option>
              <option value="live">Live Account</option>
            </select>
          </div>
          <Button onClick={handleSave} disabled={saving || loading} size="sm">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              "Saved ✓"
            ) : (
              <Save className="w-4 h-4" />
            )}
            {!saving && !saved && "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Preferences
          </CardTitle>
          <CardDescription>Customize your experience.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Base Currency</Label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/50"
            >
              {["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "PKR"].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ),
              )}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* API Keys — Velox Zenith AI */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            Velox Zenith AI Key
          </CardTitle>
          <CardDescription>
            Enter your Velox Zenith AI access key to enable Zenith Agent and automated analysis.
            Your key is saved locally in your browser for privacy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={zenithKey ? "profit" : "outline"}>
              Velox Zenith
            </Badge>
            <span className="text-sm text-foreground-muted">
              {zenithKey ? "Active & Connected" : "Not configured"}
            </span>
          </div>
          <div className="space-y-1.5">
            <Label>Velox Zenith Key</Label>
            <Input
              type="password"
              placeholder="vzs_key_..."
              value={zenithKey}
              onChange={(e) => {
                setZenithKey(e.target.value);
                setZenithSaved(false);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setApiKey(zenithKey);
                setZenithSaved(true);
                setTimeout(() => setZenithSaved(false), 2000);
              }}
              disabled={!zenithKey.trim()}
            >
              {zenithSaved ? "Saved ✓" : <Save className="w-4 h-4" />}
              {!zenithSaved && "Save Key"}
            </Button>
            {zenithKey && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  clearApiKey();
                  setZenithKey("");
                  setZenithSaved(false);
                }}
              >
                Remove
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </CardTitle>
          <CardDescription>
            Your data is protected by Supabase Row Level Security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="danger" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
