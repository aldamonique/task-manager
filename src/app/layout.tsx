import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header/app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Manager",
  description: "Create, organize, and track tasks.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};
// The root layout provides the document structure shared by every page.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
