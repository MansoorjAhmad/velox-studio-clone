"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { chatWithAgent, type AgentAction, type ParsedTask, type ParsedTrade } from "@/lib/zenith/zenith-agent";
import { createTask } from "@/lib/tasks/actions";
import { createTrade } from "@/lib/journal/actions";
import { getActiveAccountId } from "@/lib/accounts/active-account";
import { Clock3, History, Loader2, Minimize2, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createConversation, deleteConversation, listConversations, loadConversationMessages, saveMessageToConversation, type Conversation } from "@/lib/zenith/history";

interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  loading?: boolean;
  action?: AgentAction;
  actionNote?: string;
}

const welcomeMessage = (): Message => ({ id: "welcome", role: "agent", text: "Hey! I'm your Velox Zenith Agent. Tell me about a trade, ask me to create a task, or describe your situation and I'll help you build a routine. What do you need?" });

function timeAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ZenithAgent() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshConversations = useCallback(async () => setConversations(await listConversations()), []);
  const startNewChat = useCallback(async () => {
    const id = await createConversation();
    if (!id) return;
    setConversationId(id);
    setMessages([welcomeMessage()]);
    setView("chat");
    await refreshConversations();
  }, [refreshConversations]);

  const openConversation = useCallback(async (id: string) => {
    const stored = await loadConversationMessages(id);
    setConversationId(id);
    setMessages(stored.length ? stored : [welcomeMessage()]);
    setView("chat");
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, view]);

  useEffect(() => {
    if (open && !minimized && view === "chat") setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, minimized, view]);

  useEffect(() => {
    if (!open || historyLoaded) return;
    void (async () => {
      const items = await listConversations();
      setConversations(items);
      if (items[0]) await openConversation(items[0].id);
      else await startNewChat();
      setHistoryLoaded(true);
    })();
  }, [open, historyLoaded, openConversation, startNewChat]);

  const updateMessage = (id: string, update: Partial<Message>) => setMessages((current) => current.map((message) => message.id === id ? { ...message, ...update } : message));
  const handleActionConfirmed = (id: string, note: string) => updateMessage(id, { action: undefined, actionNote: note });
  const handleActionError = (id: string, error: string) => updateMessage(id, { action: undefined, actionNote: `Couldn't save: ${error}` });
  const handleDismissAction = (id: string) => updateMessage(id, { action: undefined, actionNote: "Dismissed." });

  const handleConfirmTrade = async (id: string, data: ParsedTrade) => {
    const session = ["Asia", "London", "New York", "Other"].includes(data.session ?? "") ? data.session as "Asia" | "London" | "New York" | "Other" : null;
    const result = await createTrade({
      symbol: data.symbol, direction: data.direction, entry_price: data.entry_price ?? 0,
      stop_loss: data.stop_loss, take_profit: data.take_profit, exit_price: data.exit_price,
      pnl: data.pnl, setup: data.setup, session, entry_time: new Date().toISOString(),
      exit_time: data.exit_price != null ? new Date().toISOString() : null,
      quantity: 0, r_multiple: null, mae: null, mfe: null, market_condition: null,
      confidence: null, emotion_before: null, emotion_after: null, mistakes: null,
      partials: null, confluences: null, notes: "Logged by Zenith", status: data.exit_price != null ? "closed" : "open",
      account_id: getActiveAccountId() === "all" ? null : getActiveAccountId(),
    });
    if (result.error) handleActionError(id, result.error); else handleActionConfirmed(id, "Trade logged.");
  };

  const handleConfirmTask = async (id: string, data: ParsedTask) => {
    const result = await createTask({ title: data.title, priority: data.priority, category: data.category, due_date: data.due_date });
    if (result.error) handleActionError(id, result.error); else handleActionConfirmed(id, "Task created.");
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !conversationId) return;
    setInput(""); setSending(true);
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text };
    setMessages((current) => [...current, userMsg]);
    void saveMessageToConversation(conversationId, "user", text);
    const loadingId = crypto.randomUUID();
    setMessages((current) => [...current, { id: loadingId, role: "agent", text: "", loading: true }]);
    const history = messages.filter((message) => !message.loading).map((message) => ({ role: message.role, text: message.text }));
    const result = await chatWithAgent(text, history);
    setMessages((current) => current.map((message) => message.id === loadingId ? { ...message, text: result.text, loading: false, action: result.action } : message));
    void saveMessageToConversation(conversationId, "agent", result.text);
    void refreshConversations();
    setSending(false);
  }, [conversationId, input, messages, refreshConversations, sending]);

  const handleDeleteConversation = async (id: string) => {
    if (!window.confirm("Delete this conversation and all its messages? This cannot be undone.")) return;
    await deleteConversation(id);
    const remaining = conversations.filter((conversation) => conversation.id !== id);
    setConversations(remaining);
    if (id === conversationId) {
      setConversationId(null);
      await startNewChat();
    }
  };

  if (!open) return <button onClick={() => setOpen(true)} className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-brand flex items-center justify-center shadow-lg shadow-brand/25 hover:scale-105 active:scale-95 transition-all md:bottom-6 md:right-6" title="Zenith Agent"><Sparkles className="w-6 h-6 text-white" /></button>;

  return <div className={cn("fixed bottom-20 right-4 z-50 transition-all duration-300 ease-out md:bottom-6 md:right-6", minimized ? "w-14 h-14" : "w-[calc(100vw-2rem)] max-w-[380px] h-[min(520px,calc(100svh-7rem))]")}>{minimized ? <button onClick={() => setMinimized(false)} className="w-14 h-14 rounded-full bg-brand flex items-center justify-center shadow-lg"><Sparkles className="w-6 h-6 text-white" /></button> : <div className="flex flex-col h-full rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-brand/5"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center"><Sparkles className="w-4 h-4 text-brand" /></div><div><p className="text-sm font-semibold">Zenith Agent</p><p className="text-[10px] text-foreground-subtle">Velox Zenith AI assistant</p></div></div><div className="flex items-center gap-0.5"><button onClick={() => { void refreshConversations(); setView(view === "chat" ? "history" : "chat"); }} className="p-1.5 rounded hover:bg-surface-2 text-foreground-subtle" title="Chat history"><History className="w-3.5 h-3.5" /></button><button onClick={() => void startNewChat()} className="p-1.5 rounded hover:bg-surface-2 text-foreground-subtle" title="New chat"><Plus className="w-3.5 h-3.5" /></button><button onClick={() => setMinimized(true)} className="p-1.5 rounded hover:bg-surface-2 text-foreground-subtle" title="Minimize"><Minimize2 className="w-3.5 h-3.5" /></button><button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-surface-2 text-foreground-subtle" title="Close"><X className="w-3.5 h-3.5" /></button></div></div>
    {view === "history" ? <div className="flex-1 overflow-y-auto p-3 space-y-1"><Button size="sm" className="w-full mb-2" onClick={() => void startNewChat()}><Plus className="w-3.5 h-3.5 mr-1" />New chat</Button>{conversations.length === 0 ? <p className="p-4 text-sm text-center text-foreground-subtle">No conversations yet.</p> : conversations.map((conversation) => <div key={conversation.id} className="flex items-center gap-1 rounded-lg hover:bg-surface-2"><button className="flex-1 min-w-0 text-left px-3 py-2.5" onClick={() => void openConversation(conversation.id)}><p className="truncate text-xs font-medium text-foreground">{conversation.title}</p><p className="flex items-center gap-1 text-[10px] text-foreground-subtle mt-0.5"><Clock3 className="w-3 h-3" />{timeAgo(conversation.updated_at)} ago</p></button><button className="p-2 text-foreground-subtle hover:text-loss" onClick={() => void handleDeleteConversation(conversation.id)} title="Delete conversation"><Trash2 className="w-3.5 h-3.5" /></button></div>)}</div> : <><div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">{messages.map((message) => <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}><div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed", message.role === "user" ? "bg-brand text-white rounded-br-sm" : "bg-surface-2 text-foreground rounded-bl-sm")}>{message.loading ? <div className="flex gap-2"><Loader2 className="w-3 h-3 animate-spin text-brand" /><span className="text-foreground-subtle">Thinking...</span></div> : <><span className="whitespace-pre-wrap">{message.text}</span>{message.action?.type === "trade" && <div className="mt-2 border border-border rounded-lg p-3 space-y-2"><p className="text-xs font-medium text-foreground-muted">Log this trade?</p><div className="text-[12px] space-y-0.5"><div>{message.action.data.symbol} · {message.action.data.direction}</div>{message.action.data.entry_price != null && <div>Entry: {message.action.data.entry_price}</div>}{message.action.data.pnl != null && <div>P&amp;L: {message.action.data.pnl}</div>}</div><div className="flex gap-2"><Button size="sm" onClick={() => void handleConfirmTrade(message.id, (message.action as { data: ParsedTrade }).data)}>Confirm</Button><Button size="sm" variant="ghost" onClick={() => handleDismissAction(message.id)}>Dismiss</Button></div></div>}{message.action?.type === "task" && <div className="mt-2 border border-border rounded-lg p-3 space-y-2"><p className="text-xs font-medium text-foreground-muted">Create this task?</p><div className="text-[12px]">{message.action.data.title} · {message.action.data.priority} · {message.action.data.category}</div><div className="flex gap-2"><Button size="sm" onClick={() => void handleConfirmTask(message.id, (message.action as { data: ParsedTask }).data)}>Confirm</Button><Button size="sm" variant="ghost" onClick={() => handleDismissAction(message.id)}>Dismiss</Button></div></div>}{message.actionNote && <p className="mt-2 text-xs text-foreground-muted">{message.actionNote}</p>}</>}</div></div>)}</div><div className="border-t border-border px-3 py-2.5"><div className="flex items-center gap-2"><input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSend(); } }} placeholder="Ask me anything..." disabled={sending || !conversationId} className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50" /><Button onClick={() => void handleSend()} disabled={!input.trim() || sending || !conversationId} size="sm">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button></div></div></>}
  </div>}</div>;
}
