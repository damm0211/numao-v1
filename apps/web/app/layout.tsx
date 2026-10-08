import './globals.css';
import NotificationBell from './NotificationBell';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}<NotificationBell /></body>
    </html>
  );
}

