import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type LucideIcon, Sparkles } from "lucide-react";

/**
 * Placeholder shown for dashboard routes that haven't been built yet.
 * Keeps the app navigable and signals what's coming — instead of a 404.
 */
export function ComingSoon({
  title,
  description,
  icon: Icon,
  bullets,
  phase,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  bullets?: string[];
  phase?: string;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-foreground-muted">{description}</p>
          </div>
        </div>
        {phase && (
          <Badge variant="outline" className="shrink-0">
            <Sparkles className="w-3 h-3 mr-1" />
            {phase}
          </Badge>
        )}
      </div>

      <Card glass className="border-brand/20">
        <CardContent className="py-10">
          <div className="text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 text-brand animate-pulse" />
            </div>
            <h2 className="text-lg font-semibold">In development</h2>
            <p className="text-sm text-foreground-muted">
              This module is being crafted with care. It&apos;ll land in an upcoming build.
            </p>
            {bullets && bullets.length > 0 && (
              <div className="text-left bg-surface-2 rounded-md p-4 space-y-2 mt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
                  Planned
                </p>
                {bullets.map((b) => (
                  <p key={b} className="text-sm text-foreground-muted flex items-start gap-2">
                    <span className="text-brand mt-0.5">·</span>
                    <span>{b}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
