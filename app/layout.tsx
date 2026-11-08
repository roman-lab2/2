import type { Metadata, Viewport } from "next";
import { Header, Footer } from "@/components/chrome";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    "https://autera-moscow-demo-nov8.pinknectarine2.chatgpt.site",
  ),
  title: {
    default: "AUTERA — автосервис в Москве",
    template: "%s · AUTERA",
  },
  description:
    "Демонстрационный автосервис в Москве. Диагностика, обслуживание и ремонт. Онлайн-запись на свободное время без регистрации.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#edf5fb",
  colorScheme: "light",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <a href="#main" className="skip-link">
          Перейти к содержимому
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
