import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pet Adviser",
  description: "複数ペット対応の健康記録アプリ",
};

import type { ReactNode } from "react";

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
