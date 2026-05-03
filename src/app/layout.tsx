import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Sonara — AI Music Studio & DJ Console",
  description:
    "Compose, generate, separate stems, master, and DJ — all in one AI-powered studio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg font-sans text-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
