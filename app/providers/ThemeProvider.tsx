"use client";

import { createContext, useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

export const ThemeContext = createContext<any>(null);

export default function ThemeProvider({ children }: any) {
  const [theme, setTheme] = useState("light");

  // Load stored preference or system theme
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle(
        "dark",
        saved === "dark"
      );
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

      setTheme(prefersDark ? "dark" : "light");
      document.documentElement.classList.toggle(
        "dark",
        prefersDark
      );
    }
  }, []);

  function toggleTheme() {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle(
      "dark",
      newTheme === "dark"
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}

      {/* GLOBAL TOASTER */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2500,
          style: { borderRadius: "10px" },
        }}
      />
    </ThemeContext.Provider>
  );
}