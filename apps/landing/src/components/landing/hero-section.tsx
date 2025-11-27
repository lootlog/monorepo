import Link from "next/link";
import { Download, BookOpen } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { ADDON_URL } from "@/src/config/addon";

export function HeroSection() {
  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
        Przejmij pełną kontrolę nad <br />
        <span className="text-primary">Legendami i Respami</span>
      </h1>

      <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
        Lootlog to open-source&apos;owe centrum dowodzenia dla graczy Margonem.
        Synchronizowane timery, historia łupów klanowych i zaawansowana analiza
        walk w jednym miejscu.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 pt-2">
        <Button
          size="lg"
          className="h-12 px-8 text-base shadow-[0_0_20px_-5px_hsl(var(--primary))]"
          asChild
        >
          <a href={ADDON_URL} target="_blank" rel="noopener noreferrer">
            <Download className="w-4 h-4 mr-2" />
            Zainstaluj Dodatek
          </a>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-12 px-8 text-base"
          asChild
        >
          <Link href="/docs">
            <BookOpen className="w-4 h-4 mr-2" />
            Dokumentacja
          </Link>
        </Button>
      </div>
    </div>
  );
}
