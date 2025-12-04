"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "pink";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      setTheme("dark");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark", "pink");
    
    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else if (theme === "pink") {
      root.classList.add("pink");
      // Pink mode uses light color scheme for browser UI elements
      root.style.colorScheme = "light";
    } else {
      root.classList.add("light");
      root.style.colorScheme = "light";
    }
    
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    // If in pink mode, toggle reverts to dark/light cycle (starting with light usually, or dark)
    // Let's make it toggle between light/dark, exiting pink mode.
    setTheme((prev) => {
        if (prev === "pink") return "dark";
        return prev === "light" ? "dark" : "light";
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
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
