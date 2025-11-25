"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (storedTheme) {
      setTheme(storedTheme);
    } else if (prefersDark) {
      setTheme("dark");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
      root.style.colorScheme = "light";
    }
    
    if (theme === "dark") {
      root.style.colorScheme = "dark";
    }
    
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Prevent hydration mismatch by rendering nothing until mounted
  // Or render children but without specific theme classes if critical
  // For this app, rendering children is fine, the effect will kick in fast.
  // But to avoid flash, we might want to hide until mounted? 
  // Let's just render children. The effect handles the class.
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
