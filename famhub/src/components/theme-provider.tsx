"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Define a simpler ThemeProviderProps type
type ThemeProviderProps = {
  children: React.ReactNode;
  [key: string]: any; // Allow any other props to be passed through
};

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
