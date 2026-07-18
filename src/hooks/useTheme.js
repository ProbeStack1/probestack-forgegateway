import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useTheme = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard");
  
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage, default to 'dark'
    const savedTheme = localStorage.getItem("theme");
    return savedTheme || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Only apply theme if on dashboard pages
    if (isDashboard) {
      if (theme === "light") {
        root.classList.add("light");
        root.classList.remove("dark");
      } else {
        root.classList.add("dark");
        root.classList.remove("light");
      }
      // Save to localStorage
      localStorage.setItem("theme", theme);
    } else {
      // Frontend pages always use dark mode
      root.classList.add("dark");
      root.classList.remove("light");
    }
  }, [theme, isDashboard]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme };
};

