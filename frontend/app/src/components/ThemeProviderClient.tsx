'use client';

import React from 'react';
import { ThemeProvider, ToastProvider } from '@mp/dying';

export function ThemeProviderClient({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="oled" enableSystem>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
