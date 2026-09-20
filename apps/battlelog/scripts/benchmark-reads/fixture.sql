
CREATE TABLE battles(id text PRIMARY KEY,"userId" text,"characterId" text,world text,"createdAt" timestamp);
CREATE INDEX battles_user_created ON battles("userId","createdAt");
CREATE INDEX battles_user_world_created ON battles("userId",world,"createdAt");
CREATE INDEX battles_character_created ON battles("characterId","createdAt");
CREATE TABLE battle_warriors(id text PRIMARY KEY,"battleId" text,"originalId" text,name text,lvl integer,prof text,icon text,team integer);
CREATE INDEX warrior_name ON battle_warriors(name);
CREATE INDEX warrior_battle_original ON battle_warriors("battleId","originalId");
CREATE INDEX warrior_original_battle ON battle_warriors("originalId","battleId");
CREATE INDEX warrior_battle_team ON battle_warriors("battleId",team);
CREATE TABLE user_characters("userId" text,"characterId" text,world text);
CREATE UNIQUE INDEX characters_owner ON user_characters("userId","characterId",world);
INSERT INTO battles SELECT g::text, CASE WHEN g<=10000 THEN 'heavy' WHEN g<=10100 THEN 'small' ELSE 'other'||(g%100)::text END, (g%5)::text,'world'||(g%2)::text,'2026-01-01'::timestamp+g*interval '1 minute' FROM generate_series(1,100000) g;
INSERT INTO battle_warriors SELECT md5(b.id||'/'||s),b.id,CASE WHEN s=1 THEN b."characterId" ELSE (100+s)::text END,CASE WHEN s=1 THEN 'Hero'||b."characterId" WHEN s=2 THEN 'Rare-'||b.id ELSE 'Common'||((b.id::int+s)%100)::text END,100+b.id::int%200,'w','icon',s%2 FROM battles b CROSS JOIN generate_series(1,10) s;
INSERT INTO user_characters SELECT DISTINCT "userId","characterId",world FROM battles;
VACUUM ANALYZE;
