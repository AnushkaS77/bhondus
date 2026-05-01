import { Fredoka } from "next/font/google";
import "./globals.css";
import MainMenu from "@/components/mainmenu";
import { AuthProvider } from "@/context/auth";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

export const metadata = {
  title: "Story Tailor",
  description: "Generate kids books using AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${fredoka.variable} antialiased`}>
        <AuthProvider>
          <MainMenu />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
