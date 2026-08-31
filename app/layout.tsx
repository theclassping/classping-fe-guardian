import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "ClassPing Guardian",
    template: "%s · ClassPing Guardian",
  },
  description:
    "Portal wali murid untuk mengikuti aktivitas, perkembangan, dan administrasi sekolah anak.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
