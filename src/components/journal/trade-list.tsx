"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TradeForm } from "./trade-form";
import { TradeDetailDrawer } from "./trade-detail-drawer";
import { deleteTrade } from "@/lib/journal/actions";
import {
  Trash2,
  Pencil,
  ArrowUpDown,
  Search,
  TrendingUp,
  TrendingDown,
  Inbox,
} from "lucide-react";
import { cn, formatCurrency, timeAgo } from "@/lib/utils";
import type { Trade } from "@/lib/journal/types";
import { getTradingAccounts } from "@/lib/accounts/actions";
import type { TradingAccount } from "@/lib/accounts/types";
import { useEffect } from "react";

type SortKey =
  | "entry_time"
  | "pnl"
  | "r_multiple"
  | "symbol"
  | "setup";

export function TradeList({
  trades,
  onChanged,
}: {
  trades: Trade[];
  onChanged?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterDir, setFilterDir] = useState("");
  const [filterOutcome, setFilterOutcome] = useState<"" | "wins" | "losses">("");
  const [filterSetup, setFilterSetup] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("entry_time");
  const [sortAsc, setSortAsc] = useState(false);

  const [editing, setEditing] = useState<Trade | null>(null);
  const [viewing, setViewing] = useState<Trade | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Trade | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);

  useEffect(() => {
    const loadAccs = async () => {
      const res = await getTradingAccounts();
      const remote = res.data ?? [];
      const local = JSON.parse(localStorage.getItem("velox_local_accounts") || "[]");
      setAccounts([...remote, ...local]);
    };
    loadAccs();
  }, []);

  const accountMap = useMemo(() => {
    const map = new Map<string, TradingAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  const setups = useMemo(
    () =>
      Array.from(
        new Set(trades.map((t) => t.setup).filter(Boolean) as string[]),
      ).sort(),
    [trades],
  );

  const filtered = useMemo(() => {
    let list = [...trades];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.setup?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q),
      );
    }
    if (filterDir) list = list.filter((t) => t.direction === filterDir);
    if (filterOutcome === "wins") list = list.filter((t) => (t.pnl ?? 0) > 0);
    if (filterOutcome === "losses") list = list.filter((t) => (t.pnl ?? 0) < 0);
    if (filterSetup) list = list.filter((t) => t.setup === filterSetup);
    if (filterSession)
      list = list.filter((t) => t.session === filterSession);

    list.sort((a, b) => {
      let av: number | string = "";
      let bv: number | string = "";
      switch (sortKey) {
        case "entry_time":
          av = new Date(a.entry_time).getTime();
          bv = new Date(b.entry_time).getTime();
          break;
        case "pnl":
          av = a.pnl ?? -Infinity;
          bv = b.pnl ?? -Infinity;
          break;
        case "r_multiple":
          av = a.r_multiple ?? -Infinity;
          bv = b.r_multiple ?? -Infinity;
          break;
        case "symbol":
          av = a.symbol;
          bv = b.symbol;
          break;
        case "setup":
          av = a.setup ?? "";
          bv = b.setup ?? "";
          break;
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [trades, search, filterDir, filterSetup, filterSession, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const res = await deleteTrade(confirmDelete.id);
    setDeleting(false);
    setConfirmDelete(null);
    if (res?.error) {
      toast.error("Delete failed", { description: res.error });
    } else {
      toast.success("Trade deleted", {
        description: `${confirmDelete.symbol} ${confirmDelete.direction} removed from journal`,
      });
    }
    onChanged?.();
  };

  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface/50 py-16 text-center">
        <Inbox className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">No trades yet</p>
        <p className="text-xs text-foreground-muted mt-1">
          Log your first trade to start building your edge.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-subtle shrink-0 mr-1">Quick Filters:</span>
        <button
          onClick={() => { setFilterDir(""); setFilterOutcome(""); setFilterSetup(""); setFilterSession(""); setSearch(""); }}
          className={cn("px-2.5 py-1 rounded-full border transition-all font-semibold shrink-0", !filterDir && !filterOutcome && !filterSetup && !filterSession && !search ? "bg-brand text-white border-brand shadow-sm" : "border-border bg-surface-2/40 text-foreground-muted hover:text-foreground")}
        >
          All ({trades.length})
        </button>
        <button
          onClick={() => { setFilterOutcome((v) => (v === "wins" ? "" : "wins")); }}
          className={cn("px-2.5 py-1 rounded-full border transition-all font-semibold shrink-0", filterOutcome === "wins" ? "bg-profit/20 text-profit border-profit/40" : "border-border bg-surface-2/40 text-foreground-muted hover:text-foreground")}
        >
          🟢 Wins ({trades.filter((t) => (t.pnl ?? 0) > 0).length})
        </button>
        <button
          onClick={() => { setFilterOutcome((v) => (v === "losses" ? "" : "losses")); }}
          className={cn("px-2.5 py-1 rounded-full border transition-all font-semibold shrink-0", filterOutcome === "losses" ? "bg-loss/20 text-loss border-loss/40" : "border-border bg-surface-2/40 text-foreground-muted hover:text-foreground")}
        >
          🔴 Losses ({trades.filter((t) => (t.pnl ?? 0) < 0).length})
        </button>
        <button
          onClick={() => { setFilterDir((v) => (v === "LONG" ? "" : "LONG")); }}
          className={cn("px-2.5 py-1 rounded-full border transition-all font-semibold shrink-0", filterDir === "LONG" ? "bg-profit/20 text-profit border-profit/40" : "border-border bg-surface-2/40 text-foreground-muted hover:text-foreground")}
        >
          ▲ Longs ({trades.filter((t) => t.direction === "LONG").length})
        </button>
        <button
          onClick={() => { setFilterDir((v) => (v === "SHORT" ? "" : "SHORT")); }}
          className={cn("px-2.5 py-1 rounded-full border transition-all font-semibold shrink-0", filterDir === "SHORT" ? "bg-loss/20 text-loss border-loss/40" : "border-border bg-surface-2/40 text-foreground-muted hover:text-foreground")}
        >
          ▼ Shorts ({trades.filter((t) => t.direction === "SHORT").length})
        </button>
      </div>

      {/* Search & Select Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
          <Input
            placeholder="Search symbol, setup, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterDir}
          onChange={(e) => setFilterDir(e.target.value)}
          className="w-auto"
        >
          <option value="">All directions</option>
          <option value="LONG">Long</option>
          <option value="SHORT">Short</option>
        </Select>
        <Select
          value={filterSetup}
          onChange={(e) => setFilterSetup(e.target.value)}
          className="w-auto"
        >
          <option value="">All setups</option>
          {setups.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={filterSession}
          onChange={(e) => setFilterSession(e.target.value)}
          className="w-auto"
        >
          <option value="">All sessions</option>
          <option value="Asia">Asia</option>
          <option value="London">London</option>
          <option value="New York">New York</option>
          <option value="Other">Other</option>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 text-xs uppercase tracking-wider text-foreground-subtle">
                <Th onClick={() => toggleSort("symbol")} active={sortKey === "symbol"}>
                  Symbol
                </Th>
                <Th>Dir</Th>
                <Th onClick={() => toggleSort("setup")} active={sortKey === "setup"}>
                  Setup
                </Th>
                <Th>Session</Th>
                <th className="text-right font-medium px-3 py-2.5">Entry</th>
                <th className="text-right font-medium px-3 py-2.5">Exit</th>
                <Th onClick={() => toggleSort("r_multiple")} active={sortKey === "r_multiple"} align="right">
                  R
                </Th>
                <Th onClick={() => toggleSort("pnl")} active={sortKey === "pnl"} align="right">
                  P&L
                </Th>
                <Th onClick={() => toggleSort("entry_time")} active={sortKey === "entry_time"}>
                  Date
                </Th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setViewing(t)}
                  className="border-t border-border hover:bg-surface-2/50 transition-colors group cursor-pointer"
                >
                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-foreground">{t.symbol}</span>
                      {t.account_id && accountMap.has(t.account_id) && (
                        <span className="text-[9px] font-mono font-medium text-brand">
                          {accountMap.get(t.account_id)!.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      variant={t.direction === "LONG" ? "profit" : "loss"}
                      className="text-[10px]"
                    >
                      {t.direction === "LONG" ? (
                        <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                      )}
                      {t.direction}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-foreground-muted">
                    {t.setup ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-foreground-muted">
                    {t.session ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-right tabular text-foreground-muted">
                    {t.entry_price?.toFixed(2) ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-right tabular text-foreground-muted">
                    {t.exit_price?.toFixed(2) ?? "—"}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 text-right tabular font-medium",
                      (t.r_multiple ?? 0) >= 0 ? "text-profit" : "text-loss",
                    )}
                  >
                    {t.r_multiple != null
                      ? `${t.r_multiple > 0 ? "+" : ""}${t.r_multiple.toFixed(1)}R`
                      : "—"}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 text-right tabular font-semibold",
                      (t.pnl ?? 0) > 0 && "text-profit",
                      (t.pnl ?? 0) < 0 && "text-loss",
                      t.pnl == null && "text-foreground-subtle",
                    )}
                  >
                    {t.pnl != null ? formatCurrency(t.pnl, { sign: true }) : "—"}
                  </td>
                  <td className="px-3 py-3 text-foreground-subtle text-xs">
                    {timeAgo(t.entry_time)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditing(t); }}
                        className="p-1.5 rounded hover:bg-surface-3 text-foreground-subtle hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(t); }}
                        className="p-1.5 rounded hover:bg-loss/10 text-foreground-subtle hover:text-loss"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade detail drawer */}
      <TradeDetailDrawer
        trade={viewing}
        onClose={() => setViewing(null)}
        onEdit={(t) => { setViewing(null); setEditing(t); }}
        onDelete={(t) => { setViewing(null); setConfirmDelete(t); }}
      />

      {/* Edit modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Trade"
        className="max-w-2xl"
      >
        {editing && (
          <TradeForm
            initial={editing}
            tradeId={editing.id}
            onSaved={() => {
              setEditing(null);
              onChanged?.();
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete trade?"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            This will permanently delete your{" "}
            <span className="font-semibold text-foreground">
              {confirmDelete?.symbol}
            </span>{" "}
            trade from{" "}
            <span className="font-semibold text-foreground">
              {confirmDelete && timeAgo(confirmDelete.entry_time)}
            </span>
            . This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  align = "left",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  align?: "left" | "right";
}) {
  return (
    <th className={cn("px-3 py-2.5 font-medium", align === "right" && "text-right")}>
      {onClick ? (
        <button
          onClick={onClick}
          className={cn(
            "inline-flex items-center gap-1 hover:text-foreground transition-colors",
            active && "text-foreground",
          )}
        >
          {children}
          <ArrowUpDown className="w-3 h-3 opacity-60" />
        </button>
      ) : (
        children
      )}
    </th>
  );
}
