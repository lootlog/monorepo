import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Separator } from "@lootlog/ui/components/separator";
import { ChevronRight, Clock, Shield, Sword, Users } from "lucide-react";

const battles = [
  {
    id: 1,
    result: "win",
    damage: 3240,
    duration: "2m 34s",
    time: "5 min temu",
    map: "Sala Tronowa",
    battleType: "3v3",
    myTeam: [
      { name: "Ty", level: 87, class: "Wojownik", isPlayer: true },
      { name: "MagicHealer", level: 85, class: "Paladyn" },
      { name: "StealthRogue", level: 86, class: "Łowca" },
    ],
    enemyTeam: [
      { name: "DragonSlayer99", level: 89, class: "Paladyn" },
      { name: "DarkMage", level: 88, class: "Mag" },
      { name: "BeastTamer", level: 87, class: "Łowca" },
    ],
  },
  {
    id: 2,
    result: "loss",
    damage: 2890,
    duration: "4m 12s",
    time: "12 min temu",
    map: "Sala Zrujnowanej Świątyni",
    battleType: "5v5",
    myTeam: [
      { name: "Ty", level: 87, class: "Wojownik", isPlayer: true },
      { name: "HolyPriest", level: 90, class: "Paladyn" },
      { name: "FireMage", level: 88, class: "Mag" },
      { name: "ShadowAssassin", level: 89, class: "Łowca" },
      { name: "IronTank", level: 91, class: "Paladyn" },
    ],
    enemyTeam: [
      { name: "ShadowMaster", level: 92, class: "Tropiciel" },
      { name: "IceQueen", level: 90, class: "Mag" },
      { name: "BloodKnight", level: 91, class: "Wojownik" },
      { name: "VenomStrike", level: 89, class: "Łowca" },
      { name: "StormCaller", level: 88, class: "Tancerz Ostrzy" },
    ],
  },
  {
    id: 3,
    result: "win",
    damage: 3580,
    duration: "1m 58s",
    time: "18 min temu",
    map: "Sala Zrujnowanej Świątyni",
    battleType: "1v1",
    myTeam: [{ name: "Ty", level: 87, class: "Wojownik", isPlayer: true }],
    enemyTeam: [{ name: "FireWizard", level: 85, class: "Mag" }],
  },
  {
    id: 4,
    result: "win",
    damage: 2950,
    duration: "3m 45s",
    time: "25 min temu",
    map: "Sala Tronowa",
    battleType: "2v2",
    myTeam: [
      { name: "Ty", level: 87, class: "Wojownik", isPlayer: true },
      { name: "LightBringer", level: 86, class: "Paladyn" },
    ],
    enemyTeam: [
      { name: "StormRider", level: 88, class: "Paladyn" },
      { name: "WindWalker", level: 87, class: "Wojownik" },
    ],
  },
];

function TeamDisplay({
  team,
  isEnemyTeam = false,
}: {
  team: (typeof battles)[0]["myTeam"];
  isEnemyTeam?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {team.map((member, index) => (
        <div
          key={index}
          className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={`/diverse-gaming-avatars.png?height=24&width=24&query=${member.name}+${member.class}`}
            />
            <AvatarFallback className="text-xs">
              {member.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-xs">
            <div
              className={`font-medium ${member.isPlayer ? "text-green-500" : ""}`}
            >
              {member.name}
            </div>
            <div className="text-muted-foreground">
              {member.class} {member.level}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecentBattles() {
  return (
    <div className="flex flex-col">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">Ostatnie walki</h2>
            <p className="text-muted-foreground text-sm">
              Twoje ostatnie walki
            </p>
          </div>
          <Button variant="outline" size="sm">
            Zobacz wszystkie
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
      <Separator />
      <div>
        <div>
          {battles.map((battle) => (
            <div
              key={battle.id}
              className="border-b p-4 pb-4 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge
                    variant={battle.result === "win" ? "green" : "destructive"}
                    // className={
                    //   battle.result === "win"
                    //     ? "bg-primary/10 text-primary hover:bg-primary/20"
                    //     : "bg-muted text-muted-foreground"
                    // }
                  >
                    {battle.result === "win" ? "Wygrana" : "Przegrana"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {battle.battleType}
                  </Badge>
                  <span className="text-sm font-medium">{battle.map}</span>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>{battle.time}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-500">
                      <Sword className="h-4 w-4" />
                      Twoja drużyna
                    </div>
                    <TeamDisplay team={battle.myTeam} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                      <Sword className="h-4 w-4" />
                      Przeciwnicy
                    </div>
                    <TeamDisplay team={battle.enemyTeam} isEnemyTeam />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {battle.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {battle.battleType}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
