"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { chatWithAgent } from "@/lib/zenith/zenith-agent";
import { createTask } from "@/lib/tasks/actions";
import { createTrade } from "@/lib/journal/actions";
import { Sparkles, X, Send, Loader2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  loading?: boolean;
}

export function ZenithAgent() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "agent",
      text: "Hey! I'm your Velox Zenith Agent. Tell me about a trade, ask me to create a task, or describe your situation and I'll help you build a routine. What do you need?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimized]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    // Add user message
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);

    // Add loading placeholder
    const loadingId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: loadingId, role: "agent", text: "", loading: true },
    ]);

    // Build history for context
    const history = messages
      .filter((m) => !m.loading)
      .map((m) => ({ role: m.role, text: m.text }));

    const result = await chatWithAgent(text, history);

    // Replace loading placeholder with actual response
    setMessages((prev) =>
      prev.map((m) =>
        m.id === loadingId
          ? { ...m, text: result.text, loading: false }
          : m,
      ),
    );

    setSending(false);
  }, [input, sending, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Toggle between floating bubble and chat panel
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-14 h-14 rounded-full",
          "bg-brand flex items-center justify-center",
          "shadow-lg shadow-brand/25",
          "hover:shadow-xl hover:shadow-brand/30",
          "hover:scale-105 active:scale-95",
          "transition-all duration-200",
          "group",
        )}
        title="Zenith Agent"
      >
        <Sparkles className="w-6 h-6 text-white" />
        {/* Pulse ring animation */}
        <span className="absolute inset-0 rounded-full bg-brand animate-ping opacity-20" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        minimized ? "w-14 h-14" : "w-[380px] h-[520px]",
        "transition-all duration-300 ease-out",
      )}
    >
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="w-14 h-14 rounded-full bg-brand flex items-center justify-center shadow-lg shadow-brand/25 hover:scale-105 active:scale-95 transition-transform"
          title="Expand Zenith Agent"
        >
          <Sparkles className="w-6 h-6 text-white" />
        </button>
      ) : (
        <div className="flex flex-col h-full rounded-xl border border-border bg-surface shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-brand/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-brand" />
              </div>
              <div>
                <p className="text-sm font-semibold">Zenith Agent</p>
                <p className="text-[10px] text-foreground-subtle">
                  Velox Zenith AI assistant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setMinimized(true)}
                className="p-1.5 rounded hover:bg-surface-2 text-foreground-subtle hover:text-foreground transition-colors"
                title="Minimize"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-surface-2 text-foreground-subtle hover:text-foreground transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed",
                    msg.role === "user"
                      ? "bg-brand text-white rounded-br-sm"
                      : "bg-surface-2 text-foreground rounded-bl-sm",
                  )}
                >
                  {msg.loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-brand" />
                      <span className="text-foreground-subtle">Thinking...</span>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.text}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Input area */}
          <div className="border-t border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                disabled={sending}
                className={cn(
                  "flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm",
                  "placeholder:text-foreground-subtle",
                  "outline-none focus:border-brand focus:ring-1 focus:ring-brand/30",
                  "disabled:opacity-50",
                )}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                size="sm"
                className="shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-foreground-subtle/50 mt-1.5 text-center">
              Zenith Agent can help log trades, create tasks & build routines
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
