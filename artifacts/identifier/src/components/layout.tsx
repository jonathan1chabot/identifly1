import { Link, useLocation } from "wouter";
import { ReactNode } from "react";
import { Telescope, History } from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105 active:scale-95">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
              <Telescope className="w-5 h-5" />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight">Identify Anything</span>
          </Link>
          
          <nav className="flex items-center gap-1">
            <Link 
              href="/" 
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                location === "/" 
                  ? "bg-secondary text-secondary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Identify
            </Link>
            <Link 
              href="/history" 
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${
                location === "/history" 
                  ? "bg-secondary text-secondary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <History className="w-4 h-4" />
              History
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
