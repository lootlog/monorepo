interface TestimonialCardProps {
  role: string;
  desc: string;
  avatar: string;
}

function TestimonialCard({ role, desc, avatar }: TestimonialCardProps) {
  return (
    <div className="flex flex-col p-4 rounded-lg border border-border bg-card/50">
      <div className="flex items-center gap-3 mb-3">
        <img
          src={avatar}
          alt={role}
          className="h-10 w-10 rounded-full shrink-0 border border-border object-cover"
        />
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">
          {role}
        </div>
      </div>
      <div className="text-sm text-muted-foreground italic">
        &quot;{desc}&quot;
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-bold text-xl tracking-tight">Legitne Opinie</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TestimonialCard
          avatar="https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=000000"
          role="Lider Klanu"
          desc="To gówno wytwarza jakąś magiczną barierę wokół mojego pokoju, nie mogę się oderwać od Margonem."
        />
        <TestimonialCard
          avatar="https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=000000"
          role="Taktyk"
          desc="Analiza walk pokazała, że mag wymaga nerfa, a łowca jest zbyt słaby."
        />
        <TestimonialCard
          avatar="https://api.dicebear.com/7.x/adventurer/svg?seed=Max&backgroundColor=000000"
          role="PvP Gracz"
          desc="Wszystko działa jak należy, ale byłoby fajnie, gdybyście dodali dźwięki powiadomień."
        />
      </div>
    </div>
  );
}
