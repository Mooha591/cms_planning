import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "kyzenday:theme";
const TEXT_SIZE_KEY = "kyzenday:text-size";

// Taille de base en px selon le réglage (Tailwind utilise des rem, donc tout
// l'app grandit/rétrécit proportionnellement).
const TEXT_SIZES = { petit: 15, normal: 16, grand: 18, "très grand": 20 };

// Thème initial : préférence mémorisée, sinon préférence système
function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // stockage indisponible : on retombe sur la préférence système
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialTextSize() {
  try {
    const stored = localStorage.getItem(TEXT_SIZE_KEY);
    if (stored && TEXT_SIZES[stored]) return stored;
  } catch {
    // stockage indisponible
  }
  return "normal";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [textSize, setTextSizeState] = useState(getInitialTextSize);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // stockage indisponible : le choix ne sera juste pas mémorisé
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${TEXT_SIZES[textSize] || 16}px`;
    try {
      localStorage.setItem(TEXT_SIZE_KEY, textSize);
    } catch {
      // stockage indisponible : le choix ne sera juste pas mémorisé
    }
  }, [textSize]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  function setTextSize(size) {
    if (TEXT_SIZES[size]) setTextSizeState(size);
  }

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, textSize, setTextSize, textSizes: Object.keys(TEXT_SIZES) }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme doit être utilisé dans un <ThemeProvider>");
  }
  return ctx;
}
