import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import { notificationService } from "@/services/notificationService";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize push notifications
    if (typeof window !== "undefined") {
      notificationService.initialize().catch(console.error);
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Component {...pageProps} />
      <Toaster />
    </ThemeProvider>
  );
}