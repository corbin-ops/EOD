import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Dew Claw EOD Dashboard",
  description: "Password-protected daily dashboard for Dew Claw end-of-day reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
