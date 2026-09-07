import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pomodoro Library",
  description: "Gamified cozy pomodoro library workspace.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="tr">
    <body>{children}</body>
  </html>
);

export default RootLayout;
