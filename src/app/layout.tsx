import type { Metadata } from "next";
import { Archivo, Chivo_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const chivoMono = Chivo_Mono({
  variable: "--font-chivo-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fichaje · Registro de horas",
  description:
    "Registro de horas trabajadas: nocturnas, complementarias, OCR de Orquest y nóminas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${archivo.variable} ${chivoMono.variable} dark h-full antialiased`}
      style={{ ["--font-sans" as string]: "var(--font-archivo)" }}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
