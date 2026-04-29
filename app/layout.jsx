export const metadata = {
  title: "ListaInno",
  description: "Lista de presença com assinatura digital e salvamento online",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-180.png"
  }
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
