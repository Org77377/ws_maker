import { WorksheetApp } from "@/components/worksheet/worksheet-app";
import { GraduationCap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top navigation / header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:h-9 sm:w-9">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-bold tracking-tight text-primary sm:text-lg lg:text-xl">
                Worksheet Maker
              </h1>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Professional School Worksheet Generator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-[11px] font-medium text-foreground/80">
                Omkar RG
              </p>
              <p className="text-[10px] text-muted-foreground">
                Dept. of CS · Sharada Public School
              </p>
            </div>
            <span className="rounded-md border border-border bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
              A4
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-3 py-4 pb-40 sm:px-6 sm:py-6 lg:px-4 lg:pb-6">
          <WorksheetApp />
        </div>
      </main>

      {/* Footer credit — sticky to bottom */}
      <footer className="mt-auto border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-4 text-center sm:px-6">
          <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
            Designed &amp; Developed by{" "}
            <span className="font-semibold text-foreground">Omkar RG</span>
            {" · "}
            Dept. of CS{" · "}
            Sharada Public School
          </p>
        </div>
      </footer>
    </div>
  );
}
