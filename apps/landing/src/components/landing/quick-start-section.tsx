import { ArrowRight } from "lucide-react";

interface StepNodeProps {
  number: string;
  title: string;
  description: React.ReactNode;
}

function StepNode({ number, title, description }: StepNodeProps) {
  return (
    <div className="flex flex-col items-center text-center group relative z-10">
      <div className="w-12 h-12 rounded-full bg-background border-2 border-primary flex items-center justify-center text-primary font-bold text-base group-hover:bg-primary group-hover:text-white transition-all shadow-[0_0_12px_hsl(var(--primary)/0.4)]">
        {number}
      </div>

      <div className="mt-3 space-y-1">
        <h4 className="font-bold text-sm text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function QuickStartSection() {
  return (
    <div>
      <h3 className="font-bold text-xl tracking-tight mb-8">Szybki Start</h3>

      <div className="relative">
        <div className="flex justify-end mb-4">
          <a
            href="https://docs.lootlog.pl"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Pełna instrukcja <ArrowRight className="w-3 h-3" />
          </a>
        </div>

        <div className="relative flex items-start justify-between">
          <div className="absolute top-6 left-6 right-6 h-[2px] bg-border" />

          <StepNode
            number="1"
            title="Pobierz"
            description={
              <>
                Wtyczka do przeglądarki
                <br />
                <span className="text-muted-foreground/70">
                  (Wymaga Tampermonkey)
                </span>
              </>
            }
          />
          <StepNode
            number="2"
            title="Zaloguj się"
            description="Autoryzacja Discordem"
          />
          <StepNode
            number="3"
            title="Graj"
            description="Logi zbierają się w tle"
          />
          <StepNode
            number="4"
            title="Analizuj"
            description="Dostęp do panelu lootloga"
          />
        </div>
      </div>
    </div>
  );
}
