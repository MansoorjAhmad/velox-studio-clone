"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // On mount — read from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("velox_theme") as "dark" | "light" | null;
    const initial = stored ?? "dark";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem("velox_theme", next);
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        "relative w-8 h-8 rounded-md flex items-center justify-center",
        "text-foreground-subtle hover:text-foreground hover:bg-surface-2",
        "transition-colors duration-150",
      )}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
}

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
}
