import type { Metadata, Viewport } from "next";
import { JarvixSettingsProvider } from "@/components/providers/JarvixSettingsProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { UpdateBanner } from "@/components/layout/UpdateBanner";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Jarvix OS",
  description: "Your personal AI command center",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#120f0b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <JarvixSettingsProvider>{children}</JarvixSettingsProvider>
          <UpdateBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
