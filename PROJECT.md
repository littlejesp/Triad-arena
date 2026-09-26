# Triad Arena — projektdokument

> Läs det här dokumentet först i en ny session. Det är den primära kontexten —
> börja inte om från noll, fortsätt där vi slutade.

## 1. Kort sammanfattning

Ett webbaserat 1v1-kortspel i Triple-Triad-stil: ett 3×3-bräde, du (blå) mot en
AI-motståndare ("Forest", röd). Kort har fyra sidor (upp/höger/ner/vänster).
När du placerar ett kort jämförs dess sidor mot angränsande fiendekort — vinner
din sida flippas fienden till din färg. Flest rutor när brädet är fullt vinner.

Hela spelet är **en enda fil**, `index.html` (~4 200 rader): HTML-skal, all CSS
i en `<style>`-tagg, all JS i en `<script>`-tagg. Inga byggsteg, inga npm-paket,
inget ramverk. Öppnas direkt i webbläsaren eller serveras som valfri statisk
fil (t.ex. GitHub Pages).

## 1b. Nuvarande status (läs detta först — kort version av allt nedan)

**Punkt 1–14 är MERGADE till `main`** (användaren bekräftade explicit,
åtta gånger nu — senast "Merga allt till main" för punkt 13–14,
info-modalens layout + rond-klockan breddad till 4 ticks). Punkt 15–21
(Ancient Wyrmkings ultimate + Weight of Ages, Little Jesps, Sylvarions,
Dariens, Fereas och Elaras fullständiga om/nybyggnader, inklusive ny
kortkonst för alla sex) är sedan dess MERGADE till `main` också.
Punkt 22–24 (Vayra, Aurelian och Vorlix fullständiga om/nybyggnader,
inklusive ny kortkonst och Aurelians Skybreaker-fix) är sedan dess
MERGADE till `main` också. Punkt 25–28 (Ysara, Torn, Graff och
Voidqueen ombyggda, all kortkonst inkluderad) är sedan dess MERGADE
till `main` också. **Punkt 29–40 (Sarah, Deathblade, Lyrith, Aurelia,
Twisted Gipsy, Astrael, Vaelira, Nexzoth, Kaeldryx, Bahamut, Seraphine
och Nyxara — alla fullständigt klara, all kortkonst inkluderad) är
sedan dess MERGADE till `main` också** (användaren bekräftade explicit
"Merga till main" efter att Nexzoths sista två skills (Reality
Consume, Endless Void) fått sin nya motorlogik). Fråga alltid
explicit innan nästa merge när mer arbete samlats där, anta ALDRIG
tillstånd från en tidigare bekräftelse.

**Punkt 41–49 (Zaevir, Ragnar, Maximus, Darum, Daron, Vorathos, Pallispell,
Templaren, Tilda) är sedan dess MERGADE till `main` också** (användaren
bekräftade explicit "Merga nu"). Fråga alltid explicit innan nästa merge
när mer arbete samlats där, anta ALDRIG tillstånd från en tidigare
bekräftelse.

**Punkt 50 (Tahabata, HELT klar — 6/6 skills, Inferno Dominion-
konflikten löst med "kombinera", ny konst inlagd) samt den nya
persistenta buff/debuff-visningen på brädet är sedan dess MERGADE till
`main` också** (användaren bekräftade explicit "merga nu"). Fråga
alltid explicit innan nästa merge när mer arbete samlats där, anta
ALDRIG tillstånd från en tidigare bekräftelse.

**Punkt 51 (Pallis, solo — 5/5 skills, Loyal Instinct struken, ny konst
inlagd) samt punkt 52 (Ifrit, Hellfire Claw + Burning Dominion
tillagda, ny konst inlagd) är sedan dess MERGADE till `main` också**
(användaren bekräftade explicit "merga nu"). Fråga alltid explicit
innan nästa merge när mer arbete samlats där, anta ALDRIG tillstånd
från en tidigare bekräftelse.

**NY 16-korts audit-lista (2026-09-16)** — till skillnad från den
ursprungliga 68-korts Tier-auditen (som ALDRIG sparades här, ett
misstag vi inte upprepar), är den här listan sparad för framtida
sessioner. En bakgrundsagent gick igenom HELA rostret (utom de ~35
korten som redan var åtgärdade vid det laget) och hittade 16 kort med
"tysta" luckor (skills utan egen "Flavor only"-disclaimer som ändå
saknar kod-backing), sämst kopplade först:
1. **Zaevir** 0/4 — KLAR (punkt 41 nedan).
2. **Ragnar** 0/4 — KLAR (punkt 42 nedan).
3. **Maximus** 1/6 — KLAR (punkt 43 nedan).
4. **Darum** 1/6 — KLAR (punkt 44 nedan).
5. **Daron** 1/6 — KLAR (punkt 45 nedan).
6. **Vorathos** 1/5 — KLAR (punkt 46 nedan).
7. **Pallispell** 1/5 — KLAR (punkt 47 nedan).
8. **Templaren** 1/4 — KLAR (punkt 48 nedan, medvetet 3/4 — se nedan).
9. **Tilda** 1/4 — KLAR (punkt 49 nedan).
10. **Tahabata** 2/6 — KLAR (punkt 50 nedan, 6/6).
11. **Pallis** (solo) 2/6 — KLAR (punkt 51 nedan, 5/5 efter att Loyal
    Instinct medvetet ströks).
12. **Ifrit** 2/6 — KLAR (punkt 52 nedan, inkl. Volcanic Armor).
13. **Evil Twist Yang** 2/4 — KLAR (punkt 53 nedan, 4/4).
14. **Evil Twist Yin** 2/4 — KLAR (punkt 53 nedan, mirrorar Yang).
15. **Twin Brothers** 4/6 — KLAR (Fas 34 nedan, 6/6).
16. **Twin Sisters** 4/6 — KLAR (Fas 34 nedan, mirrorar Brothers).

Redan kontrollerade och bekräftat HELT rena (inga tysta luckor):
Celestial Judgment, Infinite Seraph, Fenrir, Tiamat, Odin, Yojimbo,
Chocobo King, Morvath, Vorgrath, Zalazar, samt enkla 1-skill-mobs
(Shadowking, Harpy, Lich, Wyrm, Revenant, Wendigo). Direbear/Ogre har
inga skills alls (statlösa fyllnadsmobs, inget att åtgärda).

**29. Sarah ombyggd (Aion's Last Light)** — ursprungligen bedömd 🟡
POLISH i auditen, men samma missbedömning som Graff/Voidqueen: bara 1
av 4 skills hade backing (Light Shield, `active.shield`), och hon
saknade Ultimate helt. Personlig betydelse för användaren — "Aion's
Last Light" är en hyllning till deras bästa karaktär från spelet Aion,
INTE en lore-lucka att fylla — behölls uttryckligen orörd, ingen ny
tolkning påklistrad.

- **Light Shield (Passiv)** — HELT oförändrad (`active.shield:true`).
- **Feared Huntress (Passiv)** — PROPOSAL, helt befintligt fält:
  `active.vsStrongerTotalPowerBoost:{amount:3}`, samma fält Yojimbo/
  Ysara redan använder.
- **Special Attack: "Aion's Last Light"** — hennes FÖRSTA Ultimate
  någonsin, ny `SPECIAL_HANDLERS.sarah`, byggd i exakt samma form som
  Vayras Eclipse/Ysaras Eternal Eclipse (total-power-tröskel +3, permanent
  +1 alla sidor på vinst via `attackBoost`) — fjärde kortet med detta
  mönster nu, inget nytt uppfunnet.

Bort: Shadow Step, Direction Focus, Last Arrow — alla flavor-only, Last
Arrow redundant mot den globala `lastStandBonus()`.

Ny kortkonst höll sig medvetet nära hennes redan existerande bild
(samma siluett, färgpalett, ställning) snarare än en ny tolkning, med
snöflingedetaljer tillagda i klänningen som efterfrågat.

Ett nytt permanent test i `tests/game.test.mjs` (62 totalt, alla gröna,
grönt på första körningen) verifierar: stats/element orörda, Light
Shield orörd, Feared Huntress bara mot starkare mål, och Aion's Last
Light erövrar/buffar på vinst men misslyckas mot ett mål vars
totalstyrka överstiger tröskeln.

**30. Deathblade ombyggd (Executioner)** — ursprungligen bedömd 🟡
POLISH i auditen, men samma missbedömning som Graff/Voidqueen/Sarah:
bara Ultimaten (Shadow Assault) hade backing, alla fem övriga skills
saknade. Den godkända kortkonsten förenklade henne själv till bara tre
skills (Night's Veil, Executioner, Shadow Assault) — Silent Hunter,
Shadow Mastery och Nightstalker ströks helt från det tryckta kortet,
så kortdatan matchar nu bilden exakt istället för det bredare utkastet.

- **Night's Veil (Passiv)** — HELT oförändrad (`active.shield:true`).
- **Executioner (Passiv)** — NY primitive `active.onWinDestroyIfLoserWeak:
  {maxTotal:6}` + motsvarande hook i `checkOnWinBonuses()`, en spegelbild
  av Kaeldryx' `onWinPowerThresholdDestroy` men som läser FÖRLORARENS
  totala kraft istället för vinnarens effektiva värde. Vinner Deathblade
  mot ett kort med total kraft ≤6 destrueras det helt (`destroyCard`),
  ingen capture.
- **Special Attack: "Shadow Assault"** — HELT oförändrad, den enda unika
  positionsbytes-mekaniken i hela rostern (`SPECIAL_HANDLERS.deathblade`
  byter fysisk plats på brädet + permanent -2 alla sidor på målet).

Bort: Silent Hunter, Shadow Mastery, Nightstalker — alla flavor-only,
ströks i linje med den godkända kortkonsten.

**31. Lyrith ombyggd (Venomous Fangs / Silent Strike)** — ursprungligen
bedömd 🟡 POLISH i auditen, men samma missbedömning som Graff/
Voidqueen/Sarah/Deathblade: NOLL av 5 skills hade backing, bara
Ultimaten (Serpent's Wrath) var riktig kod. Godkänd kortkonst trimmade
henne till tre skills, precis som Deathblade — Shadow Step, Bloodlust
och Veil of Shadows ströks helt.

- **Venomous Fangs (Passiv)** — helt befintligt fält
  `active.onWinDebuffLoserPermanent:1`, samma primitive Yojimbo/Torn
  redan använder.
- **Silent Strike (Passiv)** — helt befintligt fält
  `active.vsStrongerTotalPowerBoost:{amount:2}`, samma primitive
  Yojimbo/Ysara/Sarah redan använder.
- **Special Attack: "Serpent's Wrath"** — HELT oförändrad (crit-chans
  25% → destroy, annars flip + permanent +4 Power alla sidor, ignorerar
  sköldar). UI-texten trimmades för att matcha den kortare kortkonsten,
  men själva mekaniken rördes inte.

Inga nya primitives — båda passiva skills återanvänder befintliga,
redan testade engine-hooks. Bort: Shadow Step, Bloodlust, Veil of
Shadows — alla flavor-only.

**32. Aurelia ombyggd (Radiant Guardian / Luminous Strike)** —
ursprungligen bedömd 🟡 POLISH i auditen, men samma missbedömning som
Graff/Voidqueen/Sarah/Deathblade/Lyrith: NOLL av 5 skills hade
backing, bara Ultimaten (Dawn's Reckoning) var riktig kod. Godkänd
kortkonst trimmade henne till tre skills, samma mönster som
Deathblade/Lyrith — Holy Barrage, Divine Shield och Light's Swiftness
ströks helt.

- **Radiant Guardian (Passiv)** — helt befintligt fält
  `active.shield:true`, samma primitive som redan används brett i
  rostern.
- **Luminous Strike (Passiv)** — helt befintligt fält
  `active.onWinDirectionalBoost:2`, samma primitive Tiamat redan
  använder.
- **Special Attack: "Dawn's Reckoning"** — HELT oförändrad (vinst →
  flip + permanent +4 Power alla sidor; crit 25% → flippas ändå men
  får -20 Power istället). Rörs ej.
- **Stats matchade till godkänd konst** (avvikelse i 3 av 4 sidor):
  top:9, right:6, bottom:8, left:7 (tidigare 9/7/6/8).

Inga nya primitives — båda passiva skills återanvänder befintliga,
redan testade engine-hooks. Bort: Holy Barrage, Divine Shield, Light's
Swiftness — alla flavor-only.

**33. Twisted Gipsy ombyggd (The House Always Wins / Loaded Deck)** —
ursprungligen bedömd 🟡 POLISH i auditen, men samma missbedömning som
Graff/Voidqueen/Sarah/Deathblade/Lyrith/Aurelia: NOLL av 5 skills hade
backing, bara Ultimaten (House of Shadows) var riktig kod — och den
hade dessutom en egen textdrift (UI:n nämnde ett tillfälligt +3 på
attacksidan som koden aldrig gav). Godkänd kortkonst trimmade honom
till tre skills, samma mönster som Deathblade/Lyrith/Aurelia — Pick a
Card, Sleight of Hand och Steal the Fortune ströks helt.

- **The House Always Wins (Passiv)** — helt befintlig kombination
  `active.onWinDebuffLoserPermanent:1` + `active.onCaptureBonus:1`,
  samma kombination Yojimbo redan har. En äkta "stöld": förloraren -1
  permanent, Twisted Gipsy +1 permanent.
- **Loaded Deck (Passiv)** — helt befintligt fält
  `active.oncePerMatchAttackBoost:{amount:3}`, samma primitive som
  Yojimbos Kozuka.
- **Special Attack: "House of Shadows"** — koden HELT oförändrad (vinst
  → stjäl 2 Power + permanent +1 till honom själv), men UI-texten
  synkades till vad koden faktiskt gör istället för den gamla,
  aldrig-implementerade "+3 på attacksidan"-texten.
- **Stats matchade till godkänd konst** (avvikelse i 3 av 4 sidor):
  top:9, right:7, bottom:9, left:10 (tidigare 9/10/7/9).

Inga nya primitives — båda passiva skills återanvänder befintliga,
redan testade engine-hooks. Bort: Pick a Card, Sleight of Hand, Steal
the Fortune — alla flavor-only.

**34. Astrael utökad (Cosmic Ward, element, Falling Stars kombinerad)**
— TILL SKILLNAD FRÅN de sex senaste korten var Astrael redan HELT
wired (Starborn + Falling Stars, 2/2 skills, inget flavor-only) —
ingen felaktig auditbedömning den här gången. Användaren valde ändå
att utöka henne (alternativ 2: liten utökning + element + ny konst)
istället för att lämna henne orörd.

Viktigt bevarat: hennes etablerade konst är medvetet KÖNLÖS OCH
ANSIKTSLÖS ("No gender. No time. Only the stars.") — en kosmisk
entitet, INTE en mänsklig Legendary-hjältinna som resten av rostern.
Den nya bildbriefen byggde medvetet vidare på den identiteten istället
för att bryta den; rarity-bandet är "COSMIC ENTITY", inte "Legendary
Card".

- **Element: `magic`** (PROPOSAL, nytt fält — inget CANON-brott, fältet
  var tomt sedan tidigare).
- **Starborn (Passiv)** — HELT oförändrad (`active.onPlaceBoost:2`,
  slumpad sida).
- **Cosmic Ward (Passiv, NY)** — helt befintligt fält
  `active.shield:true`.
- **Special Attack: "Falling Stars"** — kod-vs-bild-konflikt löst genom
  att KOMBINERA båda (användarens val "C", samma lösning som Graffs
  Whirlwind Assault): bilden sa att målet permanent försvagas -2 alla
  sidor (nytt, `SpecialVerbs.debuff(targetEntry, 2)` tillagt i
  `SPECIAL_HANDLERS.astrael`), koden gav redan Astrael permanent +1
  till sig själv (`attackBoost(srcEntry, 1)`, oförändrad) — nu gör
  Ultimaten båda delarna.

Inga nya primitives utöver ren återanvändning av `debuff()`, redan
befintlig `SpecialVerbs`-funktion.

**35. Vaelira — minimal fix (Crimson Surge) + ny solo-konst** —
TILL SKILLNAD FRÅN de flesta korten på listan var Vaelira redan i gott
skick: 4 av 5 skills var wired (Undying Flame, Sister's Bond, Weakness
— Broken Focus, Infernal Pact). Bara **Crimson Surge** saknade
backing. Användaren bad explicit om en MINIMAL fix, inte en full
rework — "inte för mycket ändringar bara det blir bättre".

Den godkända bilden (ny solo-pose, hjärtformad säng) hade dock en
gameplay-text som skilde sig från koden på ALLA fem skills, inklusive
ett troligt AI-bildgenereringsfel i Sister's Bond (nämnde Lyrith/
Aurelia istället för hennes faktiska Triple Triad-systrar Seraphine/
Nyxara). Användaren valde uttryckligen "den säkra vägen": behåll all
fungerande kod, rätta bara UI-texten, ingen annan gameplay/lore/balans
rörd.

- **Crimson Surge (Passiv)** — NY primitive `active.onWinCappedBoost:
  {amount:1, max:3}` + motsvarande hook i `checkOnWinBonuses()`, byggd
  på samma capped-stack-idé som Omega Weapons
  `buffOnEnemyDestroyedCapped`, men triggad av vanliga vinster istället
  för destroys (behöver sin egen räknare, `onWinCappedBoostCount`, på
  vinnarens entry).
- **Undying Flame, Sister's Bond, Weakness — Broken Focus, Infernal
  Pact** — HELT oförändrad mekanik. UI-texten synkades bara till att
  vara exakt (t.ex. "-3 Power den runda hon återvänder" → "permanent
  -3 Power", eftersom koden redan var permanent, inte temporär).
- **Sister's Bond namnen (Seraphine/Nyxara) bekräftade och behållna** —
  Lyrith/Aurelia i bilden var ett bildgenereringsfel, ingen avsiktlig
  lore-ändring.
- Stats **rördes INTE** (till skillnad från tidigare kort) — bilden
  hade en mindre right/left-avvikelse, men användaren bad om minimala
  ändringar så den lämnades orörd.

Inga andra gameplay-, lore- eller balansändringar.

**36. Nexzoth — delvis matchad till godkänd bild (alternativ A)** —
Nexzoth var redan mestadels wired (Reality Consume, World Shatter,
Endless Void, The Ending), men den nya bilden beskrev en ANNAN
mekanik på nästan alla skills. Användaren valde alternativ A (matcha
kod till bild), men bara för de delar som gick att göra säkert utan
att uppfinna helt nya motorsystem:

- **Devourer** (ersätter Omnivore, redan beslutat tidigare) — helt
  befintligt fält `active.buffOnEnemyDestroyed:true`, samma som
  Morvath.
- **World Shatter** — förenklad från linje-AOE (`onWinLineDestroy`,
  som Morvath fortfarande använder oförändrad) till en NY, egen
  primitive `active.onWinDestroyLoserAlways:true`: varje vinst
  förstör nu målet direkt istället för att erövra det, okapad (ingen
  once-per-match-spärr som förut — den spärren hör bara till Morvaths
  linje-AOE), och kan inte återupplivas.
- **The Ending** — förenklad till att bara träffa fiender (som
  Vaelira/Nyxaras egna förstör-allt-effekter), sparar allierade nu.
- **NY generell motorfunktion**: `destroyCard(index, {noRevive:true})`
  — ett nytt valfritt andra argument som hoppar över
  Graveyard-registreringen helt, även med Graveyard-regeln på. Används
  av World Shatter och The Ending för att matcha bildens "cannot be
  revived". Påverkar INGA andra kort — standardanropet `destroyCard(i)`
  fungerar exakt som förut.

**Uppföljning — Reality Consume och Endless Void nu också klara**
(användaren gav klartecken "Ja fixa nya motorlogik", utan att svara på
de två öppna följdfrågorna, så förvalen nedan användes och flaggas
här):

- **Reality Consume** — helt ny generisk primitive
  `active.auraDebuffAdjacentEnemies:1`, mirror-bilden av befintliga
  `adjacentEnemiesBoost`/`adjacentAlliesBoost` i `fullEffectiveValue()`
  men försvagar GRANNEN istället för att buffa kortet självt. Gäller
  både attack och defense, ignorerar allierade, respekterar grannens
  egen `debuffImmune`. Den gamla on-place-varianten
  (`ON_PLACE_HANDLERS.nexzoth`) är borttagen helt.
- **Endless Void** — ny primitive `active.onRoundStartDebuffEnemies:1`
  + en ny hook i `sweepExpiredRoundEffects()` (som redan körs vid
  varje turnCount-växling). FÖRVAL använt eftersom frågorna var
  obesvarade: **tillfällig, icke-staplande** (återanvänder
  `debuffThisRound()`s egen tempEffects-utgång, samma "denna runda"-
  fönster som allt annat i spelet) snarare än permanent, och gäller
  bara fiender som redan finns på brädet vid den exakta
  turn-växlingen (inget retroaktivt för kort som läggs senare samma
  runda). Motivering: permanent+staplande hade snöbollat okontrollerat
  ihop med hans egna Devourer/World Shatter, samma oro som redan
  dokumenterad för Nexzoth/Morvaths `onWinLineDestroy`-spärr.
- Den gamla `debuffImmune:true` (Endless Voids förra betydelse,
  självskydd) är BORTTAGEN helt — bytt mot den nya offensiva
  betydelsen. Ett existerande, orelaterat test
  ("Visual feedback...") använde Nexzoth som sitt exempel på ett
  `debuffImmune`-kort — bytt till Morvath istället eftersom han
  fortfarande har flaggan.
- Nexzoth är nu HELT klar (alla 5 skills + Ultimate matchar bilden),
  konst committad.

**39. Seraphine — Celestial Mark riktig mekanik, Silver Sight bytt** —
3 av 5 skills var redan wired (Sister's Bond, Weakness — Broken Focus,
Silver Judgment), men Celestial Mark var flavor-only och Silver Sight
var genuint obyggbar (kräver fog-of-war, som inte finns).

- **Celestial Mark (Passiv)** — riktig mekanik nu: ny
  `ON_PLACE_HANDLERS.seraphine` märker en slumpad fiende
  (`entry.seraphineMarked`, samma runtime-flagg-form som
  `vaeliraBurned`/`frostmarked`). Eftersom `fullEffectiveValue()`
  aldrig får motståndarens LEVANDE kort-instans (bara statisk
  korttext), kunde bonusen inte läsas generiskt där — löst med två
  små, hårdkodade `if(placed.id === 'seraphine' && target.
  seraphineMarked)`-checkar i `battleNeighbors` (riktiga strider) och
  `simulateFlips` (AI:ns egen utvärdering), exakt samma "hårdkodat per
  kort-ID"-mönster som Triune Desires Divine Temptation redan
  använder. Ingen ändring av `fullEffectiveValue()` själv, inget annat
  kort påverkat.
- **Silver Sight → borttagen**, ersatt av
  `active.vsStrongerTotalPowerBoost:{amount:2}` (helt återanvänd,
  samma som Yojimbo/Ysara/Sarah/Lyrith).
- Sister's Bond, Weakness — Broken Focus, Silver Judgment —
  **oförändrade**.

Användarens uttryckliga princip: undvik nya generiska primitives när
möjligt — den här lösningen introducerar INGEN ny generisk `active.X`,
bara en liten per-kort-hårdkodning i två redan existerande
funktioner.

**Uppföljning — andra bilden (vattenfall-pose)**: samma tre
kod-vs-bild-avvikelser dök upp igen (Sister's Bond flackad till "+1",
Weakness "varje förlust", Silver Judgment omtolkad till destroy-all-
vid-3-wins). Samma lösning som för Nyxara valdes konsekvent: koden
(redan testad, egen identitet skild från systrarnas destroy-allt-
ultimates) behölls oförändrad, bara Weakness-texten stramades åt till
"permanently loses 3 Power" (samma fix som Vaelira/Nyxara fick).
Stats (10/10/10/10) matchade redan bilden exakt.

**38. Bahamut — gameplay-fix + Megaflare omdesignad till AOE** —
tunnare kort, bara 2 av 6 skills wired från start (Dragon King's
Majesty löst, Megaflare). Godkänd bild krävde en total omdesign av
Megaflare utöver den ursprungligen godkända minimala fixen.

- **Dragon King's Majesty (Passiv)** — oförändrad `active.
  onCaptureBonus:1`, texten synkad från "the first time" till "each
  time" (primitiven triggar varje erövring, inte bara den första).
- **Astral Aegis (Passiv, NY)** — helt befintligt fält
  `active.shield:true`.
- **Celestial Sovereign (Passiv, NY)** — helt befintligt fält
  `active.adjacentAlliesBoost:{minCount:2, amount:1}` (samma som
  Medusas Throne of Stone). OBS: bilden beskrev detta som en
  ALLIERAD-buff istället för ett självbuff ("they gain +1 Power") —
  användaren bekräftade bara Megaflare-ändringen explicit, så
  Celestial Sovereign behölls som ursprungligen godkänt (självbuff)
  tills vidare eftersom ally-varianten hade krävt genuint ny,
  bespoke grannskaps-kod.
- **Special Attack: Megaflare — total omdesign per godkänd bild**: från
  ett enda-mål-anfall (kostade 2 wins, ignorerade försvar, permanent
  +1 vid vinst) till en AOE som förstör ALLA fiender (`cost:3`,
  `targets:'aoe'`, samma mönster som Vaelira/Nexzoth), kan inte
  återupplivas (`noRevive`), och ger permanent +1 Power PER förstört
  kort istället för en fast +1.
- Exaflare, Dragon King's Wrath — bort, flavor-only/redundanta
  (beslutat innan bilden).

**37. Kaeldryx — full ombyggnad baserad på godkänd bild** —
till skillnad från nästan alla andra kort var Kaeldryx redan 100%
wired (alla 5 skills). Bilden beskrev ändå helt andra mekaniker på
varenda skill; användaren valde uttryckligen att göra om honom
riktigt baserat på den nya texten, inte bara synka ord.

- **Dragon Hunter** — `vsTagBonus.amount` sänkt från 4 till 2.
- **Hunter's Focus** — total omvändning: FRÅN "vid placering, lås en
  slumpad fiendes buffar i 4 turns" TILL "+1 Power alla sidor efter
  VARJE vunnen runda, okapat". Återanvänder `active.onWinCappedBoost`
  (byggd för Vaelira) med `max:Infinity` — alltså fortfarande INGEN ny
  primitive, bara en extremt hög/oändlig gräns på en redan existerande
  capped-mekanism.
- **Scalebreaker** — total omvändning: FRÅN "+1 Power mot 8+
  motstående sida" TILL "vid placering, permanent -2 på en slumpad
  fiende (förstör inte)". `ON_PLACE_HANDLERS.kaeldryx` omskriven för
  detta (var tidigare Hunter's Focus-koden, som nu bytt plats/mening
  med Scalebreaker). Den gamla `scaleBreaker:true`-läsningen i
  `fullEffectiveValue()` är död kod nu (inget annat kort använde den)
  — borttagen helt, samma städprincip som Sylvarions gamla
  Ultimate-rester tidigare i projektet.
- **Execution** — bytte tröskel FRÅN "Kaeldryx vinner med 10+ effektiv
  Power → förstör förloraren" TILL "förloraren har ≤3 total Power →
  förstörs". Återanvänder Deathblades `onWinDestroyIfLoserWeak`
  primitive rakt av (`maxTotal:3`), plus en ny liten valfri
  `noRevive`-flagga på samma primitives config-objekt (`{maxTotal,
  noRevive:true}`) så Kaeldryx kan skippa Graveyard helt utan att
  ändra Deathblades egen, oförändrade `{maxTotal:6}` (ingen
  `noRevive` där, så hennes destroy fortfarande kan hamna i
  Graveyard som vanligt).
- **Dragonslayer** — tappade den gamla "-3 Power till kvarvarande
  fiender denna runda"-klausulen, fick en ovillkorad extra tur
  istället, och dragarnas destroy kan inte längre återupplivas
  (`noRevive`).
- Stats matchade till godkänd konst (höger/vänster omkastade):
  top:10, right:9, bottom:9, left:10 (tidigare 10/10/9/9).

**40. Nyxara — gameplay-fix baserad på godkänd bild, KONFLIKT flaggad
och undviken** — 5 av 6 skills var redan wired (Void Touch, Empress
Aura+Sister's Command, Weakness, Void Dominion), bara Shadow Rend är
flavor-only (uttryckligen lämnad orörd på användarens begäran).

- **Stats matchade till godkänd konst** (höger/botten omkastade):
  top:10, right:9, bottom:10, left:10 (tidigare 10/10/9/10).
- **Empress Aura + Sister's Command**: bildens siffror antydde totalt
  +5 vid båda systrar (+1 bas, +4 på topp) istället för den tidigare
  koden totalt +6 — `sisterAura.bonusByCount` justerad från `{1:1,
  2:6}` till `{1:1, 2:5}`.
- **Weakness — Broken Focus**: koden BEHÖLLS oförändrad (triggar bara
  vid återerövring efter tillfångatagande, delad `checkSisterFlip`-
  mekanik med Vaelira/Seraphine) — bildens "varje förlust"-läsning
  antogs INTE, bara texten stramades åt ("permanently loses 3 Power"
  istället för "the round she returns").
- **Void Dominion — VIKTIG KONFLIKT UPPTÄCKT OCH UNDVIKEN**: bilden sa
  "(cannot be revived)", men Nyxaras Void Dominion delar samma
  AOE-destroy-all-mönster som Vaeliras Infernal Pact och Triune
  Desires Forbidden Harmony — och ett redan existerande, avsiktligt
  test (`"Graveyard optional rule: every destroy-capable Special
  routes through destroyCard()"`) låser uttryckligen fast att ALLA
  TRE ska hamna i Graveyard på samma sätt. Att lägga till `noRevive`
  bara på Nyxara hade brutit den etablerade cross-card-konsekvensen
  och det testet. Löst genom att INTE lägga till `noRevive` — Void
  Dominion fungerar exakt som förut, `SPECIAL_HANDLERS.nyxara`
  oförändrad, bildens "(cannot be revived)"-text följdes inte.

**41. Zaevir — full ombyggnad från en 0/4-wired stubbe** — första kortet
från den NYA 16-korts audit-listan (se avsnitt 1b). Till skillnad från
POLISH-korten hade Zaevir INGET `special`-fält alls (ingen Ultimate
över huvud taget) och ett `active.bonus`-fält som inte matchade någon
av hans 4 skills — en ren kvarleva. 0 av 4 skills hade backing.

- **Eternal Aim (Passiv)** — helt befintligt fält `active.onPlaceBoost:2`
  (slumpad sida, permanent), samma primitive som Tiamat/Astrael.
- **Focus (Passiv)** — helt befintligt fält `active.shield:true`,
  medvetet omtolkad från "obesegrad → bonus" (ospårbart utan en ny
  räknare) till "första förlusten ignoreras" — användaren bad
  uttryckligen om att texten ska beskriva exakt vad Shield-mekaniken
  gör, inget annat.
- **Special Attack: "Eternal Arrow"** — hans FÖRSTA Ultimate någonsin,
  ny `SPECIAL_HANDLERS.zaevir`, byggd i exakt samma form som Sarah/
  Vayra/Ysaras Eclipse-mönster (total-power-tröskel +3, permanent +1
  alla sidor på vinst). Bildens eget aktiveringsvillkor ("kontrollera
  minst 3 kort") följdes INTE — det hade krävt en ny resurstyp vid
  sidan av det redan etablerade Wins-kostnadssystemet alla andra
  Special Attacks använder, flaggat till användaren och medvetet
  avvisat till förmån för det redan godkända, återanvända mönstret.
- Stats matchade till godkänd konst (vänster/botten omkastade):
  top:10, right:10, bottom:9, left:8 (tidigare 10/10/8/9).

Bort: Forest's Path (skulle kräva en helt ny räckvidds-mekanik för
icke-angränsande attacker, inte värt det för ett enda filler-kort) och
den gamla Eternal Arrow-kedjeattacks-idén (ingen kedjeattack-mekanik
finns). Inga nya primitives.

**42. Ragnar — full ombyggnad från en 0/4-wired stubbe** — andra kortet
från 16-korts audit-listan, samma mönster som Zaevir: INGET
`special`-fält alls och ett `active.bonus`-fält som inte matchade
någon av hans 4 skills. 0 av 4 skills hade backing.

- **War Breaker (Passiv)** — helt befintligt fält
  `active.vsStrongerTotalPowerBoost:{amount:2}`, samma primitive som
  Yojimbo/Ysara/Sarah/Lyrith. Omtolkad från "valfri fiende" (ingen
  mål-väljar-UI finns) till "en starkare fiende".
- **Blood Rush (Passiv)** — helt befintligt fält
  `active.onCaptureBonus:1`, samma primitive som Ifrit/Graff/Vayra/
  Yojimbo. "Nästa strid" blev permanent, samma simplifiering som redan
  gjorts flera gånger.
- **Special Attack: "Blood Fury"** — hans FÖRSTA Ultimate någonsin,
  samma Eclipse-mönster som Zaevir/Sarah/Vayra/Ysara. Bildens eget
  "kontrollera minst 3 kort"-aktiveringsvillkor följdes INTE igen —
  samma återkommande mönster i bildverktyget som redan avvisades för
  Zaevir, av samma anledning (ny resurstyp utanför Wins-systemet).
- Stats matchade till godkänd konst (tre av fyra sidor omkastade):
  top:9, right:6, bottom:9, left:5 (tidigare 9/5/6/9).

Bort: Double Strike (kedjeattack finns inte, samma som Zaevirs
strukna koncept) och Last Fury (redundant mot spelets globala
`lastStandBonus()`, samma anledning Sarahs gamla "Last Arrow"
ströks). Inga nya primitives.

**43. Maximus — trimmad från en 1/6-wired stubbe** — tredje kortet
från audit-listan. Till skillnad från Zaevir/Ragnar hade Maximus
faktiskt en riktig, redan bra Ultimate (`SPECIAL_HANDLERS.maximus`:
tröskel +4, flip, permanent +2, extra tur om målet var starkare) —
bara de 5 vanliga skillsen saknade backing, och flera av dem
överlappade varandra (Gladiator's Dominion och Arena Rage triggade
båda på erövring, bara permanent vs tillfällig).

- **Gladiator's Dominion (Passiv)** — helt befintligt fält
  `active.onCaptureBonus:1`. Behöll den starkare/tydligare av de två
  ursprungliga ihopklumpade effekterna, strök den tillfälliga
  dubbleringen.
- **Blood for Glory (Passiv)** — helt befintligt fält
  `active.vsStrongerTotalPowerBoost:{amount:3}`, matchade hans egen
  text exakt.
- **Special Attack: "Axe of Dominion"** — koden HELT oförändrad. Bildens
  eget "kontrollera minst 4 kort"-aktiveringsvillkor följdes INTE —
  tredje gången samma mönster dyker upp i bildverktyget (Zaevir "3
  kort", Ragnar "3 kort", nu Maximus "4 kort"), avvisat av samma
  anledning varje gång. UI-texten synkades bara till att beskriva vad
  koden redan gör.
- Stats **oförändrade** — matchade redan bilden exakt (första kortet
  i den nya omgången utan någon stat-avvikelse).

Bort: Spinning Axe (otydligt villkor, överlappade med grundstats),
Arena Rage (redundant med Gladiator's Dominion), Champion's Will
(ingen befintlig "välj en allierad"-mekanik finns). Inga nya
primitives.

**44. Darum — trimmad från en 0/5-wired stubbe** — fjärde kortet från
audit-listan. Precis som Maximus hade Darum en redan fungerande
Ultimate (`SPECIAL_HANDLERS.darum`, tröskel +4/flip/permanent +2),
bara de 5 vanliga skillsen saknade backing.

- **Wall of Resolve (Passiv)** — helt befintligt fält
  `active.onWinDirectionalBoost:1`. VIKTIG LÄRDOM under
  implementationen: kortets ursprungliga text sa "vinner en
  DEFENSIV strid", men `onWinDirectionalBoost` (och alla `checkOnWin-
  Bonuses`-hooks överlag) triggas bara för den ANFALLANDE/placerande
  sidans vinster i den här motorn — en försvarare som lyckas hålla
  emot en attack räknas aldrig som en "vinst" i motorns egen mening.
  Texten justerades till "vinner en strid" (utan "defensiv") för att
  matcha vad primitiven faktiskt gör, upptäckt när det första
  testförsöket floppade.
- **Crushing Counter (Passiv)** — helt befintligt fält
  `active.vsStrongerTotalPowerBoost:{amount:3}`, matchade hans text
  exakt.
- **Ironwall (Passiv)** — helt befintligt fält `active.shield:true`.
- **Special Attack: "Gate of Dominion"** — koden HELT oförändrad.
  Bildens "kontrollera minst 4 kort"-villkor följdes INTE igen (fjärde
  gången detta mönster dyker upp: Zaevir/Ragnar "3 kort", Maximus/
  Darum "4 kort").
- Stats **oförändrade** — matchade redan bilden exakt.

Bort: Boulder Bash och Fortress Stance (båda otydliga/obetingade,
överlappade varandra och grundidentiteten "tank"), samt "immun mot
Special Attacks"-klausulen i Wall of Resolve (inget spårningssystem
för det finns). Inga nya primitives.

**45. Daron — trimmad från en 0/5-wired stubbe** — femte kortet från
audit-listan, och **Darums son** ("Son of Darum, The Fallen Prince of
the North") — flera av hans skills ekar bokstavligen sin fars
mekaniker, vilket gjorde återanvändningen extra naturlig. Ultimaten
(`SPECIAL_HANDLERS.daron`, tröskel +4/flip/`stealPower:2`) var redan
wired och matchade texten exakt. Bara de 5 vanliga skillsen saknade
backing.

- **Corrupted Bloodline (Passiv)** — TVÅ helt befintliga fält
  tillsammans: `active.onWinDirectionalBoost:1` +
  `active.vsStrongerTotalPowerBoost:{amount:1}` — samma två primitives
  som pappa Darums Wall of Resolve/Crushing Counter, fast lägre
  belopp. "Som far, så son."
- **Soul Drain (Passiv)** — TVÅ helt befintliga fält tillsammans:
  `active.onWinDebuffLoserPermanent:1` + `active.onCaptureBonus:1` —
  exakt samma "stöld"-kombination som Twisted Gipsys The House Always
  Wins.
- **Special Attack: "Shattered Crown"** — koden HELT oförändrad.
  Bildens "kontrollera minst 4 kort"-villkor följdes INTE igen (femte
  gången: Zaevir/Ragnar "3 kort", Maximus/Darum/Daron "4 kort").
- Stats **oförändrade** — matchade redan bilden exakt.

Bort: Dark Sorcery (kräver "rikta in på högsta sidan"-logik som inte
finns), Twisted Royalty (två ihopklumpade effekter, ingen ren
mappning), Mother's Torment (redundant/överdrivet i kombination med
de andra två). Inga nya primitives.

**46. Vorathos — trimmad + en riktig kod-vs-bild-konflikt löst med
"kombinera båda"** — sjätte kortet från audit-listan. Hade ett
`active.shield:true` som inte matchade NÅGON av hans 4 namngivna
skills — en oförklarlig kvarleva, borttagen helt snarare än att gissa
vad den var tänkt för. Ultimaten (`SPECIAL_HANDLERS.vorathos`, tröskel
+4/flip/riktad permanent +1) var redan wired.

- **Time Barrier (Passiv)** — helt befintligt fält
  `active.onWinDirectionalBoost:1`, "resten av ronden" blev permanent.
- **Eternal Boundary (Passiv)** — helt befintligt fält
  `active.oncePerMatchAttackBoost:{amount:2}`, samma som Yojimbos
  Kozuka. "Vald riktning, resten av ronden" blev "nästa attack".
- **Special Attack: "Time Collapse" — RIKTIG mekanik-konflikt, inte
  bara "kontrollera N kort"-mönstret**: koden gav Vorathos SJÄLV
  permanent +1 på vald riktning (självbuff), men bilden beskrev att
  DET BESEGRADE KORTET permanent förlorar -1 på samma riktning
  (fiendedebuff) — helt motsatt mål. Användaren valde "C" (kombinera
  båda): `SPECIAL_HANDLERS.vorathos` fick en ny rad,
  `SpecialVerbs.directionalBoost(targetEntry, [side], -1)`, som körs
  TILLSAMMANS med den befintliga självbuffen. Samma
  "kontrollera N kort"-aktiveringsvillkor i bilden följdes INTE
  (sjätte gången).
- Stats **oförändrade** — matchade redan bilden exakt.

Bort: Standstill (skulle kräva en ny "försvarare försvagar angripare
live"-primitive), Reversed Shield (ingen on-loss-trigger-typ finns).
Inga nya primitives utöver den redan existerande
`SpecialVerbs.directionalBoost()` (bara ett nytt anrop till en
befintlig funktion).

**47. Pallispell — en riktig kod-vs-bild-konflikt löst med "kombinera
båda" (samma användarval som Vorathos)** — sjunde kortet från
audit-listan, redan 4/5 wired (Keen Eye, Loyal Strike, Double Fury,
Strong Together matchade bilden exakt, ingen ändring). Den enda luckan
var Ultimaten, och den var en RIKTIG mekanik-konflikt, inte bara
"kontrollera N kort"-mönstret:

- **Koden** (`SPECIAL_HANDLERS.pallispell`, redan wired sedan tidigare
  session): AOE-dubbelstrid — hittar automatiskt upp till 2 angränsande
  fiendekort och jämför rå totalPower (inget attack-bonus), flippar de
  som förlorar. Om BÅDA flippas får Pallis & Pell permanent +1 alla
  sidor.
- **Den nya godkända bilden**: enkel-mål flip+debuff — välj ETT
  fiendekort, om striden vinns förlorar det kortet permanent 2 Power på
  alla sidor.
- Helt olika mål (AOE mot enkel-mål) och helt olika effekt (självbuff
  mot fiendedebuff) — samma typ av konflikt som Vorathos Time Collapse.
  Användaren valde "C" (kombinera båda) igen: AOE-dubbelstriden ligger
  kvar oförändrad, men varje enskilt kort som flippas av den får NU
  också bildens permanenta -2 alla sidor-debuff, via ett nytt anrop till
  den redan existerande `SpecialVerbs.debuff()` (samma primitive som
  Sarahs Poisoned Edge). Den befintliga "båda flippade → +1
  självbuff"-bonusen är oförändrad och läggs ovanpå.
- Stats, badges, Keen Eye, Strong Together **oförändrade** — matchade
  redan bilden exakt.

Inga nya primitives — bara ett nytt anrop till den redan existerande
`SpecialVerbs.debuff()`.

**48. Templaren — medvetet 3/4, en fjärde skill struken helt (inte
byggd) efter diskussion med användaren** — åttonde kortet från
audit-listan, hade `active: {conditionalShield:'adjacentAllies2'}`
(bara Faithful Defense) och `skills` för alla fyra namn, men Holy Aura,
Shield Wall och Divine Retribution saknade all kod-backing (0/3). Inget
`special`-fält alls (ingen Ultimate) — oförändrat, ingen bildbrief för
det ännu.

- **Holy Aura** — ny handler `ON_PLACE_HANDLERS.templaren(entry, owner,
  cellIndex)`. "+1 Power i riktningen som pekar mot Templaren" på varje
  angränsande allierat kort: räknar ut den MOTSATTA sidan från
  Templarens offset (en allierad ovanför honom får bonusen på sin EGEN
  botten-sida, osv.) och anropar den redan existerande
  `SpecialVerbs.directionalBoost()` per granne — samma
  `adjacentEntries()`-familj av hooks som Shiva/Leviathan/Chocobo King
  redan använder, bara med en beräknad riktning istället för alla
  sidor.
- **Divine Retribution** — helt befintligt fält
  `active.onCaptureBuffSelfThisRound:1`, exakt samma primitive som
  Leviathan redan använder (där med värdet 2). "Resten av ronden"
  matchar ordagrant vad fältet redan gör.
- **Shield Wall — struken helt, inte byggd.** Texten ("If Templaren
  wins against a dark or monster-type card, you take control regardless
  of the numbers") skulle krävt TVÅ nya saker samtidigt: (1) en helt ny
  "ovillkorlig vinst oavsett siffror"-primitive — inget sådant finns
  någonstans i motorn (närmaste är `weakVsElement`, som bara ger ett
  stort men ändligt bonus, aldrig en garanterad vinst), och (2) en ny
  `isMonster`-tagg på rostret (`element:'dark'` finns redan för
  "dark", men "monster-type" har ingen datarepresentation alls —
  skulle krävt omtaggning av de enkla mobbarna Ogre/Direbear/Wyrm/
  Lich/Revenant/Wendigo/Harpy/Shadowking). Användaren stoppade detta
  explicit: **"Det går emot hela linjen vi har kört: vi bygger inte
  nya primitives för ett enda kort när det finns en renare lösning."**
  Skillen är helt borttagen ur `skills`-arrayen (inte kvarlämnad som
  en obackad textrad) — Templaren har nu 3 riktiga, fungerande
  abilities istället för 4 där en är fejk.
- Stats **oförändrade**. Faithful Defense **oförändrad**
  (`conditionalShield:'adjacentAllies2'`, redan wired sedan tidigare).

Inga nya primitives — `directionalBoost()` och
`onCaptureBuffSelfThisRound` fanns båda redan. Ingen Ultimate tillagd
(väntar på bildbrief).

**Uppdatering, samma session: ny godkänd konst mottagen och inlagd.**
Matchade det redan ombyggda kortet EXAKT — stats 10/9/8/8, namn/roll,
och alla tre skill-texter (Holy Aura, Divine Retribution, Faithful
Defense) ord för ord, ingen Ultimate synlig på kortet. Inga kodändringar
alls den här gången, bara nya bildfiler. Flyttade full-bilden från det
gamla GitHub-UUID-filnamnet (`27D992DB-122B-4BB7-917C-1734ACDFEFA8.jpg`,
borttaget) till standardnamnet `card-templaren-full.jpg`, samma mönster
som Vorathos/Pallispell. Ny beskuren `cards/card-templaren.jpg` använder
en högre beskärning ((10,60)-(930,660) istället för standard-
(140,300)-(800,731)) för att få med ansiktet/hjälmen ovanför skölden
utan att gå in i stat-diamant-området längst ner.

**49. Tilda — stats buffade + en fjärde skill omdöpt för
namnkollision** — nionde kortet från audit-listan, hade bara
`active.underdogBonus:2` (Night's Advantage), övriga tre skills (0/3)
saknade all kod-backing. Inget `special`-fält alls (ingen Ultimate),
oförändrat. Objektivt rostrets svagaste kort statistiskt (4/7/7/6 =
24, exakt vid golvet av hela rostrets 24–44-spann) — användaren valde
explicit att buffa henne som en del av omjobbet, inte bara koppla in
skills.

- **Stats: 7/8/8/8 (totalt 31)** — användarens val, uppvägt mot
  förslaget 6/8/8/7 (30). Tydlig uppgradering från golvet utan att
  närma sig toppskiktet.
- **Piercing Shot** — ny `ON_PLACE_HANDLERS.tilda`, buntar ihop med
  Marked Target (samma "ingen sekundär-aktivering, så båda kör vid
  placering"-resonemang som Vorgrath/Zalazar/Naline/Zlaizer). Ingen
  rad-mål-väljar-UI finns, så en slumpad riktning väljs först (samma
  mönster som Fenrir/Zalazars egna riktningsval), sedan ett slumpat
  fiendekort inom den `enemiesInDirection()`-linjen, `debuffThisRound`
  -2.
- **Marked Target** — samma bunt. Slumpat fiendekort var som helst på
  brädet, `entry.tildaMarked` satt precis som Seraphines
  `seraphineMarked`. Två hårdkodade checks (`battleNeighbors` +
  `simulateFlips`), samma anledning som Seraphine (`fullEffectiveValue`
  ser aldrig den levande motståndar-entryn). **Skillnad mot Seraphine:**
  INTE låst till en specifik anfallar-id — källtexten säger "one of
  YOUR cards", inte bara Tilda själv, så vilken alliansbricka som helst
  som anfaller det märkta kortet får +2.
- **Umbral Step (omdöpt från "Shadow Step")** — namnkollision med
  Vayras redan existerande, helt orelaterade Shadow Step-passiv
  (blockerar attacker ≤2 marginal). Användaren valde "Umbral Step".
  **Viktig precisering från användaren:** originalets "nästa tur"-
  identitet fick INTE tystas ner till permanent bara för att det var
  enklare — motorns EXISTERANDE `xUntilTurnCount`-mönster (samma
  runda-klocka som Medusas `petrifiedUntilTurnCount`,
  `state.turnCount + 4`, beskrivet på annat håll som "genom kastarens
  egen nästa tur") återanvändes rakt av istället för
  `SpecialVerbs.directionalBoost()` (som är permanent i alla dess
  andra användningar, kollat — Vorathos/Darum/Daron/Aurelian/Vorlix
  använder den aldrig temporärt). Två nya, helt vanliga runtime-fält
  (`entry.umbralStepSide`, `entry.umbralStepUntilTurnCount`) sätts i
  `checkOnWinBonuses` (slumpad sida per vinst, samma
  "ingen riktningsväljare"-förenkling) och läses LIVE i
  `fullEffectiveValue` — samma "beräkna direkt, inget att återställa"
  -form som `boardLeadBonus`/`pairPresence`-kollarna redan har där,
  så ingenting behöver röra `sweepExpiredRoundEffects()`. **Upptäckt
  under arbetet:** `checkOnWinBonuses` anropas EXKLUSIVT när det just
  placerade kortet vinner (aldrig när ett redan liggande kort försvarar
  framgångsrikt) — så bonusen kan bara TRIGGAS av Tildas egen placering,
  men eftersom hon aldrig "anfaller" igen efter det konsumeras den i
  praktiken nästan alltid av en FÖRSVARSstrid senare (en fiende som
  placerar sig intill henne inom fönstret). Därför fick kollen INTE
  gates till `role==='attack'` (till skillnad från
  `oncePerMatchAttackBoost`s mönster) — annars hade ability:n nästan
  alltid varit dödkod.
- **Night's Advantage** — oförändrad (`active.underdogBonus:2`).

Inga nya primitives — `debuffThisRound()`, `enemiesInDirection()` och
Seraphine-märkningsmönstret fanns alla redan; Umbral Step återanvänder
det redan existerande `xUntilTurnCount`-idiomet snarare än att bygga en
ny "temporär riktad bonus"-primitive i `SpecialVerbs`.

**Uppdatering, samma session: första Ultimate tillagd.** Användaren gav
en konkret spec direkt (inte en bild) för **"Nightfall"** (kostnad 2
wins, `targets:'single'`): "+3 Power på den attackerande sidan i denna
strid, om hon vinner permanent +1 alla sidor" — beordrat att återanvända
exakt samma total-power-tröskel-mönster som Vayra/Sarah/Ysara/Aurelia/
Lyrith (`SPECIAL_HANDLERS.tilda`, kopierad nästan rakt av från Sarahs
`Aion's Last Light`: `totalPower(srcEntry)+3 <= totalPower(targetEntry)`
→ miss, annars flip + `SpecialVerbs.attackBoost(srcEntry, 1)` permanent).
Inga nya primitives — bara ett nytt kort i samma redan etablerade familj.
Femte skill-raden ("Special Attack: Nightfall") tillagd i `skills`-arrayen
med samma standardformulering som Sarahs egen.

**Uppdatering, samma session: ny godkänd konst mottagen och inlagd
(inklusive Nightfall).** Matchade allt exakt — stats 7/8/8/8, namn/roll,
alla fyra bas-skill-texter OCH den nya Nightfall-texten ord för ord.
Inga kodändringar, bara nya bildfiler. Samma UUID-till-standardnamn-
migrering som Templaren/Vorathos/Pallispell
(`2EB4B914-42A1-4340-843C-D4213EA510E4.jpg` → `card-tilda-full.jpg`),
samma förhöjda beskärning som Templaren ((10,60)-(930,660)) för att
få med ansiktet ovanför namnplattan.

**50. Tahabata — 4 av 6 skills kopplade in, Shield/Inferno Dominion
lämnade orörda per instruktion** — tionde kortet från audit-listan.
**Till skillnad från Templaren/Tilda finns Tahabata dubbelt i filen**
(`HEROES` OCH `FOREST_FOES`, identisk text på båda ställena — AI:t kan
alltså spela honom) — alla ändringar speglade på BÅDA ställena med en
`replace_all`-edit. Hade redan `active.shield:true` (Pyrelord's Shield)
och en fungerande Ultimate (`SPECIAL_HANDLERS.tahabata`, Inferno
Dominion) — båda lämnade **helt orörda** per uttrycklig instruktion.

- **Dragonfire's Fury** — helt befintligt fält
  `active.oncePerMatchAttackBoost:{amount:2}`, samma som Yojimbo/
  Vorathos/Twisted Gipsy. "En vald sida" kollapsar naturligt till "den
  anfallande sidan" eftersom bara en sida någonsin är inblandad per
  strid — ingen förenkling att deklarera.
- **Soul Petrification** — ny `active.onCaptureGrantShield:true`,
  kopplad i `checkOnWinBonuses` (som redan körs en gång per enskild
  erövring, inte bara en gång per placering) med ett enda anrop till
  den redan existerande `SpecialVerbs.grantShield()` (samma primitive
  Pallis's Wave of Loyalty redan använder).
- **Wrath Eruption** — ny `active.onWinAdjacentEnemyDebuff:1`. Liknar
  `onWinAreaDebuff` (Three Head Dragon) men är INTE samma sak: den
  debuffar runt DET ERÖVRADE kortet, permanent, alla sidor; Wrath
  Eruption debuffar runt TAHABATA SJÄLV (winnerIndex, inte loserIndex),
  riktat (bara sidan som pekar mot honom), temporärt. Samma
  `xUntilTurnCount`-idiom som Tildas Umbral Step (`entry.
  wrathEruptionSide` + `entry.wrathEruptionUntilTurnCount`), men satt
  på FLERA grannars entries samtidigt istället för på kastaren själv,
  och läst OVILLKORLIGT i `fullEffectiveValue` (inte gated på det
  drabbade kortets egen `active`, eftersom flaggan sätts av en
  motståndare) — samma sätt `entry.sideBonus` redan läses ovillkorligt.
  Respekterar `isDebuffImmuneNow()` vid sättningstillfället, samma
  konvention som `SpecialVerbs.debuff()`/`debuffThisRound()`.
- **Pyrelord's Awakening** — ny `active.adjacentEnemiesBoostAnyRole:
  {minCount:2, amount:1}`, variant "a" per användarens uttryckliga val:
  enemy-counting-spegeln av det redan existerande `adjacentEnemiesBoost`
  (Tiamat), men UTAN dennas `role==='attack'`-spärr (Tahabatas text har
  ingen "medan han anfaller"-kvalificering, till skillnad från Tiamats).
  Samma form som Medusas `adjacentAlliesBoost` (som redan saknar
  attack-only-spärren), bara räknar fiende- istället för
  allierade-grannar.

**Bugg hittad och fixad under arbetet, inte Tahabata-specifik:**
`SpecialVerbs.grantShield()`s engångs-blockering konsumerades ALDRIG
via den vanliga stridsupplösningen (`battleNeighbors`) — bara via
Ultimate-vägen (`specialBlockedByShield`). `target.shieldUsed = true`
sattes bara inuti `if(targetActive && targetActive.shield)`-grenen, så
ett rent externt beviljat skydd (`grantedShield`, inget eget
`active.shield`) skulle blockera FÖREVER istället för bara en gång —
skulle ha gjort Soul Petrification permanent osårbar, inte "kan inte
tas tillbaka NÄSTA strid" som texten säger. Upptäckt av Soul
Petrifications eget test (`shieldUsedAfterRecapture` fastnade på
`false`). Fixat genom att flytta `target.shieldUsed = true` utanför
den snäva `targetActive.shield`-grenen till att gälla varje gång
`shielded` är sant, oavsett källa — matchar redan hur Ultimate-vägen
gör det. `shieldGrantsBonus` (Medusas Living Statue-specialfall) förblev
scoped till just `targetActive.shield`, ingen ändring där. Fullständig
testsvit (81 tester) grön efter fixen, inga regressioner.

Inga nya generella primitives — alla fyra nya fält återanvänder
befintliga verb (`SpecialVerbs.grantShield()`) eller redan etablerade
idiom (`xUntilTurnCount`-mönstret, det icke-attack-gated
adjacency-boost-mönstret Medusa redan äger).

**Ny godkänd bild mottagen samma session — avslöjade en RIKTIG
kod-vs-bild-konflikt på Inferno Dominion, inte bara en
formuleringsskillnad:**
- **Nuvarande kod** (oförändrad, precis som beordrat): 
  `totalPower(srcEntry)+2 <= totalPower(targetEntry)` → miss — ett
  GENERÖST tröskelvärde (Tahabata vinner även om hans totalPower är upp
  till 1 poäng LÄGRE än målets), och respekterar sköldar
  (`specialBlockedByShield`-koll finns).
- **Den nya bilden**: "If Tahabata wins a battle by 2 or more, he flips
  the enemy card. Shield effects do not prevent this from happening." —
  ett riktigt marginalkrav (måste vara STARKARE, inte bara "inte alltför
  mycket svagare"), och uttryckligen ospärrbart av sköldar — motsatsen
  till nuvarande beteende på båda punkterna.
- **Uppdatering, samma session: användaren valde "C" (kombinera).**
  Den gamla generösa tröskeln (`basePower+2 <= targetPower` → miss)
  ligger kvar OFÖRÄNDRAD som grundvillkor — en marginellt svagare
  Tahabata vinner fortfarande som förut, och en sådan smal vinst
  respekterar fortfarande sköldar precis som innan. Men en NY
  `dominant`-kontroll (`basePower - targetPower >= 2`, exakt bildens
  eget marginalkrav) lades till: när den är sann hoppas
  `specialBlockedByShield()`-kollen över helt, vilket matchar bildens
  "shields don't stop this" — och eftersom den funktionen är den enda
  platsen som sätter `shieldUsed`, lämnas skölden OKONSUMERAD (bildens
  text säger "stoppar inte", inte "förstör") snarare än förbrukad.
  Ingen av de två gamla grenarna togs bort — bara ett nytt extra villkor
  lagt ovanpå, samma "kombinera genom att lägga till, inte ersätta"-
  princip som Vorathos/Pallispell. Skill-texten uppdaterad i BÅDA
  `HEROES`/`FOREST_FOES`-kopiorna för att beskriva det kombinerade
  beteendet (den gamla texten, "+2 Power on that side", matchade
  faktiskt aldrig ens den gamla koden — en dold felskrivning som
  samtidigt städades upp). Fyra nya testfall (misslyckas, generös vinst,
  smal vinst blockerad, dominant vinst obstruerar sköld och lämnar den
  okonsumerad).

**Uppdatering, samma session: användaren godkände båda mindre fynden.**
`role` ändrat från `'Legendary Card'` till `'Pyrelord'` (matchar
bildens underrubrik, samma mönster som Templarens `role:'Holy
Guardian'` separat från sin egen rarity-badge). `isDragon:true`
tillagt (bildens "Type: Dragon") — läses redan generiskt av Kaeldryx's
`vsTagBonus:{tag:'isDragon'}` (Dragon Hunter) och den `isDragon`-filtrerade
linje-effekten (Ancient Wyrmking/Three Head Dragon), så Tahabata blir
nu automatiskt ett giltigt mål/relevant kort för båda utan någon extra
kod. Båda ändringarna speglade i `HEROES` OCH `FOREST_FOES` (samma
`replace_all`-mönster som resten av kortet). Fullständig testsvit körd
igen efter taggen (cross-cutting ändring, påverkar andra kort som redan
läser `isDragon`), fortfarande grön.

**Uppdatering, samma session: ny godkänd konst mottagen och inlagd.**
Flyttade full-bilden från det gamla GitHub-UUID-filnamnet
(`99DD524F-E6E1-4476-8FD8-786837E063A9.jpg`, borttaget) till
standardnamnet `card-tahabata-full.jpg`, samma mönster som Templaren/
Vorathos/Pallispell/Tilda. Ny beskuren `cards/card-tahabata.jpg`
använder samma högre beskärning som Templaren/Tilda
((10,60)-(930,660)) — standardbeskärningen klippte av drakens huvud
helt på den här bilden. Tahabata är nu HELT klar: 6/6 skills, ny konst.

**NY FUNKTION (inte del av 16-korts-auditen): persistent buff/debuff-
visning på brädet.** Användaren påpekade att attack-siffrorna på ett
liggande kort ALDRIG uppdaterades visuellt när det fick en permanent
eller "denna runda"-bonus/minus — bara en transient "+N Power"-popup
(`flashStatChange`) som tonar bort efter ~1.3s, sedan ingenting.
`cardFace()` renderade alltid `card.top`/`right`/`bottom`/`left` (de
statiska grundvärdena), aldrig `entry.captureBonus`/`entry.sideBonus`.

- Ny `effectiveStatFor(card, side, opts)` — ren funktion, `base +
  captureBonus + (sideBonus[side]||0)`. Medvetet begränsad till LAGRADE
  modifierare (samma två fält `flashStatChange` redan flashar), INTE
  matchup-beroende live-bonusar (`vsStrongerTotalPowerBoost`,
  `pairPresence`, etc. — de beräknas bara av `fullEffectiveValue` mot en
  specifik motståndare vid en faktisk strid, så det finns inget enda
  "aktuellt" värde att visa i förväg). Användarens eget val efter en
  fråga om scope.
- Ny `statNumHtml(card, side, opts)` — visar det EFFEKTIVA värdet
  (siffran ändras, inte bara en badge bredvid — användarens eget val
  mellan de två alternativen), med CSS-klass `buffed`/`debuffed` när
  bonusen är != 0.
- `cardFace()`s `stat-cluster` bytt till att anropa `statNumHtml` istället
  för att skriva `card.X` direkt. `boardCellHtml()` skickar nu
  `captureBonus`/`sideBonus` från den levande `cell`-entryn in i
  `cardFace`s `opts` — enda anropsstället som har en levande entry
  (draft/hand/poster-vyerna visar bara statiska kort, ingen ändring där).
- Ny CSS `.stat-n.buffed`/`.stat-n.debuffed` — samma grön/röd-palett som
  `.skill-pop.bonus`/`.bonus-negative` redan använder, bara textfärg +
  glöd istället för en hel badge. Ägar-ramfärgen (blå/röd) rörs inte —
  det är ägarskap, inte buff-status.
- Verifierat visuellt med en riktig skärmdump (ett kort med
  `captureBonus:3` visar 11/7/8/11 i grönt, ett annat med
  `sideBonus:{top:-2}` visar sin topp-siffra i rött) innan commit, inte
  bara testat i motorn.

Inga nya primitives — bara en ny renderingsväg för data som redan finns
(`captureBonus`/`sideBonus` fanns redan, bara aldrig lästa av
`cardFace`). Nytt test (`Board display: ...`) täcker
`effectiveStatFor`/`statNumHtml`-matematiken plus att `boardCellHtml`
faktiskt speglar en levande entrys bonus. Fullständig testsvit (82
tester) grön.

**51. Pallis (solo) — 3 nya skills, en medvetet struken** — elfte kortet
från audit-listan, hade `active:{shield:true}` (Loyal Heart) och en
fungerande Ultimate (`SPECIAL_HANDLERS.pallis`, Wave of Loyalty) redan
wired (2/6). Ingen AI-kopia (som Templaren/Tilda, campaign-only via
`unlockIds`). Stats 4/10/10/8 = 32, oförändrade.

- **Protective Aura** — ny `ON_PLACE_HANDLERS.pallis`, buntar ihop med
  Wolf Paw's Grip (samma "ingen sekundär-aktivering"-bunt-mönster som
  Vorgrath/Zalazar/Naline/Zlaizer/Tilda). Slumpad ADJACENT allierad
  (`adjacentEntries()`, samma hjälpare Shiva/Leviathan/Chocobo King/
  Templaren redan använder — till skillnad från Tildas Marked Target
  som är hela-brädet). "Kan inte förloras den här rundan" är en HELT NY
  temporär fångst-immunitetsstatus (`entry.protectiveAuraUntilTurnCount`,
  samma `xUntilTurnCount`-idiom som Umbral Step/Wrath Eruption), kollad
  inuti den DELADE `isShielded()`-funktionen tillsammans med
  `grantedShield`/`active.shield`/`conditionalShield` — till skillnad
  från en engångssköld blockerar den VARJE försök inom fönstret, inte
  bara det första, så den sätter aldrig `shieldUsed`.
- **Wolf Paw's Grip** — samma bunt. Slumpad riktning (samma mönster som
  Fenrir/Zalazar), fienden i den riktningen (om någon — bara en kan
  någonsin finnas per sida i ett 3×3-rutnät) får `entry.wolfPawSide`/
  `entry.wolfPawUntilTurnCount` satta, läst ovillkorligt i
  `fullEffectiveValue` (samma form som Tahabatas Wrath Eruption, bara
  en enda riktning istället för alla fyra grannar, och -2 istället för
  -1).
- **Chain of Loyalty** — ny `active.onWinChainCapture:true`, kopplad i
  `checkOnWinBonuses`. Slumpad angränsande fiende, "styrka" tolkad som
  den specifika RIKTADE sid-siffran (matchar all annan "facing"-
  terminologi i spelet), beräknad via den redan existerande
  `effectiveStatFor()`-hjälparen (byggd för bräd-visningen tidigare
  samma session — en live-brädentry har redan exakt samma
  `captureBonus`/`sideBonus`-form som `effectiveStatFor`s `opts`
  förväntar sig, så entryn kan skickas in direkt). Respekterar sköldar
  via samma `specialBlockedByShield()` alla envals-Ultimates redan
  använder (vilket automatiskt även respekterar Protective Aura ovan).
  **Viktig upptäckt under arbetet:** eftersom ALLA angränsande fiender
  redan slåss mot Pallis samtidigt vid hennes egen placering (samma
  jämförelse, samma sidor), kan Chain of Loyalty aldrig fånga något
  UTÖVER vad en vanlig strid redan skulle fånga i just det scenariot —
  dess verkliga värde uppstår när Pallis vinner en FÖRSVARS-strid
  (redan på brädet, en fiende attackerar och förlorar), då kan hon
  snärja en helt orelaterad, redan etablerad granne som aldrig var
  inblandad i den utlösande striden. Testad direkt via ett
  `checkOnWinBonuses(...)`-anrop (samma stil som andra direkta
  handler-tester) snarare än genom en fullständig placerings-strid, av
  precis den anledningen.
- **Loyal Heart, Wave of Loyalty** — oförändrade.
- **Loyal Instinct** — ❌ struken helt (inte byggd). Skulle krävt en helt
  ny reaktionsmekanik direkt i förlust-upplösningen i `battleNeighbors`
  (en omedelbar motattack precis efter att Pallis själv blivit
  erövrad) — inget liknande finns någonstans i motorn (kollat: samma
  läge som Pallis & Pells nästan identiska "Double Fury"-syskonskill,
  som aldrig byggdes av samma anledning). Samma "vi bygger inte
  specialsystem för ett enda kort"-princip som Templarens Shield Wall.

Inga nya generella primitives — `adjacentEntries()`, `specialBlockedByShield()`
och `effectiveStatFor()` fanns alla redan; Protective Aura/Wolf Paw's
Grip återanvänder det redan etablerade `xUntilTurnCount`-idiomet. Nytt
test täcker alla tre skills inklusive Chain of Loyaltys tre grenar
(fångar, misslyckas mot starkare, blockeras av sköld). Fullständig
testsvit grön.

**Uppdatering, samma session: ny godkänd konst mottagen och inlagd.**
Matchade allt exakt — stats 4/10/10/8, namn/roll, alla fem skill-texter
(inklusive Wave of Loyalty) ord för ord, ingen Loyal Instinct synlig.
Bekräftar samtidigt den redan existerande identiteten (tjej + trogen
hund-följeslagare, guld/jord-palett, skogsklippa med slott i bakgrunden)
som bildbriefen explicit bad att bevara — inte en omdesign. Inga
kodändringar. Flyttade full-bilden från det gamla GitHub-UUID-filnamnet
(`63AE7554-757F-459C-9ED0-727E68C8E12E.jpg`, borttaget) till
standardnamnet `card-pallis-full.jpg`. Ny beskuren `cards/card-pallis.jpg`
använder samma förhöjda beskärning som Templaren/Tilda/Tahabata
((10,60)-(930,660)) för att få med ansiktet och hunden istället för att
klippa av huvudet.

**55. NY FAS: "Game feel"/VFX-lager — fas 1 (ambient arena-liv), på
användarens initiativ, en helt annan sorts arbete än korten ovan.**
Användaren skickade en detaljerad engelsk vision för att göra spelet
kännas mer levande genom presentation/animation/effekter, EXPLICIT UTAN
att röra spellogik/balans/AI/regler. Nyckelkrav: bygg stegvis (litet,
testbart, reversibelt per steg — INTE hela visionen i ett svep), bygg
återanvändbara effekt-system snarare än hårdkodad engångskod, och håll
kontrasten mellan "lugnt normalt brädspel" och "kraftfulla ögonblick"
(Same/Combo/Ultimates senare — INTE i denna fas). Ljud explicit
uteslutet från fas 1.

**Fas 1-omfattning, exakt som beställt:** bara ambient bräd-atmosfär —
bakgrundsrörelse, atmosfäriska partiklar, mjuk magisk energi-rörelse,
ambient glöd/pulsering, lagerdjup, och en subtil hover-respons på
brädrutor. INGEN kombat/Ultimate-VFX än (det kommer i senare,
separata faser efter användarens egen speltestning av detta steget).

**Arkitektur-fynd innan kod skrevs** (viktigt för alla framtida VFX-
faser): HELA `#app`-trädet (inklusive `.arena-frame`/`.board`) byggs om
totalt vid varje `render()`-anrop (`app.innerHTML = html` — ingen
virtual-DOM-diffing alls i den här motorn). Det betyder att VILKEN SOM
HELST CSS-animation på ett element inuti `#app` startar om från 0 varje
gång render() körs. Det här är INTE en ny begränsning jag införde —
`.cell::before`s redan existerande `cellPulse`-animation (den ambienta
glöden på tomma rutor, fanns redan innan den här sessionen) gör exakt
samma sak och har uppenbarligen fungerat bra hela tiden, eftersom
render() är händelsestyrd (inte en kontinuerlig loop) — under den
faktiska "fundera på draget"-väntetiden (merparten av en match) körs
INGET render()-anrop alls, så en pågående animation spelar upp helt
ostört. Bara vid faktiska handlingar (kortplacering, AI-drag,
flip-sekvenser) startar animationerna om, vilket är ett acceptabelt
avbrott eftersom UPPMÄRKSAMHETEN redan är på annat håll då (det händer
redan mer på skärmen i de ögonblicken).

**Lösning för garanterat oavbruten rörelse ändå:** `.stage`-elementet
(den yttre statiska sidoskalet) omsluter `#app` men BYGGS ALDRIG OM AV
render() — bara `#app`s `.wrap`-inneh​åll ersätts. Ett nytt
`.stage-ambient`-lager las till som SYSKON till `#app` (skrivet en gång
i den statiska HTML-skalet, aldrig rört igen), så dess drivande
partiklar aldrig startar om oavsett hur ofta spelet renderar om sig.
`.wrap` fick `position:relative; z-index:1` tillagt (annars skulle det
nya absolut-positionerade `.stage-ambient`-lagret måla OVANPÅ hela
spel-UI:t enligt CSS stacking-regler, eftersom positionerade element
målas efter icke-positionerade oavsett DOM-ordning) — verifierat säkert
genom att kontrollera att INGEN befintlig `position:absolute`-avkomling
förlitar sig på `.stage` som sin containing block (alla har redan egna
`position:relative`-behållare: `.masthead`, `.arena-frame`, `.card`,
osv).

**Konkreta tillägg:**
- `.stage-ambient` + 4× `.stage-mote` (sidoskalet, aldrig ombyggt) —
  långsamt drivande gnistor i de fyra redan etablerade hörnfärgerna
  (ember/frost/arcane/earth), 22–28s cykler, olika delay per gnista för
  organisk känsla istället för synkron pulsering.
- `.arena-ambient` + 6× `.arena-mote` (inuti `.arena-frame`, byggs om
  vid render precis som `.cell::before` redan gör) — samma
  gnist-koncept men snabbare cykler (12–17s) och tätare inpå brädet.
- `.arena-rosette` fick en ny `rosetteBreathe`-animation (mjuk
  skala/opacitet-puls, 9s) ovanpå sin befintliga statiska SVG.
- `.cell:hover:not(.targetable)` — en mjuk guld-kantglöd på hover,
  medvetet EXKLUDERAD från `.targetable`-tillståndet så den aldrig
  konkurrerar med den befintliga, meningsbärande guld-pulsen där. Ren
  CSS `:hover`, ingen JS/state inblandad — kan alltså inte påverka
  klick-hantering över huvud taget, oavsett hur ofta render() kör.

**Verifiering:** hela testsviten (88 tester) grön, ingen ändring i
spellogik/AI/regler. Byggde dessutom ett fristående Playwright-skript
(inte i den permanenta sviten, kastat efter) som körde ett RIKTIGT
UI-klickflöde (klicka handkort → klicka bräd-ruta, inte
state-injicering) och tog skärmdumpar — bekräftade att hover-glöden
syns korrekt, att en riktig placering går igenom via DOM-klick precis
som innan, och att AI-motdraget löper på normalt efteråt. Alla nya
dekorativa lager har `pointer-events:none`.

**Stannar här per uttrycklig instruktion** — inga kombat/Ultimate-VFX,
inget ljud, ingen fortsättning till nästa fas utan att användaren
speltestat detta steget först.

**Uppdatering, samma session: fas 1 speltestad ("Kändes bra faktiskt",
inget negativt på mobilen heller — bara sett gnistorna röra sig) — fas
2 påbörjad direkt efter.**

**Fas 2: kortrespons + placerings-/erövringsimpact.** Samma
avgränsning som fas 1 (bara presentation, ingen spellogik), och samma
"pure CSS, triggat av redan existerande klasser"-teknik — INGEN
JS/markup ändrad alls den här gången, bara CSS på klasser
(`.selected`/`.placing`/`.flipping`) som redan sätts/tas bort av
befintlig kod. Maximalt reversibelt (en ren CSS-diff).

- **`.card.selected`** (handkort/draft-val) — bytte den statiska
  guld-kanten mot `scale(1.06)` + en pulserande `selectedGlow`-andning
  (1.3s). Medvetet INGEN `translateY`-lyft: på mobil
  (`@media max-width:640px`) blir handraden `.side-hand.hand-row` med
  `overflow-x:auto`, vilket enligt CSS overflow-specen även gör
  `overflow-y` till `auto` (bara EN axel får vara `visible`) — med bara
  1-2px padding där hade en vertikal lyft klippts av upptill. En
  center-ankrad `scale()` påverkar aldrig layout/overflow, bara
  compositing, så den är riskfri på alla skärmstorlekar.
- **`.cell .card.placing::after`** — ny `placeImpact`-blixt (radial
  vit/guld, 0.48s) synkad mot `cardLand`s egna "landning" vid 60%.
  Ny `::after`-pseudo-element, inget nytt DOM-element — begränsad av
  `.cell`s redan existerande `overflow:hidden` precis som allt annat
  inuti en ruta, så `scale(1.4)`-slutläget bara klipps naturligt vid
  rutkanten (läses som en stjärnbrist, inte en bugg).
- **`.cell .card.flipping::after`** — ny `flipSpark`-blixt vid flip-
  animationens redan existerande liggande-på-kant-ögonblick (45–55%,
  `rotateY(90deg)`), samma `--fx-delay` som `flip`/`captureRingBlue`/
  `captureRingRed` så den håller sig synkad även i staplade Same/Plus/
  Combo-kedjor.

**Verifiering:** hela testsviten (88 tester) grön igen. Samma
fristående Playwright-verifiering som fas 1 (riktiga DOM-klick, inte
state-injicering) — kortval, placering och en tvingad erövring
(anpassad state) kördes igenom utan konsolfel, existerande
"Erövrad"-banderoll lager fint ovanpå de nya blixtarna utan krock.

**Uppdatering, samma session: fas 2 speltestad direkt, gick vidare till
fas 3 samma dag.**

**Fas 3: Same/Combo-kedjekänsla.** Till skillnad från fas 1–2 (ren CSS,
inga JS-ändringar) krävde den här fasen faktisk motorlogik — första
riktiga JS-ändringen i hela game feel-initiativet, så den fick ett
riktigt permanent test i `tests/game.test.mjs` (till skillnad från
fas 1–2:s engångs-Playwright-skript som kastades efter verifiering).

- **Ny `--fx-step`-CSS-variabel**, parallell med den redan existerande
  `--fx-delay`. `fxDelay` (som redan fanns) capar vid `FX_STAGGER_CAP`
  (5 steg × 130ms) rent för TIMING-syften — annars skulle en riktigt
  lång kedja dra ut stagger-fördröjningen orimligt länge. `fxStep` är
  SAMMA råa, okappade räknare (`result.flipSeq`), sparad separat för
  INTENSITETS-skalning istället för timing. Satt på två ställen
  (`battleNeighbors`s per-granne-loop, samt `resolveFlips`s Same/Plus-
  loop) — båda delar samma `result.flipSeq`-räknare, så en hel
  placerings alla flippar (Same/Plus + vanlig strid + Combo-kedjan) får
  en kontinuerligt stigande sekvens.
- **`flipSpark`/`captureRingBlue`/`captureRingRed`** (från fas 2)
  skalar nu med `--fx-step` via `calc()` — opacitet/spridningsradie
  växer per steg i kedjan. Det här ger "första flippen skapar impact,
  efterföljande flippar eskalerar, sista flippen känns starkast" HELT
  GRATIS, utan att behöva identifiera/tagga vilken specifik entry som
  är "sista flippen" — det faller ut naturligt ur en kontinuerlig
  eskalering baserad på position i sekvensen. En ensam vanlig erövring
  (`--fx-step` ospecificerad → `var(--fx-step,0)` → 0) ser exakt ut som
  innan den här fasen.
- **Screen shake för stora kedjor** — ny `state.chainShake`-flagga,
  satt i `placeCard` när `result.sameOrPlus + result.combo >= 4`
  (medvetet INTE bara `result.flips >= 4`, så en vanlig placering som
  råkar besegra alla 4 grannar via helt vanliga styrke-strider ALDRIG
  skakar — bara riktiga Same/Plus/Combo-kedjor gör det, matchar
  användarens "particularly large chain reactions"-formulering).
  `.arena-frame.chain-shake` — ren `transform`-baserad `chainShake`-
  keyframe (0.42s, avtagande amplitud). Rensas i den REDAN
  EXISTERANDE 500ms `justPlaced`-timeouten (inte den senare 1300ms-
  timeouten) — annars hade den 1300ms-timeoutens egen `render()`
  startat om shake-animationen mitt i, eftersom hela `#app`-trädet
  byggs om vid varje render (samma restart-on-render-princip som
  dokumenterad i fas 1/2).
- `state.chainShake:false` tillagt i det initiala `state`-objektet
  samt i `resetGame()`s fältlista, för konsekvens.
- AI:t (`enemyTurn` → `placeCard`) delar EXAKT samma kodväg som
  spelarens placeringar — ingen separat AI-specialhantering behövdes,
  stora kedjor känns lika impactful oavsett vem som orsakar dem.

**Verifiering:** ett nytt permanent test (89 totalt nu) bygger en
deterministisk 4-vägs Same-fångst (alla fyra grannars vända kant matchar
det placerade kortets motsvarande sida, samtliga femmor) via den
RIKTIGA `placeCard()`/`resolveFlips()`-koden (ingen handsimulerad
kedjelogik) och verifierar: alla fyra fångade, `chainShake` sant direkt
efteråt, alla fyra flippar fick distinkta `fxStep`-värden 0–3,
`chainShake` rensat efter ~500ms, `fxStep` rensat efter 1300ms. Hela
testsviten grön (89/89).

**Fas 4: Ultimates som "major events".** Första fasen som INTE bara är
CSS/DOM-tillägg — kräver en genuin JS-omstrukturering av
`runSpecialResolution` (den enda delade funktion VARENDA Ultimate redan
går igenom, oavsett kort — bygger man ramverket där får alla kort det
gratis, inget per-kort-arbete). Användaren godkände explicit
"förväntanspausen"-avvägningen jag flaggade innan jag byggde ("Kör på
det med förväntanspausen").

**Sekvens (`playUltimateSequence`, ny funktion):**
1. **Cast** — banderoll med Ultimate-namnet glider in ("SPECIAL ATTACK
   / <namn>"), det castande kortet får en pulserande `ultimate-casting`-
   glöd. Brädet är HELT ORÖRT här — ingen effekt har körts än.
2. Vänta `ULTIMATE_WINDUP_MS` (950ms) — den faktiska
   "förväntanspausen".
3. **Impact** — NU körs den riktiga `handler()` (exakt samma kod som
   innan denna fas, bara flyttad bakom fördröjningen), banderollen byter
   till impact-läge (pop + uttoning), samma `chainShake`-mekanism som
   fas 3 återanvänds om Ultimaten fångade ≥3 kort.
4. Efter `ULTIMATE_SHAKE_MS` (500ms): `chainShake` rensas.
5. Efter `ULTIMATE_CLEANUP_MS` (1300ms från steg 3): all fx-state
   rensas (samma cleanup som redan fanns), banderollen försvinner,
   `maybeEndTurn(owner)` körs (flyttad hit från att tidigare köras
   direkt/synkront).

**Vins-avdrag och `specialUsed`-markering förblir OFÖRÄNDRADE (synkrona,
omedelbara)** — bara `handler()`-anropet och allt nedströms det sköts
upp. Avgörande för `enemyTurn`s `while(enemyTryUseSpecial()){}`-loop:
den kollar kostnad/specialUsed synkront varje varv, så genom att hålla
DE kollarna omedelbara fortsätter loopen terminera korrekt även fast
den VISUELLA sekvensen nu tar ~2.7s per Ultimate istället för att vara
klar direkt.

**Kö-mekanism för överlappande casts** (`ultimateQueue`/
`ultimateBannerToken`, samma tokens-mönster som redan etablerade
`showConquestPopup`/`conquestPopupToken`) — om ett andra
`runSpecialResolution`-anrop kommer in medan `state.ultimateBanner`
redan är satt (t.ex. AI:ts while-loop som kan trigga flera specials i
en enda synkron svep, eller i princip överlappande spelarhandlingar),
köas det istället för att krocka — spelas upp sekventiellt efter att
det första helt avslutats, inte samtidigt.

**Interaktionsspärr under sekvensen** — lade till `!state.ultimateBanner`
i alla spelar-klickhanterare (handkort-val, rutklick, `executeSpecial`s
`ready`-koll, `endPlayerTurn`) så spelaren inte kan trigga en NY
handling medan en Ultimate spelar upp. Medvetet INTE tillagt i
`specialUsable()`/`executeSpecial()` själva (de anropas även av AI:t,
och en global spärr där hade tystat AI:ts kö-läggning helt — bara
UI-ingångspunkterna en människa faktiskt klickar på spärrades).

**Ny CSS**: `.card.ultimate-casting` (pulserande lila/guld-glöd, skild
från `.special-active` som bara gäller under målval, redan över när
denna triggar), `.ultimate-banner` + `.ultimate-banner-cast`/
`-impact`-faser. Banderollen är TVÅ olika DOM-element över sekvensen
(samma restart-on-render-fakta som resten av game feel-arbetet), men
designade att se kontinuerliga ut: cast-fasen slutar hållen vid full
synlighet (`animation-fill-mode` via `both`), impact-fasen BÖRJAR vid
exakt samma synliga läge innan den poppar och tonar ut — övergången
mellan de två renderingarna landar på matchande bildrutor så skarven
inte syns.

**Testuppdatering, inte bara tillägg:** eftersom `runSpecialResolution`
inte längre löser ut synkront var sex BEFINTLIGA tester tvungna att
uppdateras (inte bara nya tester tillagda) — alla som anropade
`runSpecialResolution`/`enemyTryUseSpecial` och läste resultatet direkt
i samma synkrona block fick lägga till `await new Promise(r =>
setTimeout(r, ULTIMATE_WINDUP_MS + 50))` innan de läser resultatet.
Ett nytt permanent test (90 totalt) verifierar hela sekvensen end-to-end
(cast-fas orörd bräde, vins-avdrag ändå omedelbart, impact-fas löst
effekt, cleanup rensar banderoll) PLUS kö-beteendet (två casts back-to-
back resulterar i sekventiell, inte överlappande, uppspelning). Hela
testsviten grön (90/90). Verifierat även med ett fristående
Playwright-skript som klickade igenom en RIKTIG UI-sekvens (tryck på
ett redo special-kort, kolla banderoll mitt i väntetiden, försök klicka
en annan ruta — spärrat — vänta ut hela sekvensen) med skärmdumpar av
varje fas.

**Fas 4b: uppläst Ultimate-namn via `speechSynthesis`** — direkt
uppföljning samma session, på användarens idé ("hade varit coolt om
man kunde höra en röst som säger ultimatens namn när den läggs"). Ny
`announceUltimate(name)`-funktion, anropad i `playUltimateSequence`s
cast-fas (samma ställe banderollen redan visas), läser `special.name`
via webbläsarens inbyggda text-till-tal — inga nya ljudfiler/asset-
pipeline behövs, samma anda som resten av spelets procedurella
Web Audio-ljud (`tone()`/`SFX`). Respekterar den befintliga
`soundOn`-flaggan (samma på/av-växel som all annan SFX) och är
inbäddad i `try/catch` eftersom `speechSynthesis` kan saknas eller
kasta i ovanliga webview-miljöer — ren smak, får aldrig kunna knäcka
själva Ultimate-sekvensen. Medvetet INGET `speechSynthesis.cancel()`
före varje anrop: webbläsarens egen uttal-kö spelar redan flera anrop
i följd istället för att överlappa, vilket redan matchar
`playUltimateSequence`s egen visuella kö (`ultimateQueue`) — nästa
Ultimates windup startar aldrig förrän föregåendes hela sekvens är
klar, så två annonseringar kan i praktiken aldrig krocka ändå.

Explicit avvägning kommunicerad och godkänd innan bygget: detta är
webbläsarens generiska systemröst (robotisk, olika låt på olika
enheter), inte en riktig "hallåman"-röst — det hade krävt inspelade/
genererade ljudfiler per Ultimate-namn, en helt egen asset-pipeline
som inte finns i spelet idag. Medvetet vald som snabbt första steg
istället.

**Verifiering:** ett nytt permanent test (91 totalt) spionerar på
`speechSynthesis.speak` och bekräftar att den anropas med exakt
Ultimate-namnet när `soundOn` är sant, och INTE alls när `soundOn` är
falskt. Manuellt verifierat i en riktig sida (inte bara state-
injicering) att `runSpecialResolution` faktiskt triggar ett `speak()`-
anrop med rätt text. Hela testsviten grön (91/91).

**Uppdatering, samma session: användaren hörde inget alls vid riktig
speltestning, plus en specifik leverans-riktning.** Två separata
saker att lösa:

1. **Buggfix — troligen Chrome's kända "tyst GC"-fel.** Den ursprungliga
   koden skapade `SpeechSynthesisUtterance`-objektet som en ren lokal
   variabel utan någon extern referens — ett väldokumenterat Chrome-fel
   gör att ett sådant objekt kan garbage-collectas tyst INNAN
   `speak()` hinner faktiskt läsa upp det (anropet lyckas, inget
   kastar fel, men inget hörs). Löst genom en modul-nivå
   `lastAnnounceUtterance`-variabel som håller en levande referens —
   standardlösningen för det här specifika felet.
2. **Leverans-riktning** (inte röstkaraktär — se distinktionen nedan):
   "deep fantasy, gender-neutral, slightly synthetic, ancient and
   powerful, calm but threatening... slow, heavy, controlled. Short
   dramatic pause before the word." Justerat vad som GÅR att justera
   via `speechSynthesis`: `rate` sänkt till 0.72 (från 0.9), `pitch`
   sänkt till 0.55 (från 0.8, betydligt djupare men fortfarande
   begripligt — mycket lägre och vissa röster börjar låta trasiga
   istället för bara djupare), och en inledande "…" i texten som de
   flesta TTS-motorer tolkar som en kort dramatisk paus innan ordet.

   **Viktig gräns kommunicerad till användaren:** detta justerar
   LEVERANS (tempo/tonhöjd/paus), INTE röstKARAKTÄR (vilken specifik
   röst som talar — "ancient and powerful", "slightly synthetic" som
   en distinkt klangfärg). Den faktiska rösten är vad som råkar finnas
   installerat på användarens enhet, helt utanför den här kodens
   kontroll. En riktig matchning av den beskrivna känslan hade krävt
   inspelade/genererade ljudlinjer per Ultimate-namn (se den redan
   dokumenterade avvägningen i fas 4b:s första sektion ovan) — inte
   ändrat i det här passet, bara flaggat igen som gränsen för vad
   `speechSynthesis`-vägen kan leverera.

Testet uppdaterat för den nya "… namn."-textformen (kollar att namnet
finns MED i den upplästa texten, inte exakt match). Hela testsviten
grön (91/91).

**Uppdatering, samma session: rösten struken helt.** Efter buggfixen
hördes rösten (bekräftat), men kvaliteten var för dålig för att vara
värd det — "Det funkar men det låter inte bra". Erbjöd tre vägar
(mjuka upp TTS-inställningarna / bygg riktiga ljudfiler / strunta i
rösten helt); användaren valde att strunta i den helt. `announceUltimate`-
funktionen, `lastAnnounceUtterance`-variabeln och anropet i
`playUltimateSequence` togs bort igen, liksom det tillhörande testet
(tillbaka till 90 totalt). Banderollen/glöden (fas 4) påverkas inte
— bara röstdelen är borta. Om röst ska tas upp igen någon gång är
slutsatsen redan dragen: börja direkt med riktiga ljudfiler, inte
`speechSynthesis` — den här sessionen visade tydligt att
webbläsarens generiska TTS inte håller måttet för känslan spelet vill åt.

**Fas 4c: riktig röstlinje (ElevenLabs) för Ifrit — samma session,
den utlovade "riktiga ljudfiler"-vägen från fas 4b:s slutsats.**
Användaren laddade upp en egen ElevenLabs-genererad ljudfil ("Kan vi
använda denna till ifrit ?"), matchande Ifrits Ultimate-namn
("Hellfire"). Filen kopierad in i repot som `voices/ifrit.mp3`
(32948 bytes, MPEG layer III, mono, 128kbps/44.1kHz — verifierat med
`file`).

Byggd som ett återanvändbart ramverk istället för en hårdkodad
engångslösning åt bara Ifrit, i linje med hela fasens princip om
generella system: en `ULTIMATE_VOICE_LINES`-mapping (kort-id →
ljudfilsväg) plus en `playUltimateVoiceLine(cardId)`-funktion som slår
upp kortets id i mappingen och spelar upp filen via `new Audio(src)`
om en post finns, annars gör den ingenting. Framtida kort får en röst
genom att bara lägga till en rad i mappingen och en ljudfil i
`voices/` — ingen ny kod krävs. Respekterar `soundOn` precis som all
annan SFX, och `audio.play()`s promise-rejection fångas tyst (samma
"ren smak, får aldrig krascha sekvensen"-princip som fas 4b).
Anropas i `playUltimateSequence`s cast-fas, samma plats
`announceUltimate` satt tidigare (nu borttaget).

**Verifiering:** ett nytt permanent test (91 totalt) spionerar på
`window.Audio` och bekräftar tre saker: `playUltimateVoiceLine('ifrit')`
spelar exakt `voices/ifrit.mp3`; ett kort utan mapping-post (t.ex.
Pallispell) spelar ingenting; `soundOn = false` tystar den precis som
all annan SFX. Ett andra delprov kör igenom hela den riktiga
cast-vägen (`runSpecialResolution` → `playUltimateSequence`) istället
för att bara testa hjälpfunktionen isolerat, för att bekräfta själva
kopplingen. Verifierat även manuellt med ett fristående
Playwright-skript som klickade igenom en RIKTIG UI-sekvens (aktivera
Ifrits special, välj mål, kolla att `window.Audio` triggades mitt i
väntetiden med rätt filväg, skärmdump av banderollen "Special Attack
— Hellfire") samt en riktig `fetch('voices/ifrit.mp3')` som bekräftade
att filen faktiskt går att hämta från servern (200, audio/mpeg, exakt
byte-match). Hela testsviten grön (91/91).

**Uppdatering, samma session: samma sak för Nyxara.** Användaren
laddade upp en andra ElevenLabs-fil ("Till nyxara"), matchande hennes
Ultimate-namn ("Void Dominion"). Filen kopierad in som
`voices/nyxara.mp3` (38799 bytes, samma format som Ifrits fil).
Eftersom ramverket redan byggdes återanvändbart i fas 4c behövdes bara
en ny rad i `ULTIMATE_VOICE_LINES` (`nyxara: 'voices/nyxara.mp3'`) —
ingen ny kod. Testet utökat till att täcka båda korten, inklusive att
verifiera den riktiga cast-vägen för BÅDA targeting-lägena (Ifrits
`targets:'single'` med explicit targetIndex, och Nyxaras
`targets:'aoe'` med `targetIndex: null`, precis som `executeSpecial`
faktiskt anropar den). Verifierat även manuellt med en riktig
UI-klick-sekvens (Nyxaras special är AOE så ett enda klick på hennes
egen ruta aktiverar OCH löser ut den direkt, ingen separat mål-klick
behövs) — bekräftade att `window.Audio` triggades med
`voices/nyxara.mp3` och att banderollen visade "Void Dominion", samt
att fiendekortet faktiskt förstördes (Nyxaras AOE förstör, fångar
inte). Hela testsviten grön (91/91, fortfarande samma antal — samma
test utökat, inget nytt test tillagt).

**Uppdatering, samma session: samma sak för Vaelira.** Tredje
ElevenLabs-filen ("Lägg till Vaelira"), matchande hennes Ultimate-namn
("Infernal Pact", också AOE precis som Nyxaras). Filen kopierad in som
`voices/vaelira.mp3` (38799 bytes). Igen bara en ny rad i
`ULTIMATE_VOICE_LINES` (`vaelira: 'voices/vaelira.mp3'`) — ramverket
bär hela vikten. Isolerade hjälpfunktions-testet utökat med Vaelira
(samma mönster som Ifrit/Nyxara); ingen separat cast-vägs-verifiering
tillagd för henne i testsviten eftersom hennes AOE-flöde är mekaniskt
identiskt med Nyxaras redan täckta `targets:'aoe'`-väg — hade bara
dubblerat samma assertion. Verifierat manuellt med en riktig
UI-klick-sekvens precis som Nyxara (enda klicket aktiverar och löser
ut AOE:n direkt) — bekräftade `window.Audio`-anrop med
`voices/vaelira.mp3`, banderoll "Infernal Pact", och att
fiendekortet förstördes. Hela testsviten grön (91/91).

**Uppdatering, samma session: samma sak för Seraphine — alla tre
systrarna (Vaelira/Nyxara/Seraphine) har nu röstlinjer.** Fjärde
ElevenLabs-filen ("Seraphine"), matchande hennes Ultimate-namn ("Silver
Judgment", också AOE). Filen kopierad in som `voices/seraphine.mp3`
(samma format/storleksordning som de andra). Fjärde raden i
`ULTIMATE_VOICE_LINES` (`seraphine: 'voices/seraphine.mp3'`) — inget
annat i koden ändrat. Isolerade hjälpfunktions-testet utökat med
Seraphine, samma mönster som Vaelira (ingen separat cast-vägs-
verifiering, hennes AOE-flöde är mekaniskt samma väg som redan
täckt). Verifierat manuellt med samma UI-klick-sekvens — bekräftade
`window.Audio`-anrop med `voices/seraphine.mp3`, banderoll "Silver
Judgment". (Vid det här laget stryper Silver Judgment fortfarande
bara bonusar/-2 Power istället för att förstöra som sina systrar —
se nästa uppdatering nedan där det ändras.) Hela testsviten grön
(91/91).

**Uppdatering, samma session: Silver Judgment gjord om till ett
riktigt förstör-allt, på användarens egen begäran** ("Can you do so
she destroys enemy cards? Like it [does for the other sisters'
cards]"). En riktig spelmekanik-ändring, inte VFX/game-feel — Seraphine
matchar nu sina systrar Vaelira (Infernal Pact) och Nyxara (Void
Dominion): `SPECIAL_HANDLERS.seraphine` skriven om att gå igenom
`state.board`, förstöra varje fiendekort som inte är
`isDestroyImmune` via `destroyCard()`, och respektera samma
`protectedByInfiniteSeraph`-spärr som systrarna redan hade. Den gamla
strip-bonus/-2 Power-logiken är helt borttagen (inget hybrid-läge —
förstörda kort behöver ingen debuff). Ingen extra bonus (ingen extra
sväng som Vaelira, ingen Power-boost som Nyxara) lades till, eftersom
det inte efterfrågades — höll ändringen minimal och matchad mot vad
som faktiskt begärdes. Kortets `skills`-text uppdaterad i båda
kopiorna av kortdatat (HEROES/FOREST_FOES-arrayerna) till "Costs 2
wins. Destroys every enemy card on the board. Usable once per match."

**Verifiering:** befintliga testet döpt om och utökat med tre nya
kontroller — Silver Judgment förstör fiender men skonar allierade,
meddelandet nämner förstörelse, och Infinite Seraphs Eternal Presence
blockerar den precis som för Vaelira/Nyxara. Det gemensamma
Graveyard-testet ("every destroy-capable Special routes through
destroyCard()") utökat med Seraphine också, eftersom hon nu
kvalificerar. Verifierat även manuellt med en riktig UI-klick-sekvens
— fiendekortet visar "Destroyed!"-overlayen och försvinner (blir
`null`) från brädet, stridsloggen säger "Seraphine's Silver Judgment
burns 1 enemy card away with pure light!". Hela testsviten grön
(91/91, samma antal — befintliga tester utökade, inget nytt testfall
tillagt).

**Uppdatering, samma session: röstlinje för Triune Desire (Forbidden
Harmony) — femte kortet, alla fyra systrarnas kort (inklusive den
fusionerade fjärde formen) har nu röstlinjer.** Femte ElevenLabs-filen
("Forbidden harmony"), matchande hennes Ultimate-namn. Filen kopierad
in som `voices/triunedesire.mp3`. Femte raden i
`ULTIMATE_VOICE_LINES` (`triunedesire: 'voices/triunedesire.mp3'`) —
samma ramverk, ingen ny kod. Isolerade hjälpfunktions-testet utökat
med Triune Desire, samma mönster som de andra. Verifierat manuellt med
samma UI-klick-sekvens (hennes special är också AOE) — bekräftade
`window.Audio`-anrop med `voices/triunedesire.mp3` och banderoll
"Forbidden Harmony". Hela testsviten grön (91/91).

**Uppdatering, samma session: användaren bad om rekommendation för
nästa omgång röstlinjer.** Föreslog de andra stora "Ultimate-momenten"
med samma tunga banderoll-presentation (Tiamat/Three Head
Dragon/Bahamut/Omega Weapon) istället för vanliga händelser (placering/
fångst), eftersom vanliga ljud skulle konkurrera med de procedurella
tonerna från fas 1–3 istället för att förstärka känslan. Gav
Ultimate-namnen i versaler på begäran (MEGAFLARE/THE FIVEFOLD
APOCALYPSE/APOKALYPS/OMEGA PROTOCOL) så användaren kunde generera
filerna själv i ElevenLabs.

**Uppdatering, samma session: röstlinje för Bahamut (Megaflare) —
sjätte kortet.** Sjätte ElevenLabs-filen ("MEGAFLARE"). Filen kopierad
in som `voices/bahamut.mp3`. Sjätte raden i `ULTIMATE_VOICE_LINES`
(`bahamut: 'voices/bahamut.mp3'`). Isolerade hjälpfunktions-testet
utökat med Bahamut. Verifierat manuellt med samma UI-klick-sekvens
(hans special är också AOE) — bekräftade `window.Audio`-anrop med
`voices/bahamut.mp3`, banderoll "Megaflare", och att fiendekortet
förstördes. Hela testsviten grön (91/91).

**Uppdatering, samma session: röstlinje för Tiamat (The Fivefold
Apocalypse) — sjunde kortet.** Sjunde ElevenLabs-filen ("THE FIVEFOLD
APOCALYPSE"). Filen kopierad in som `voices/tiamat.mp3`. Sjunde raden
i `ULTIMATE_VOICE_LINES` (`tiamat: 'voices/tiamat.mp3'`). Till
skillnad från de tidigare AOE-korten har Tiamats special
`targets:'single'` PLUS ett extra val-steg (`TIAMAT_POWER_CHOICES` —
Fire/Ice/Storm/Void/Nature), så verifieringen kör hela den riktiga
3-stegs UI-sekvensen (klicka Tiamats ruta → klicka målrutan → klicka
"Fire" i choice-pickern) istället för ett enda klick som systrarna.
Bekräftade `window.Audio`-anrop med `voices/tiamat.mp3` mitt i
väntetiden och banderoll "The Fivefold Apocalypse". Isolerade
hjälpfunktions-testet utökat med Tiamat (bara den enkla
mapping-kontrollen, ingen separat 3-stegs-verifiering i den
permanenta testsviten eftersom `runSpecialResolution` redan anropas
direkt där, samma mönster som övriga kort). Hela testsviten grön
(91/91).

**Uppdatering, samma session: röstlinje för Three Head Dragon
(Apokalyps) — åttonde kortet.** Åttonde ElevenLabs-filen
("APOKALYPS"). Filen kopierad in som `voices/threeheaddragon.mp3`.
Åttonde raden i `ULTIMATE_VOICE_LINES`
(`threeheaddragon: 'voices/threeheaddragon.mp3'`). Verifierat manuellt
med samma enkla UI-klick-sekvens (hennes special är AOE) — bekräftade
`window.Audio`-anrop med `voices/threeheaddragon.mp3`, banderoll
"Apokalyps", och att fiendekortet fick -3 Power (debuff, inte
förstörelse — matchar hennes redan existerande mekanik, till skillnad
från systrarnas/Bahamuts destroy-all). Isolerade hjälpfunktions-testet
utökat med Three Head Dragon. Hela testsviten grön (91/91).

**Uppdatering, samma session: röstlinje för Omega Weapon (Omega
Protocol) — nionde kortet, sista av de fyra rekommenderade "Ultimate-
moment"-korten.** Nionde ElevenLabs-filen ("OMEGA PROTOCOL"). Filen
kopierad in som `voices/omegaweapon.mp3`. Nionde raden i
`ULTIMATE_VOICE_LINES` (`omegaweapon: 'voices/omegaweapon.mp3'`).
Verifierat manuellt med samma enkla UI-klick-sekvens (hans special är
AOE) — bekräftade `window.Audio`-anrop med `voices/omegaweapon.mp3`,
banderoll "Omega Protocol", och att det svaga testkortet förstördes
(Omega Protocol debuffar -3 och förstör sedan alla fiender vars
svagaste sida hamnar på 5 eller lägre). Isolerade
hjälpfunktions-testet utökat med Omega Weapon. Hela testsviten grön
(91/91). Med detta har alla fyra föreslagna korten (Tiamat/Three Head
Dragon/Bahamut/Omega Weapon) röstlinjer, utöver Ifrit och alla fyra
systrar — 9 kort totalt.

**Fas 4d: Ifrit fick en egen "impact"-ljudeffekt, en NY sorts asset
utöver röstlinjerna.** Användaren gjorde själv en kort ("Powerful
demonic fire", ~1 sekund) ljudeffekt till Hellfire och laddade upp den
("Jag gjorde denna ljud effekt till ifrits hellfire så man hör och ska
se effekten") — till skillnad från de tidigare filerna är det inte en
uttalad Ultimate-namn-röst utan en kort "whoosh/eld"-effekt, tänkt att
höras SAMTIDIGT som den visuella effekten (fångst/förstörelse) syns,
inte under väntetiden när namnet visas. Filens korta längd (25389
bytes @ 192kbps ≈ 1s) bekräftade den tolkningen jämfört med de
betydligt längre röstlinjerna.

Byggde ett nytt, separat, lika återanvändbart ramverk parallellt med
`ULTIMATE_VOICE_LINES`: `ULTIMATE_IMPACT_SFX` (kort-id → ljudfilsväg,
i en ny `sfx/`-mapp för att hålla isär från `voices/`) plus
`playUltimateImpactSfx(cardId)`, identisk struktur (samma
`soundOn`-koll, samma tysta `try/catch`). Skillnaden är VAR den
anropas i `playUltimateSequence`: `playUltimateVoiceLine` körs i
cast-fasen (fas 1, väntetiden), `playUltimateImpactSfx` körs i
impact-fasen (fas 3, precis efter `handler()` faktiskt kört och
banderollen bytt till "impact") — samma ställe som `SFX.bonus()`
redan spelas, som ett extra lager ovanpå istället för en ersättning.
Filen kopierad in som `sfx/ifrit.mp3`.

**Verifiering:** ett nytt permanent test (92 totalt, första ökningen
sedan 91 — detta är en egen mekanism, inte bara ännu ett kort i samma
mapping, så det fick ett eget testfall istället för att pressas in i
röstlinje-testet) bekräftar: `playUltimateImpactSfx('ifrit')` spelar
`sfx/ifrit.mp3`; ett kort utan entry (Nyxara) är tyst; `soundOn=false`
tystar den. Ett andra delprov kör den riktiga cast-vägen och läser av
`window.Audio`-anropen VID TVÅ TIDPUNKTER — direkt efter anropet
(endast röstlinjen ska synas än) och efter att windup-tiden gått ut
(nu ska både röstlinjen OCH impact-SFX:en synas) — för att bevisa att
tajmingen faktiskt skiljer sig åt, inte bara att båda till slut
spelas. Verifierat även manuellt med en riktig UI-klick-sekvens: läste
av `window.Audio`-anropen både mitt i väntetiden (bara röstlinjen) och
efter att impact-fasen inträffat (båda ljuden), plus en riktig
`fetch('sfx/ifrit.mp3')`-kontroll (200, audio/mpeg, exakt byte-match).
Hela testsviten grön (92/92).

**Uppdatering, samma session: samma impact-SFX för Nyxara (Void
Dominion).** Användaren gjorde en andra egen ljudeffekt ("Massive dark
void", ~2s) och laddade upp den ("Detta är till void dominon nyxara").
Filen kopierad in som `sfx/nyxara.mp3`. Andra raden i
`ULTIMATE_IMPACT_SFX` (`nyxara: 'sfx/nyxara.mp3'`) — samma ramverk
från fas 4d, ingen ny kod. Det befintliga fas 4d-testet utökat (inte
ett nytt testfall) med Nyxaras mapping-kontroll OCH en fullständig
riktig cast-vägs-verifiering för hennes AOE-flöde (samma
timing-distinktion som Ifrit: bara röstlinjen under väntetiden, båda
ljuden efter). Verifierat manuellt med samma UI-klick-sekvens (hennes
special är AOE, ett enda klick) — bekräftade `window.Audio`-anrop med
`sfx/nyxara.mp3` exakt vid impact-fasen (inte under väntetiden),
skärmdump visar "Destroyed!"-overlayen och banderollen "Void
Dominion" samtidigt. Hela testsviten grön (92/92, samma antal —
befintligt testfall utökat).

**Fas 4e: Nyxaras Void Dominion fick en egen "element-identitet"-VFX,
explicit märkt av användaren som ett engångstest** ("Testa Nyxara –
Void Dominion VFX... Detta är bara ett visuellt test för Void
Dominion. Ändra inget annat."). Detta är samma "element-specifika
VFX-identiteter"-fas som nämndes redan i den ALLRA FÖRSTA
visionsdokumentet i den här fasen (se punkt 55 längst upp), nu
påbörjad som ett konkret första exempel snarare än ett generellt
system för alla kort — medvetet scopead till bara Nyxara/Void
Dominion, ingen ny kod för andra kort.

Kravlistan (från användaren, alla uppfyllda):
- Mörk/lila void-energi runt Nyxaras eget kort — ny `.card.void-
  dominion-casting`-klass, samma "slot"/z-index som den redan
  existerande generiska `.card.ultimate-casting`-glöden men en egen
  mörkare lila `voidDominionCardAura`-keyframe. Lagd till SOM ETT
  TILLÄGG (samma `opts.ultimateCasting`-flagga, bara en extra klass
  när `card.id === 'nyxara'`), inte en ersättning — alla andra
  Ultimates behåller sin generiska glöd orörd.
- Spelplanen mörknar subtilt — ny `.void-dominion-dark`-overlay,
  positionerad BAKOM `.board` (z-index:0, `.board` är z-index:1) så
  den aldrig mörklägger själva korten, bara ramen runt/mellan dem.
- Verklighetsspricka/void-våg över hela spelplanen — ny `.void-crack`,
  en ring som exploderar utåt från Nyxaras faktiska cell-position
  (beräknad från `state.ultimateBanner.sourceIndex`, inte hårdkodad)
  under impact-fasen, skalar upp långt förbi brädets egna kanter.
- Partiklar dras mot voiden — 8 st `.void-particle`-element med egna
  `--px`/`--py`-startpositioner (samma "deterministisk per-element
  stagger"-teknik som `.arena-mote` redan använder, fast radiellt
  istället för vertikal drift), dras in mot Nyxaras cell under
  cast-fasen (laddar upp, sedan spricker).
- Kort impact/screen shake — återanvänder den BEFINTLIGA
  `.arena-frame.chain-shake`-mekanismen från fas 3 rakt av (precis vad
  uppgiften bad om: "Använd befintligt Ultimate-event/triggersystem om
  det finns"). Krävde en liten men nödvändig utökning:
  `capturedCount` räknas via `justFlipped` (en FÅNGST-flagga), men
  Void Dominion FÖRSTÖR (via `destroyCard()`), sätter aldrig
  `justFlipped` — utan ändringen hade `capturedCount` alltid varit 0
  och skaket aldrig triggat. Explicit opt-in tillagd:
  `if(capturedCount >= 3 || special.name === 'Void Dominion')`.
- Snabb sekvens (~1-2s) som återgår till normalt — bygger HELT på den
  redan existerande cast→impact→cleanup-livscykeln i
  `playUltimateSequence` (windup 950ms + cleanup 1300ms = 2.25s totalt,
  samma timing som varje annan Ultimate redan har) — inga nya timers,
  ingen ny `state`-flagga ens: `voidDominionActive` beräknas rent
  deriverat i `renderBattle()` från `state.ultimateBanner.name ===
  'Void Dominion'`, försvinner automatiskt med samma befintliga
  cleanup som redan rensar banderollen.
- Ingen spellogik ändrad — `chainShake` är en ren CSS-klass, rör
  varken vinster, bräde eller AI. Alla nya CSS-klasser/element är
  `pointer-events:none` och `aria-hidden`, ren presentation.
- Prestanda/läsbarhet — bara 8 fasta DOM-element (inga JS-
  animationsloopar), och samma "tunn, låg opacitet, kortlivad"-princip
  som `flipSpark`/`captureRingBlue`/`captureRingRed` redan etablerat —
  siffror och text på korten förblir fullt läsbara genom hela
  sekvensen (verifierat visuellt via skärmdumpar).

**Verifiering:** ett nytt permanent test bekräftar hela livscykeln via
en riktig `runSpecialResolution`-anrop (inte bara state-injicering,
riktiga DOM-queries mot de faktiska elementen): under cast-fasen finns
mörkläggningen, fx-wrappern (med `--void-x`/`--void-y` som matchar
Nyxaras faktiska cell — testad mot cell 0, top-left, vilket ska ge
~16.67%/16.67%), kortets egen lila-aura-klass, och alla 8 partiklar;
brädet är fortfarande orört (samma anticipation-pause-garanti som
alla andra Ultimates). Efter windup-tiden: effekten har landat
(fiendekortet förstört), mörkläggningen och fx-wrappern har växlat
till sina impact-klasser, och `chainShake` har triggat TROTS att
`capturedCount` är 0 (den explicita opt-in fungerar). Efter hela
cleanup-tiden: allt borta, `chainShake` återställd, banderollen borta
— identiskt med varje annan Ultimates städning. Ett sista kontroll
bekräftar att Ifrits Hellfire INTE får någon av dessa element/klasser
— scopead strikt till Nyxaras kort-id plus hennes exakta
Ultimate-namn. Verifierat även manuellt med riktiga UI-klick-
sekvenser och skärmdumpar i tre lägen (mitt i cast med synliga
partiklar, vid impact med den expanderande spricku-ringen och
"Destroyed!"-overlayen, samt en explicit kontroll att korten förblir
läsbara). Hela testsviten grön (93/93, +1 nytt test).

**Fas 4f: Ifrit fick samma sorts "element-identitet"-VFX för Hellfire,
igen explicit märkt som ett engångstest** (samma format som Nyxara-
begäran, skickat "till Claude" i tredje person men riktat till samma
session/repo). Samma mönster som fas 4e, denna gång eld/lava-tema och
med en viktig skillnad: Hellfire är `targets:'single'` (väljer ett
angränsande fiendekort), inte AOE som Void Dominion — kravlistan
efterfrågade explicit BÅDE en spelplans-omfattande våg OCH en distinkt
träff på just det valda fiendekortet, så byggd med tre delar istället
för två:

- **Kortets aura** — ny `.card.hellfire-casting`, samma "slot"/z-index
  som `.card.ultimate-casting`/`.card.void-dominion-casting`, orange/
  röd lava istället för lila. Till skillnad från Nyxaras `infinite`-
  pulsande aura är den här ETT ENDA VARV (`forwards`, inte `infinite`)
  som eskalerar från svag glöd till full låga över exakt 0.95s
  (samma som `ULTIMATE_WINDUP_MS`) — matchar kravet "en kort kraftig
  vibration/rumble byggs upp" bättre som en byggande intensitet än en
  jämn pulsering.
- **Arena-rumble under cast** — ny `.arena-frame.hellfire-rumble`,
  en LÅG-amplitud skakning som växer under hela väntetiden (från ~1px
  till ~4px offset), medvetet mycket subtilare än den skarpa
  impact-skakningen nedan, så de två läses som upptrappning+utlösning
  istället för en enda lång skakning. Rensas automatiskt (klassen
  läggs bara på under cast-fasen, samma full-DOM-rebuild-princip som
  allt annat i den här filen).
- **Eldvåg + specifik träff** — `.hellfire-fx`-wrappern (samma
  positionering som `.void-dominion-fx`, matchar `.board`s egen box)
  innehåller nu TVÅ element: `.hellfire-blast` (samma ring-expansion-
  teknik som `.void-crack`, eld-färgad, sveper över hela brädet från
  Ifrits cell) OCH `.hellfire-target-hit` (en mindre, snabbare
  eld-blossning positionerad på det FAKTISKA målets cell, med 0.12s
  fördröjning så den läses som "vågen når och träffar fienden"). Detta
  krävde att `state.ultimateBanner` fick ett nytt fält, `targetIndex`
  (satt i BÅDA tilldelningarna i `playUltimateSequence`, cast OCH
  impact) — rent presentations-syfte, ingen spellogik läser det, exakt
  samma motivering som `sourceIndex` redan hade.
- **Screen shake vid impact** — samma återanvändning av `chainShake`
  som Nyxara, med samma nödvändiga utökning: Hellfire fångar EN fiende
  (vanlig `justFlipped`-fångst, inte destroy som Nyxara), men
  `capturedCount` för en enda fångst är alltid 1, aldrig >= 3-
  tröskeln, så villkoret utökades igen:
  `capturedCount >= 3 || special.name === 'Void Dominion' || special.name === 'Hellfire'`.

**Verifiering:** ett nytt permanent test (94 totalt) bekräftar hela
livscykeln via en riktig `runSpecialResolution`-anrop: under cast-fasen
finns kortets aura, arena-rumblet, och fx-wrappern med `--hellfire-x`/
`--hellfire-y` som matchar Ifrits faktiska cell (testad mot cell 4,
centrum, ska ge ~50%/50%); brädet är orört. Efter windup-tiden: rumblet
är borta (cast-only), blast OCH target-hit finns båda, target-hit-
positionen matchar det FAKTISKA målets cell (cell 1, inte Ifrits egen
cell 4) — testar specifikt att `targetIndex`-routingen är korrekt, inte
bara att elementet finns. `chainShake` har triggat trots att en enda
fångst aldrig når tröskeln på egen hand. Efter cleanup: allt borta. Ett
sista kontroll bekräftar att Nyxaras Void Dominion INTE får någon
Hellfire-specifik markup — scopead strikt till Ifrits kort-id plus hans
exakta Ultimate-namn. Verifierat även manuellt med riktiga UI-klick-
sekvenser (aktivera Ifrit, välj mål, båda klicken eftersom hans special
är single-target till skillnad från Nyxaras) och skärmdumpar i två
lägen (cast med synlig lava-aura, impact med den expanderande
eld-ringen). Hela testsviten grön (94/94, +1 nytt test).

**Uppdatering, samma session: tredje impact-SFX:et, för Vaelira
(Infernal Pact).** Användaren laddade upp en tredje egen ljudeffekt
("Sharp magical fire", ~2s) med "Ljudet när Vaelira attackerar med sin
ultimate". Filen kopierad in som `sfx/vaelira.mp3`. Tredje raden i
`ULTIMATE_IMPACT_SFX` (`vaelira: 'sfx/vaelira.mp3'`) — samma ramverk
från fas 4d, ingen ny kod. Fas 4d-testet utökat igen (inte ett nytt
testfall): mapping-kontrollen fick en tredje rad, och "no entry"-
kontrollen bytt från Vaelira (som nu har en post) till Seraphine.
Real-cast-vägs-verifieringen utökad med ett tredje AOE-steg för
Vaelira, med samma fulla cleanup-väntan mellan varje korts sekvens som
redan användes mellan Ifrit och Nyxara (förhindrar att den föregående
Ultimate-kön fortfarande är aktiv när nästa kort testas). Verifierat
manuellt med samma UI-klick-sekvens (hennes special är AOE) —
bekräftade `window.Audio`-anrop med `sfx/vaelira.mp3` exakt vid
impact-fasen, och att fiendekortet förstördes. Hela testsviten grön
(94/94, samma antal — befintligt testfall utökat).

**Fas 4g: Vaelira fick samma sorts "element-identitet"-VFX för Infernal
Pact, tredje engångstestet i raden** (samma "till Claude"-format som
Nyxara/Ifrit-begärandena). Crimson/svart tema, och till skillnad från
Hellfire (single-target) är Vaelira AOE precis som Nyxara — men
kravlistan bad EXPLICIT om både en spelplans-omfattande våg OCH en
"tydlig men kort träffeffekt" på "fiendekorten" (plural), så
implementationen behövde hantera ETT ELLER FLERA fiender, inte ett
fast antal:

- **Kortets aura + sigill** — ny `.card.infernal-pact-casting`, samma
  "slot"/z-index som de andra kort-aurorna, crimson istället för
  lila/lava, `infinite` jämn pulsering (inte Hellfires eskalerande
  engångs-ramp, eftersom kravet bara bad om "pulserar" utan
  "byggs upp"-formulering). Den "mörka magiska sigill/cirkel"-delen
  löst med en roterande `::before`-pseudo-element (streckad cirkel,
  `border-radius:50%`) INSETT i kortet — samma clip-begränsning
  (`.card{overflow:hidden}`) som redan gäller alla andra in-kort-
  effekter i filen, medvetet inte lättad bara för den här effekten.
- **Partiklar + våg** — samma `.void-particle-pull`/`.void-crack`-
  teknik som Nyxara, omfärgad crimson/svart, från Vaeliras faktiska
  cell.
- **Per-fiende träffeffekt (ny teknik)** — eftersom antalet fiender
  varierar (0 till 8, inte ett fast antal som Hellfires enda mål),
  krävde detta en riktig utökning: `state.ultimateBanner` fick ett
  nytt fält `enemyIndices`, en lista över vilka celler som faktiskt
  var fiender VID CAST-TILLFÄLLET — måste fångas INNAN `handler()` kör
  (`destroyCard()` sätter cellerna till `null`, så de går inte att
  fråga om igen vid impact-rendret). Beräknas en gång i
  `playUltimateSequence` (bara när `special.name === 'Infernal Pact'`,
  ingen generell kapabilitet för alla AOE-korts skull) och bärs vidare
  genom closure-scopet till båda banner-tilldelningarna (cast OCH
  impact). Varje träff-element positioneras via INLINE style (inte en
  CSS custom property som de 8 fasta partiklarna) eftersom antalet
  varierar, med en liten stegrande `animation-delay` per fiende så
  vågen läses som att den sveper och träffar korten i tur och ordning.
- **Screen shake** — samma återanvändning/utökning av `chainShake`
  som Nyxara/Ifrit (`special.name === 'Infernal Pact'` tillagt i
  villkoret), av samma anledning: destroy-baserad AOE sätter aldrig
  `justFlipped`.
- **Synk med ljudet** — `playUltimateImpactSfx()` (redan kopplad till
  `sfx/vaelira.mp3` tidigare i sessionen) och den nya VFX-en körs i
  EXAKT samma synkrona kodblock i impact-fasen, så de är redan
  synkade helt gratis — inget extra jobb krävdes för det kravet.

**Verifiering:** ett nytt permanent test (95 totalt) bekräftar hela
livscykeln, med två fiender på brädet samtidigt för att specifikt testa
att träff-antalet matchar det FAKTISKA antalet (2), inte ett hårdkodat
antal: under cast-fasen finns kortets aura+sigill, fx-wrappern med
`--pact-x`/`--pact-y` som matchar Vaeliras cell, alla 8 partiklar, och
träff-elementen EXISTERAR redan i DOM:en (samma mönster som Hellfires
target-hit) men är osynliga (`opacity:0`) tills impact-fasens CSS-
klass triggar animationen. Efter windup: vågen syns, exakt 2
träff-flashes (matchar de 2 fienderna), båda fiendekorten förstörda,
`chainShake` triggat, och `sfx/vaelira.mp3` bekräftat spelad i SAMMA
kontroll som VFX-elementen — testar synk-kravet explicit, inte bara
att båda råkar spelas nån gång. Efter cleanup: allt borta. Ett sista
kontroll bekräftar att Nyxaras Void Dominion (samma destroy-AOE-form)
INTE får någon Infernal-Pact-specifik markup — scopead strikt till
Vaeliras kort-id plus hennes exakta Ultimate-namn, inte "alla
destroy-AOE-Ultimates". Verifierat även manuellt med en riktig
UI-klick-sekvens (hennes special är AOE, ett enda klick, med två
fiender på brädet) och skärmdumpar i två lägen — bekräftade den
crimson auran/sigillet under cast, och båda "Destroyed!"-overlayen
plus den expanderande crimson-vågen vid impact. Hela testsviten grön
(95/95, +1 nytt test).

**Uppdatering, samma session: fjärde impact-SFX:et, för Seraphine
(Silver Judgment).** Användaren laddade upp en fjärde egen ljudeffekt
("Divine celestial magic", ~2s) med "Här kommer Seraphine ljud i
ultimate". Filen kopierad in som `sfx/seraphine.mp3`. Fjärde raden i
`ULTIMATE_IMPACT_SFX` (`seraphine: 'sfx/seraphine.mp3'`) — samma
ramverk, ingen ny kod. Fas 4d-testet utökat igen: mapping-kontrollen
fick en fjärde rad, "no entry"-kontrollen bytt från Seraphine (som nu
har en post) till Triune Desire, och real-cast-vägs-verifieringen
utökad med ett fjärde AOE-steg. Verifierat manuellt med samma
UI-klick-sekvens — bekräftade `window.Audio`-anrop med
`sfx/seraphine.mp3` exakt vid impact-fasen, och att fiendekortet
förstördes (matchar hennes redan ombyggda destroy-all-mekanik). Hela
testsviten grön (95/95, samma antal — befintligt testfall utökat).

**Fas 4h: Seraphine fick samma sorts "element-identitet"-VFX för Silver
Judgment, fjärde engångstestet i raden.** Gyllene/vitt "helig" tema.
Kravlistan skilde sig från de tidigare tre på ett par viktiga sätt:
"flera smala gyllene ljusstrålar... mot fiendekorten" krävde en
genuint NY teknik (en riktig riktad linje/stråle mot varje fiende, inte
en radiell ring/våg som Void Dominion/Infernal Pact/Hellfires blast),
och kravet på "betydligt mjukare [skakning] än Ifrit" + "elegant, inte
explosiv" formade flera designval:

- **Kortets aura + dubbla ringar** — ny `.card.silver-judgment-casting`,
  varm gyllene/vit, EN JÄMN uppbyggnad (inte Hellfires eskalerande
  ramp eller Infernal Pacts pulsering — bara en stadig gradvis
  ljusstyrka, matchar "elegant, inte explosiv"). Två `::before`/
  `::after`-ringar istället för en (en större yttre ring som tonar in
  + en mindre roterande streckad sigill-ring inuti) för "stort
  cirkulärt heligt ljus/sigill".
- **Riktade ljusstrålar (ny teknik)** — varje `.silver-judgment-beam`
  är en faktisk linje från Seraphines cell till en specifik
  fiende-cell, inte en punkt/ring. Vinkel och längd beräknas i
  `renderBattle()` med `Math.atan2` — men eftersom `.board`s
  proportioner är 5:7 (inte kvadratiska) normaliserades den vertikala
  deltan med den kvoten (×7/5) INNAN atan2, annars hade strålarna
  pekat fel håll (kvadratisk-koordinat-antagande på en icke-kvadratisk
  yta). Rotationen sätts som en STATISK inline-`transform` på det
  yttre elementet; ett barn-element (`.silver-judgment-beam-inner`)
  sköter den ANIMERADE "skjut ut"-`scaleX`-övergången, eftersom ett
  element inte kan ha både en inline-transform OCH en oberoende
  CSS-animerad transform samtidigt utan att den ena vinner helt.
- **Glittrande partiklar som följer strålarna** — `.silver-judgment-
  sparkle`, ett barn av varje stråle, ärver samma rotation/längd
  gratis och animerar bara sin egen `left`-position 0%→100% längs
  strålens redan roterade koordinatsystem — ingen separat vinkel-
  beräkning behövdes för partiklarna.
- **Per-fiende ljus-impact + slutlig våg** — samma `enemyIndices`-
  infrastruktur som Infernal Pact (utökad till att beräknas även för
  `special.name === 'Silver Judgment'`, samma villkor, samma
  variabelnamn bytt till det mer generella `aoeEnemyIndicesAtCast`
  eftersom det nu delas av två kort). Träffarna timas till att landa
  precis när strålen "anländer" (~0.3s), och EN gemensam våg
  (`.silver-judgment-wave`) triggas EFTER alla träffar (0.55s
  fördröjning) för "när alla mål träffats kommer en kort kraftfull
  våg".
- **Mjukare screen shake/flash** — återanvänder EXAKT samma delade
  `chainShake`-mekanism/amplitud som alla andra kort (medvetet INTE
  forkad eller mjukad per kort — det hade krävt att röra en mekanism
  alla andra Ultimates redan litar på), men Seraphine får INGEN
  förhands-rumble (till skillnad från Hellfire) och en ny mjuk
  helframe-`.silver-judgment-flash` (radial vit glöd, låg opacitet,
  kort) istället för en hård puls — kombinationen läses märkbart
  mjukare även om själva skakningen tekniskt är identisk med de andra
  kortens.
- **Synk med ljudet** — samma gratis-synk som Infernal Pact:
  `playUltimateImpactSfx()` och VFX-en körs i samma synkrona kodblock
  i impact-fasen.

**Verifiering:** ett nytt permanent test (96 totalt) bekräftar hela
livscykeln med tre fiender i olika riktningar från Seraphine
(topp-vänster, topp-höger, rakt nedanför) specifikt för att testa
vinkelmatematiken — en fiende rakt nedanför (samma X-koordinat som
Seraphine) MÅSTE ge exakt 90 grader, vilket fångar ett tecken/axel-fel
i atan2-beräkningen som ett enkelt "finns elementet"-test hade missat.
Bekräftar även: kortets aura+ringar under cast, stråle-antal matchar
fiende-antal, brädet orört under väntetiden, träff-antal matchar vid
impact, vågen och flashen båda syns, alla fiender förstörda,
`chainShake` triggat trots destroy-baserad AOE, och `sfx/seraphine.mp3`
bekräftat spelad i SAMMA kontroll som VFX-elementen. Ett sista kontroll
bekräftar att Vaeliras Infernal Pact (samma destroy-AOE-form) INTE får
någon Silver-Judgment-specifik markup. Verifierat även manuellt med en
riktig UI-klick-sekvens (tre fiender samtidigt) och skärmdumpar i tre
lägen — bekräftade den gyllene auran under cast, de synliga strålarna
mitt i impact, och de mjuka gyllene träff-glödarna vid den slutliga
vågen. Hela testsviten grön (96/96, +1 nytt test).

**Fas 4i: skärmfoto-feedback på desktop-layouten — bredare panel +
livligare bakgrund, ingen kod-VFX-fråga den här gången.** Användaren
skickade ett foto av spelet på sin bärbara dator: "skulle man kunna
göra det lite bredare för det är ganska mycket död yta... sen hade jag
velat ha bakgrund mer levande... själar som också flyger upp som de
små prickarna jag ser" (syftar på de redan existerande
`.stage-mote`/`.arena-mote`-partiklarna).

**Viktig upptäckt innan någon kod ändrades:** `.arena-frame` (spelbrädet)
sätts med `height:100%; width:auto;` och en `aspect-ratio:1086/1448`
(porträtt) — dess bredd HÄRLEDS alltså från tillgänglig HÖJD, inte
bredd. På en vanlig liggande 1920×1080-skärm är höjden (minus
mastheadet/scoreboard/wins-row/loggen) den begränsande faktorn, så att
bara höja `.arena-frame`s egna `max-width` (vilket redan gjordes i
tidigare faser) gör INGEN skillnad där — taket nås aldrig. Verifierat
konkret med ett Playwright-skript vid 1920×1080: brädet stannade på
~553px bredd oavsett om `max-width` sattes till 820px eller 960px.
`.hand-row` däremot ÄR rent breddstyrt (`.hand-row .card{width:100%}`,
korten har ingen egen höjdbegränsning från kolumnen), så det blev den
faktiskt verksamma spaken istället för att jaga brädet.

Konkreta ändringar (alla `@media (min-width:900px)`, rör INTE mobil-
layouten som redan var godkänd):
- `.stage` max-width: 1300px → 1600px (rent desktop) / 1700px → 1900px
  (riktig helskärm via ⛶-knappen).
- `.hand-row` bredd: 120px → 210px (desktop) / 140px → 240px
  (helskärm) — den verkligt verksamma ändringen, gör handkorten
  märkbart större och äter upp en stor del av den tomma ytan.
- `.arena-frame` max-width: 820px → 960px (desktop) / 860px → 1100px
  (helskärm) — behållen ändå för de fall då fönstret RÅKAR vara högt
  nog (smalare men högre fönster, eller riktig helskärm på en skärm
  med mindre extrem bildproportion) att brädet faktiskt är
  breddbegränsat istället för höjdbegränsat.
- `.scoreboard`/`.wins-row` fick samma `max-width` + `margin:auto`-
  behandling som helskärms-läget redan hade, så mätarraden ovanför
  följer brädets bredd istället för att sträcka sig ut till kanten av
  den nu bredare `.hand-row`-till-`.hand-row`-sträckan.
- `.battle-row` gap: 16px → 28px.

**Livligare bakgrund:** `.stage-mote` (hela sidans bakgrundslager,
utanför `#app`, aldrig omritad) utökad från 4 till 8 partiklar;
`.arena-mote` (inuti spelplanens ram) utökad från 6 till 10 — samma
redan etablerade teknik (drivande gnistor med `translateY`, exakt vad
användaren beskrev som "prickar som flyger upp"), bara fler av dem med
nya position/varaktighet/fördröjnings-kombinationer och en extra
temafärg (`--gold`, redan definierad men oanvänd i dessa lager sen
tidigare) för variation.

**Ärlig gräns kommunicerad (inte bara kodad tyst):** även efter dessa
ändringar kvarstår en del marginal på båda sidor av panelen på en
vanlig 1920×1080-skärm, eftersom ett porträtt-orienterat 3×3-bräde
aldrig kan fylla en liggande skärm utan antingen att förvränga
kortproportionerna eller kraftigt krympa mastheadet/scoreboard-höjden
(en mycket större strukturell ändring, inte vad som begärdes). Löst
genom att göra marginalen kännas avsiktlig snarare än tom — bredare
handkort + livligare partiklar — istället för att låtsas att den tomma
ytan helt försvinner.

**Verifiering:** inga permanenta tester berörs (ren CSS/markup, ingen
spellogik), men hela testsviten kördes ändå för att bekräfta att inget
annat gått sönder — grön (96/96). Verifierat manuellt med Playwright
vid 1920×1080 (innan/efter-jämförelse av faktisk `.arena-frame`/
`.hand-row`-bredd via `getBoundingClientRect()`, plus skärmdumpar) och
vid 420px mobilbredd (bekräftade layouten och antalet mote-element
oförändrat där, ingen horisontell scroll introducerad).

**Uppdatering, samma session: femte impact-SFX:et, för Omega Weapon
(Omega Protocol).** Användaren laddade upp en femte egen ljudeffekt
("Massive futuristic sound", ~2s) med "Omega weapon ultimate ljud".
Filen kopierad in som `sfx/omegaweapon.mp3`. Femte raden i
`ULTIMATE_IMPACT_SFX` (`omegaweapon: 'sfx/omegaweapon.mp3'`) — samma
ramverk, ingen ny kod. Fas 4d-testet utökat igen: mapping-kontrollen
fick en femte rad, och real-cast-vägs-verifieringen utökad med ett
femte AOE-steg. Verifierat manuellt med samma UI-klick-sekvens —
bekräftade `window.Audio`-anrop med `sfx/omegaweapon.mp3` exakt vid
impact-fasen, och att det svaga testkortet förstördes. Hela
testsviten grön (96/96, samma antal — befintligt testfall utökat).

**Uppdatering, samma session: Shiva fick både röstlinje OCH
impact-SFX i samma omgång — tionde röstlinjen, sjätte impact-SFX:et.**
Användaren laddade upp en ElevenLabs-röstfil ("Shivas ljud för
ultimate") följt strax efter av en separat ljudeffekt ("Majestic
crystalline", ~2s, "Ultimate ljud" utan kortnamn — tolkad som Shiva
eftersom temat matchar och hon var det senast diskuterade kortet).
Filerna kopierade in som `voices/shiva.mp3` respektive `sfx/shiva.mp3`.
Nionde raden i `ULTIMATE_VOICE_LINES` och sjätte raden i
`ULTIMATE_IMPACT_SFX` — samma två ramverk, ingen ny kod. Både fas
4c- och fas 4d-testerna utökade med Shiva (mapping-kontroll +
real-cast-vägs-AOE-steg i båda). Verifierat manuellt med samma
UI-klick-sekvens — bekräftade `voices/shiva.mp3` under cast-fasen,
`sfx/shiva.mp3` vid impact, och att fiendekortet fick -3 Power samt
blev special-låst (matchar Diamond Storms redan existerande
debuff-mekanik). Hela testsviten grön (96/96, samma antal — befintliga
testfall utökade).

**Fas 4j: Omega Weapon fick samma sorts "element-identitet"-VFX för
Omega Protocol, femte engångstestet i raden.** Orange/vitt
"mekanisk energi"-tema. Två nya saker jämfört med tidigare kort:

- **Krympande ringar istället för växande** — `.card.omega-protocol-
  casting::before/::after` skalar NER (från stor till liten) istället
  för upp, för "mekaniska energiringar och partiklar dras in mot
  kärnan" — motsatt rörelseriktning mot alla tidigare korts ringar,
  som antingen pulserar på plats eller öppnas utåt.
- **Targeting-markörer under CAST-fasen (helt ny mekanism)** — kravet
  "fiendekorten får korta röda/orange targeting-markeringar" beskriver
  ett "lock-on"-ögonblick INNAN skottet avfyras, till skillnad från
  alla tidigare korts fiende-markup som bara existerar vid impact.
  `.omega-protocol-target` är en fyrkantig ring maskerad med
  `conic-gradient` till fyra hörn-brackets (en enda DOM-nod per
  fiende, ingen fyrdelad markup), animerad under `.phase-cast`
  specifikt. Detta krävde att `aoeEnemyIndicesAtCast`-infrastrukturen
  (senast delad av Infernal Pact/Silver Judgment) generaliserades
  ytterligare till att även täcka Omega Protocol — trots att hans
  mekanik skiljer sig (destroy:ar bara SVAGA fiender, debuffar ALLA)
  behövs samma "vilka celler var fiender vid cast"-ögonblicksbild för
  targeting/impact-VFX oavsett vilka som faktiskt överlever.
- **Massiv central explosion** — till skillnad från Seraphines
  riktade strålar mot varje mål (flera separata linjer) beskriver
  kravlistan EN stor stråle ("massiv energistråle", singular) —
  löst med samma ring-expansions-teknik som `.void-crack`/
  `.hellfire-blast` men två lager för extra kraft/djup
  (`.omega-protocol-blast` + `.omega-protocol-blast-inner`).
- **`chainShake`-villkoret utökat igen** (`special.name === 'Omega
  Protocol'`) av samma anledning som tidigare — destroy:ade kort
  sätter aldrig `justFlipped`.

**Verifiering:** ett nytt permanent test (97 totalt) bekräftar hela
livscykeln med två fiender: under cast-fasen finns kortets krympande
ringar, fx-wrappern, och EN targeting-reticle PER FIENDE (2 st) —
explosionerna finns redan i DOM:en men osynliga (`opacity:0`) tills
impact-fasen (samma mönster som tidigare korts hit-element, fångade
detta explicit efter att först ha skrivit ett felaktigt "elementet
ska inte finnas alls"-test som floppade — rättat till att testa
osynlighet istället för frånvaro, samma lärdom som Nyxara-testet
gjorde tidigare). Vid impact: explosionsantalet matchar fiendeantalet,
den massiva explosionen och flashen syns båda, båda svaga fiender
förstörda, `chainShake` triggat. Ett sista kontroll bekräftar att
Seraphines Silver Judgment (samma destroy-AOE-form) INTE får någon
Omega-Protocol-specifik markup. Verifierat även manuellt med en riktig
UI-klick-sekvens (två fiender) och skärmdumpar i två lägen —
bekräftade de synliga röda targeting-markeringarna under cast och den
kraftiga orange/vita explosionsvågen vid impact. Hela testsviten grön
(97/97, +1 nytt test).

**Fas 4k: Bahamuts impact-SFX inkopplad, Odins Zantetsuken omdesignad
till en riskfylld "Ragnarok"-ultimate, och en desktop-only bugfix på
kort-infomodalens bild.** Tre separata användarförfrågningar hanterade i
samma omgång:

- **Bahamut impact-SFX** — femte uppladdade ljudfilen ("Nu ljudet för
  mega flare attacken", `sfx/bahamut.mp3`, bekräftat unik via `md5sum`)
  inkopplad i `ULTIMATE_IMPACT_SFX` som `bahamut: 'sfx/bahamut.mp3'` —
  samma engångsrad som alla tidigare kort i mappningen, ingen ny kod.
  Fas 4d-testet utökat igen: en ny `bahamutCall`-kontroll bekräftar att
  `playUltimateImpactSfx('bahamut')` spelar rätt fil.
- **Odins Zantetsuken — 50% chans att förstöra HELA brädet** (användarens
  egen begäran: "hans ultimate borde döda alla kort på spelplanen med
  50% chans annars är skillen bra"). `SPECIAL_HANDLERS.odin` behåller
  hela sin befintliga gate (kräver fortfarande att attacken vinner
  makt-jämförelsen, respekterar sköldar) och sitt befintliga
  fallback-beteende (permanent -3 på målet, -1 denna runda till övriga
  fiender, +3 denna runda till Odin själv) oförändrat. NYTT: på en
  lyckad attack, 50% `Math.random() < 0.5`-chans att i stället förstöra
  VARJE annat kort på brädet via `destroyCard(i, {noRevive:true})` —
  medvetet INTE fiende-only som alla andra destroy-ultimates i rostret
  (Infernal Pact/Silver Judgment/Omega Protocol slår bara fiender), utan
  ett äkta myntkast som kan radera Odins EGEN sida också, eftersom det
  är hela poängen med en gamble-mekanik snarare än en garanterad
  ensidig brädrensning. Odin själv (`sourceIndex`) och det redan
  flippade målet är alltid fredade. Kortets skill-text uppdaterad
  ordagrant på båda ställena (`HEROES`/`FOREST_FOES`) för att matcha.
  Ingen ny VFX byggd för detta — användaren bad uttryckligen bara om
  mekanikändringen ("annars är skillen bra", dvs allt annat med kortet
  är redan bra som det är). Det befintliga testet
  ("Odin: Allfather's Gaze... Zantetsuken ultimate") utökat med två
  deterministiska grenar (myntkastet stubbat via en tillfällig
  `Math.random`-override, återställd efter varje gren) som täcker BÅDA
  utfallen: missen (identiskt med gamla beteendet) och träffen
  (Ragnarok sparar Odin + målet, förstör en allierad OCH en annan
  fiende på brädet).
- **Bugfix: kort-infomodalens bild beskuren på desktop/webbversionen**
  (skärmfoto + "Man ser inte heller hela kortet på web versionen det är
  en liten liten del som inte synts"). Roten: den sida-vid-sida-layouten
  som lades till för `@media (min-width:700px)` (se tidigare
  layout-arbete i avsnitt 5b) tvingar `.poster-art-full` till en FAST
  bredd/höjd-box (`flex:0 0 320px`, höjden sträckt till att matcha
  skills-panelens höjd via `align-items:stretch`), och bilden inuti
  använde `object-fit:cover` — som medvetet BESKÄR bilden för att fylla
  en box vars proportioner inte matchar bildens egna. Den smala/staplade
  layouten (`.poster-art-full img{width:100%}`, inget `object-fit`) hade
  aldrig det här problemet, vilket matchar att användaren bara märkte
  det på webben/desktop. Fix: bytte `object-fit:cover` → `object-fit:
  contain` plus en bakgrundsfärg (`var(--void-2)`, samma som modalens
  egen bakgrund) på `.poster-art-full` så att hela bilden alltid syns,
  eventuellt brevlådad, utan att sticka ut som ett gap. Verifierat
  manuellt med en Playwright-skärmdump av Odins kort-infomodal på
  1400×900 — hela postern (inklusive toppen och botten som tidigare
  klipptes) syns nu korrekt.

Inga nya generella primitives förutom `destroyCard`-återanvändningen
(redan befintlig funktion, bara ett nytt anropsställe). Hela testsviten
grön (99/99, +2 nya grenar i ett befintligt test, +1 rad i ett annat).

**Fas 4l: Shiva fick samma sorts "element-identitet"-VFX för Diamond
Storm, sjätte engångstestet i raden.** Isvitt/blått/silver "kristallstorm"-
tema. Två saker värda att notera:

- **Accelererande kort-aura istället för konstant rotation** — kravet
  "kristallfragment som snurrar runt kortet, allt snabbare" är en genuint
  ny form: alla tidigare korts roterande ring/sigill spinner i konstant
  hastighet (`linear`-timing). `.card.diamond-storm-casting::before/
  ::after` löser detta med OJÄMNT fördelade keyframe-stopp inom samma
  0.95s cast-fönster (60° under de första 40% av tiden, sedan 620° totalt
  vid 100%) — ingen JS-driven `animation-duration`-ändring mitt i
  animationen behövs, bara ojämn keyframe-spacing. Två ringar som
  snurrar åt motsatta håll för extra "storm"-densitet.
- **"Hundratals" små kristaller representeras (som alla tidigare "många
  små saker"-ögonblick i den här filen) som ett modest, läsbart antal**
  — 2 små diamantformade "shard"-gnistor per fiende, som åker på en
  osynlig roterad "räls" (`.diamond-storm-rail`, opacity:0) positionerad
  med exakt samma trigonometri som Seraphines Silver Judgment-strålar
  (vinkel/längd via aspect-ratio-normaliserad atan2) — men själva rälsen
  syns aldrig, bara de två gnistorna på den, så det här läser INTE som en
  blå omskinning av hennes Ultimate. Plus 8 fasta "större
  kristallfragment" (samma pixel-offset-teknik som Infernal Pacts
  partiklar) som slår ner runt korten under cast-fasen, och 6 kvardröjande
  "glitter"-gnistor som tonas in sent och blinkar ut under svansen av
  impact/cleanup-fönstret ("kvarvarande glittrande kristallpartiklar").
- **`chainShake`- och `aoeEnemyIndicesAtCast`-villkoren utökade igen**
  (`special.name === 'Diamond Storm'`), av en NY anledning den här gången:
  Diamond Storm är varken en destroy-AOE (som Infernal Pact/Silver
  Judgment) eller en villkorlig destroy (som Omega Protocol) — den är en
  helt vanlig `debuffThisRound`-AOE som aldrig rör brädets celler alls.
  Ändå läggs den till i båda listorna: `aoeEnemyIndicesAtCast` för att
  återanvända exakt samma enemyIndices-mekanism som alla andra AOE-VFX-
  kort istället för att särlösa "vilka är fiender" live i
  `renderBattle()`, och `chainShake` av samma skäl som alla andra i
  listan (`capturedCount` blir 0 eftersom ingen flippas).
- **"Kort screen shake, men mindre aggressiv än Omega Weapons"** — löst
  på exakt samma sätt som Seraphines "mjukare än Ifrit"-krav: samma
  delade chain-shake-amplitud (aldrig mjukad per kort), känslan av
  mildare kommer helt från en enda mjuk isblå flash (närmare Silver
  Judgments mjuka variant än Omega Protocols hårda vit/orange) och ingen
  rumble-effekt före impact.

**Verifiering:** ett nytt permanent test (98 totalt) bekräftar hela
livscykeln med två fiender: under cast-fasen finns kortets accelererande
ringar, fx-wrappern, EN räls PER FIENDE (2 st, 4 shard-gnistor totalt),
alla 8 fragment, och crystal-impact-elementen finns redan i DOM:en men
osynliga (`opacity:0`) tills impact-fasen (samma "osynlig, inte
frånvarande"-lärdom som Nyxara/Omega Protocol-testerna redan
dokumenterat). Vid impact: träffantalet matchar fiendeantalet, vågen och
flashen syns båda, båda fiender debuffade (-3) och Shiva självbuffad
(+3) — själva spelmekaniken opåverkad av VFX-arbetet. `chainShake`
triggat trots att ingen flippas. Ett sista kontroll bekräftar att Ancient
Wyrmkings Conquests Witnessed (samma "vanlig AOE-debuff"-form) INTE får
någon Diamond-Storm-specifik markup. Verifierat även manuellt med
Playwright-skärmdumpar (cast + impact) och en direkt DOM-koll av
element-antal (3 rälsar/träffar för 3 fiender, 6 shards, 8 fragment,
6 glitter, våg/flash närvarande, chainShake aktivt). Hela testsviten
grön (98/98, +1 nytt test).

**Fas 4m: Bahamut fick samma sorts "element-identitet"-VFX för
Megaflare, sjunde och sista engångstestet i den här raden.** Blått/vitt/
guld "astralt ljus"-tema, avsett att kännas "gudomligt, majestätiskt och
enormt, inte som en vanlig laser". Ett genuint nytt tekniskt grepp:

- **Ett enda svep-ljus som täcker HELA brädets bredd, inte en riktad
  stråle mot ett mål** — kravlistan beskriver "en enorm energistråle som
  skjuts över hela brädet, [som] sveper igenom fiendekorten", vilket
  skiljer sig från alla tidigare riktade strålar (Seraphines/Diamond
  Storms räls-mot-varje-fiende-teknik) eftersom den inte siktar mot NÅGOT
  specifikt mål, utan måste täcka brädet oavsett hur många fiender som
  finns eller var de står. Löst utan någon vinkel-trigonometri alls:
  `.megaflare-sweep` är en stapel som redan spänner 100% av wrapperns
  bredd, med `transform-origin` nålad till Bahamuts EGEN kolumn
  (`${originX}% 50%`, satt inline per cast). En `scaleX(0)` →
  `scaleX(1)`-animation växer då symmetriskt utåt från den nålade punkten
  tills den täcker alla kolumner — läser som ljuset visibelt strömmar ut
  FRÅN honom och sveper över hela brädet, utan att behöva separat
  vinkelmatematik per fiende (bara varje TRÄFFS fördröjning beräknas,
  proportionell mot det horisontella avståndet från hans kolumn, så
  träffarna känns sekventiella i takt med att svepet passerar dem).
- **Vågen centreras på HELA brädet (50%/50%), inte källcellen** — till
  skillnad från varje tidigare korts våg/blast (som alltid utgår från
  kortets egen cell) centreras `.megaflare-wave` mitt på brädet, eftersom
  kravlistan beskriver "en stor kosmisk explosion" som ska kännas som att
  HELA slagfältet exploderar, inte en effekt som strålar ut från ett
  hörn av det.
- **Ingen ny ring-teknik för själva kort-auran** — bara en stadigt
  roterande ring (samma konstanta hastighet som Infernal Pacts sigill,
  INTE Diamond Storms accelererande variant) plus en svällande ljuskärna
  (`::after`, skalar upp) som representerar "energi som koncentreras
  kraftigt framför Bahamut" — en ny keyframe-typ (svällande kärna) men
  återanvänder samma before/after-pseudoelement-budget som alla andra
  kort.
- **`aoeEnemyIndicesAtCast`/`chainShake`-villkoren utökade en sista gång**
  (`special.name === 'Megaflare'`) — samma destroy-baserade form som Void
  Dominion/Infernal Pact (alla fiender förstörs via `destroyCard`,
  `noRevive:true`), samma skäl som alla tidigare kort i listorna.
- **"Kort men KRAFTFULL screen shake"** — samma delade chain-shake-
  amplitud som alla andra (aldrig mjukad per kort), men den ljusaste/
  mest kontrastrika flashen i hela rostret hittills (högre toppopacitet
  än Omega Protocols), eftersom det här ska kännas som den STÖRSTA
  Ultimate hittills snarare än en mjuk/elegant en (Seraphine/Shiva).

**Verifiering:** ett nytt permanent test (99 totalt) bekräftar hela
livscykeln med två fiender: under cast-fasen finns kortets aura +
svällande kärna, fx-wrappern, ursprung matchar Bahamuts faktiska cell,
och impact-elementen finns redan i DOM:en men osynliga tills impact-fasen
(samma "osynlig, inte frånvarande"-mönster som alla tidigare AOE-VFX-
tester). Vid impact: svepet, träffantalet (matchar fiendeantalet), vågen,
de 6 fasta stjärnpartiklarna och flashen syns alla, båda fiender
förstörda, `chainShake` triggat trots att destroy aldrig sätter
`justFlipped`. Ett sista kontroll bekräftar att Nyxaras Void Dominion
(samma destroy-alla-fiender-form) INTE får någon Megaflare-specifik
markup. Verifierat även manuellt med en direkt DOM-koll (cast: aura +
fx + laddningskärna närvarande, träffar osynliga; impact: svep + 2
träffar + våg + 6 stjärnor + flash + chainShake alla aktiva; cleanup:
allt borta). Hela testsviten grön (99/99, +1 nytt test).

**Alla sju kort från den ursprungliga "identity VFX"-begäran är nu
klara: Nyxara (Void Dominion), Ifrit (Hellfire), Vaelira (Infernal
Pact), Seraphine (Silver Judgment), Omega Weapon (Omega Protocol), Shiva
(Diamond Storm), Bahamut (Megaflare).** Alla sju delar samma
cast->impact->cleanup-livscykel, samma `chainShake`-mekanism (aldrig
mjukad per kort, bara opt-in-listan utökad), och samma
`aoeEnemyIndicesAtCast`-generalisering för AOE-formerna. Varje kort har
en unik, tematiskt motiverad twist på återanvänd teknik istället för att
uppfinna en helt ny mekanism varje gång.

**Fas 4n: Odins ultimate-ljud, ny kortkonst, en helt ny VFX-kategori
(normal-attack Slash) för hans vanliga attacker, och en storleksfix på
"Erövrad"-bannern.** Fyra separata användarförfrågningar i samma
omgång:

- **Odin ultimate impact-SFX** — sjätte uppladdade ljudfilen ("Ultimate
  på Odin", `sfx/odin.mp3`, samma 49581-byte impact-SFX-storleksklass
  som Bahamut/Omega Weapon, bekräftat unik via `md5sum`) inkopplad i
  `ULTIMATE_IMPACT_SFX` som `odin: 'sfx/odin.mp3'` — engångsrad, ingen ny
  kod. Fas 4d-testet utökat igen med en `odinCall`-kontroll.
- **Ny kortkonst för Odin** — helt ny fullbild mottagen (matchar den
  redan uppdaterade Zantetsuken-texten ordagrant, inklusive
  Ragnarok-myntkastet). `card-odin-full.jpg` ersatt rakt av (bara
  omkodad PNG->JPEG). Ny `cards/card-odin.jpg`-thumbnail beskuren från
  SAMMA källbild — viktigt: cardFace() renderar ALLTID sina egna
  namn-/stat-diamant-element ovanpå `CARD_IMAGES[card.id]` oavsett om en
  bild finns (till skillnad från modalens `FULL_CARD_IMAGES`-kortslutning,
  som visar hela postern som den är) — så en naiv beskärning som råkade
  fånga med de nya bildens egna inbakade diamant-siffror (som dessutom
  visade sig vara på svenska: "Monster/Höger/Vänster/Ner", ett
  bildgenerator-fel för "Upp") hade dubblerat/krockat med spelets egna
  UI-element. Löst genom att beskära en helt textfri närbild av
  karaktären (ansikte/rustning/spjut/häst), samma konvention som Odins
  gamla thumbnail och alla andra korts.
- **Odins normal-attack "Slash VFX" — en helt ny VFX-KATEGORI, skild
  från alla sju identity-VFX-korten ovan.** Alla tidigare VFX-kort red på
  `state.ultimateBanner`s cast->impact->cleanup-livscykel (bara
  Ultimates). Den här begäran gäller Odins VANLIGA attacker (varje gång
  han slåss mot en granne via en normal kort-placering), som inte har
  någon banner/fas-koncept alls — bara en enda synkron
  `battleNeighbors()`-loop per attack. Ny mekanism byggd från grunden:
  - `battleNeighbors(index, owner, result)` fångar nu
    `result.odinSlashes.push({ sourceIndex: index, targetIndex: p.ni,
    delay: target.fxDelay })` när `placed.id === 'odin'`, direkt bredvid
    den befintliga `target.attackFlash = true`-raden (samma "varje strid,
    vinst eller förlust"-räckvidd som den generiska slash-fx:en alla kort
    redan får). Fungerar identiskt oavsett om striden kommer från Odins
    egen placering eller en senare Combo-kedjas hopp som råkar gå via
    honom, eftersom båda vägarna anropar samma funktion.
  - `placeCard()` kopierar `result.odinSlashes` till `state.odinSlashes`
    (ny state-nyckel, tom array som standard) och sätter `chainShake =
    true` om listan är icke-tom — återanvänder exakt samma delade
    shake-mekanism som alla sju Ultimate-VFX-korten, för "kort måttlig
    screen shake" som begäran bad om.
  - `renderBattle()` härleder `odinSlashPairs` från `state.odinSlashes`
    med EXAKT samma aspect-ratio-normaliserade atan2-vinkel/längd-
    trigonometri som Seraphines Silver Judgment-strålar, men UTAN
    `state.ultimateBanner`-koppling alls — det här är den första
    board-wide-fx:en i hela filen som inte är fas-gated.
  - **Medveten avvikelse från exakt "0.6-1 sekund" i kravlistan,
    dokumenterad transparent:** `placeCard()`s befintliga 500ms
    "justPlaced"-timeout gör en full `render()` som (per arkitekturens
    redan dokumenterade "allt inuti #app startar om vid varje render"-
    regel) skulle starta om VFX:en från frame 0 mitt i om den varade
    längre än 500ms — det hade sett ut som att hugget upprepade sig/
    hackade till. Löst genom att hålla hela sekvensen (svep 0-0.16s,
    guldig impact till 0.47s, gnistor till 0.46s) tydligt under 500ms
    istället för att träffa 0.6-1s exakt — känslan av "extremt snabbt,
    kort" som begäran faktiskt bad om bevaras, bara det exakta
    sekundtalet böjs något för att inte krocka med en redan existerande,
    kritisk timeout som inte kan ändras utan att påverka andra kort.
  - Ljudsynk: inget nytt ljud behövdes — det finns ännu inget
    per-kort-ljudsystem för VANLIGA attacker (bara Ultimates har riktiga
    `voices/`/`sfx/`-filer), så "synka med Odins attackljud" tolkades som
    att VFX:en ska trigga i exakt samma ögonblick som spelets befintliga
    generiska attack-SFX redan spelar (`SFX.place`/`SFX.flip`, som körs i
    samma `render()`-anrop) — redan naturligt synkat utan extra kod.
  - Ett nytt permanent test (100 totalt) bekräftar: två samtidiga strider
    från EN placering ger två rälsar/impacts/gnistgrupper, en räls mot
    cellen rakt ovanför Odin beräknas till exakt -90°, båda fienderna
    flippas korrekt (mekaniken opåverkad), `chainShake` triggat, allt
    städat efter 1300ms, och ett annat kort (Ifrit) som attackerar
    normalt får INGEN Odin-specifik markup.
- **Bugfix/finjustering: "Erövrad"-bannern (`.conquest-banner`) för stor**
  (användarfeedback: "syns för mkt och förstör"). `width:62% max-
  width:340px` → `width:40% max-width:210px`. Ren CSS-storleksändring,
  ingen kodlogik rörd. Bildfilerna `conquered-badge.png`/`-red.png`
  innehåller dock inbakad SVENSK text ("ERÖVRAD" / "FIENDEKORTET HAR
  ERÖVRATS") som INTE kan textredigeras i den här sessionen (ingen
  bildgenereringsverktyg) — en engelsk bildbrief för båda varianterna
  (blå/röd) skickades till användaren istället, samma mönster som Odins
  bildbrief tidigare, i väntan på ny konst.

Ingen ny generell primitive förutom `state.odinSlashes` (samma
array-av-par-mönster som `state.ultimateBanner.enemyIndices` redan
etablerat, bara utanför banner-strukturen). Hela testsviten grön
(100/100, +1 nytt test).

**Fas 4o: desktop-layouten gjord ännu bredare/kortare (mitten-brädet
för litet), plus en ny "Soul Stream"-ambient-lager inspirerad av Final
Fantasy Lifestream/pyreflies-konst.** Två separata
skärmfoto-/referensbild-drivna förfrågningar:

- **"Jag vill ha mitten delen större"** (skärmfoto av en bred men inte
  särskilt hög desktop-skärm, där brädet såg litet ut trots gott om
  horisontellt utrymme). Roten: `.arena-frame` är HÖJD-bunden på ett
  liggande fönster (`height:100%; width:auto`, se tidigare dokumenterad
  upptäckt) — den växer redan till att fylla vad `.battle-row` har kvar
  efter masthead/scoreboard/log/knappar, så fixen är inte att röra
  `.arena-frame` alls utan att krympa DESS GRANNARS marginal/padding vid
  `@media (min-width:900px)`-brytpunkten: `.wrap`-padding (22/30px →
  14/16px), `.masthead`-marginal (20px → 8px), `.scoreboard`-padding/
  marginal, `.wins-row`-marginal, `.log`-marginal, knapp-marginaler.
  Mätt med en Playwright-`getBoundingClientRect()`-kontroll vid
  1536×800: brädet växte från 408px till 462px höjd (+13%), utan att
  röra någon typsnittsstorlek eller ta bort något UI-element — bara
  åtstramad vitrymd.
- **"Själarna ska vara mer som Final Fantasy X/VII Lifestream"** —
  användaren skickade till slut två referensbilder (svävande
  gröna ljuspartiklar + en virvlande/tvinnad grön ljustråds-konstverk)
  efter att ha konstaterat att en tidigare beskrivning ("kolla hur
  själarna rör sig") inte gick att förmedla via en obefintlig
  YouTube-länk. Ett HELT NYTT ambient-lager, `.soul-stream`, tillagt
  BREDVID (inte istället för) de befintliga uppåtflytande
  `.stage-mote`/`.arena-mote`-prickarna — samma "aldrig
  återuppfunnet, bara adderat"-mönster som varje tidigare
  bakgrundsjustering i den här filen.
  - **Genuint ny teknik för filen: inline SVG med `viewBox` istället
    för CSS-keyframes på `<span>`-element.** Motiverat av att en äkta
    böjd, tvinnad flödeslinje (till skillnad från prickar som bara rör
    sig rakt upp) kräver en riktig kurva som skalar korrekt oavsett
    containerns proportioner — `preserveAspectRatio="xMidYMid slice"`
    håller kurvornas form oförvrängd (beskär istället för att sträcka)
    oavsett om wrappern är en smal telefonskärm eller en bred desktop.
  - **"Flödet" simuleras med en `stroke-dasharray`/`stroke-dashoffset`-
    animation** (ett ljust segment som ändlöst vandrar längs en FAST
    kurva) — samma knep som en klassisk laddningsspinner, ingen
    JS-driven `d`-attribut-animation behövs. Hela rör-gruppen svajar
    dessutom långsamt (`soulSwirl`, translate+rotate) så det läser som
    organiskt virvlande, inte en stel tråd med ett ljus som springer
    runt den.
  - **ID-namnrymd per instans** (`soulGradA-stage`/`-arena` osv.) —
    `.stage-ambient` (alltid i DOM:en, utanför `#app`) och
    `.arena-ambient` (bara under strid, inuti `#app`) kan båda vara
    närvarande SAMTIDIGT under en strid, och SVG-id:n måste vara unika
    per dokument, så varje kopia av markupen suffixar sina gradient-/
    filter-id:n för att undvika krockar.
  - **Två iterationer på styrka**: första passet (opacitet 0.6,
    gradient-mittstopp 0.55-0.6, blur 1) syntes knappt bredvid den
    redan livliga arena-bakgrundsbilden. Andra passet (opacitet 0.9,
    mittstopp 0.85-0.9, blur 0.7, tjockare `stroke-width`, en
    `drop-shadow`-glöd på varje stjärna) gav den tydligt synliga,
    "levande" känslan referensbilderna faktiskt visade — verifierat
    visuellt via Playwright-skärmdumpar av både draft- och
    strid-skärmarna före/efter justeringen.
  - 12 tvinklande "stjärnor" (`<circle>`, varierad storlek/duration/
    delay) plus 3 flödande ribbon-kurvor per instans (2 gröna nyanser,
    olika hastighet/riktning) — ingen bokstavlig "hundratals
    partiklar"-räkning, samma "modest, läsbart antal"-konvention som
    varje tidigare "många små saker"-effekt i filen.

Inget permanent automatiserat test tillagt för `.soul-stream` — samma
konvention som `.stage-mote`/`.arena-mote` redan följer (rent kosmetiska
ambient-lager täcks inte av testsviten, som uttryckligen bara testar
motorlogik, inte UI-rendering). Verifierat manuellt istället. Hela
testsviten grön (100/100, oförändrat testantal).

**Fas 4p: "Triad Arena"-dragkortet (Random Draft) fick liv** —
användarfeedback: "kortet man trycker på för random draft kan vi få det
mer levande". Kortet (`#draw-pile-btn`/`.card-back`) var tidigare helt
statiskt tills man faktiskt tryckte (bara `drawPulse`, en engångs-burst
vid klick) — ingen idle-animation alls medan det bara låg och väntade.
Tre lager tillagda, alla pausade via `:not(.disabled):not(.drawing)` så
de aldrig krockar med det befintliga klick-momentet:

- **Flytande bob** (`cardBackFloat`, translateY ±6px, 3.4s) på hela
  `.card-back` — kortet känns som det svävar istället för att ligga
  platt fastspikat.
- **Andande guldglöd** (`cardBackGlow`) på `.card-back-face` — samma
  "pulserande border+box-shadow"-språk som `.card.special-ready`s
  befintliga `specialReadyPulse` redan använder, bara i guld istället
  för arkan-lila för att matcha kortets egen `border:2px solid
  var(--gold)`.
- **Diagonal glimt-sweep** (`cardBackShimmer`) via `::before` på
  `.card-back-face` — ett mjukt vitt gradient-band som sveper diagonalt
  över konstverket på en loop, som ljus som fångas i kortets egen
  guldram, sedan håller still en stund innan det sveper igen (45%/100%-
  keyframe-hållpunkten). `.card-back-hint`-texten fick `position:
  relative; z-index:1` så den garanterat ligger ovanpå glimten.

Verifierat via en Playwright-koll som samplar `getComputedStyle` vid
flera tidpunkter (inte bara skärmdumpar, eftersom kortets kontinuerliga
rörelse gjorde Playwrights egen "vänta tills stabilt"-logik i
`scrollIntoViewIfNeeded` tidsgränsöverskriden — själva beviset på att
animationen faktiskt aldrig stannar): `transform`, `box-shadow`-alpha
och glimtens `translateX` bekräftat föränderliga över tid. Ren CSS,
ingen JS-logik rörd, inget permanent test (samma "kosmetiskt ambient-
lager"-konvention som `.soul-stream` ovan). Hela testsviten grön
(100/100, oförändrat testantal).

**Fas 4q: Soul Stream — smalare/elegantare + rakt upp (inte snett), och
en mobil-lagg-fix.** Två uppföljningsförfrågningar på samma effekt:

- **"Smalare mycket smalare... elegantare och att dom flyger uppåt inte
  snett"** — de ursprungliga banden (stroke-width 1-1.6, diagonala
  hörn-till-hörn-kurvor) lästes som klumpiga/röriga snarare än eleganta
  när de väl syntes i det riktiga spelet, trots att de matchade
  referensbildernas kaotiska virvel. Löst med två ändringar: (1)
  `stroke-width` skuren till 0.3-0.45 (tunn tråd istället för band), (2)
  de underliggande `<path>`-kurvorna omritade för att röra sig
  NEDIFRÅN-UPP med bara en mjuk sidled-våg istället för en diagonal
  svep över hela rutan — samma stroke-dasharray/
  dashoffset-"flödes"-teknik som förut, bara en annan kurvform. Sväng-
  amplituden på hela rör-gruppen (`soulSwirl`) tonades också ner
  (rotate 1deg → 0.3deg) så den inte motverkar den nu huvudsakligen
  vertikala rörelsen.
- **"Det laggar nu"** (bekräftat: hela spelet/överallt) — tre separata
  prestandafixar samtidigt, alla med samma rotorsak (kontinuerligt
  animerade CSS-egenskaper som tvingar omritning/filter-omberäkning
  varje bildruta, istället för `transform`/`opacity` som GPU:n kan
  kompositera):
  1. **`.soul-stream` borttagen helt från `.arena-ambient`** (finns nu
     BARA i `.stage-ambient`). Roten: `.arena-ambient` byggs om vid
     VARJE `render()`-anrop under strid (flip, Ultimate-fas-byte,
     cleanup-timeouts — alltså precis när spelet redan har som mest att
     göra), så att parsa om ett dussin SVG-noder med gradienter varje
     gång var en verklig, undvikbar kostnad. `.stage-ambient` sitter
     utanför `#app` och skrivs bara en gång, så den betalar den
     kostnaden exakt en gång oavsett hur mycket striden ritas om.
  2. **SVG-blur-filtret (`feGaussianBlur`) borttaget helt** från
     ramarna — mjukheten kommer nu bara från tunna streck + en
     nedtonande gradient istället för ett blur-filter, som tvingar
     webbläsaren att räkna om filtret varje bildruta så länge
     `stroke-dashoffset`-animationen kör (oändligt).
  3. **Dragkortets `cardBackGlow` (Fas 4p ovan) skriven om** — animerade
     tidigare `box-shadow`s faktiska blur/spread-värden direkt (tungt
     att rita om) plus ett `filter:brightness`. Nu ligger ett FAST
     box-shadow-värde på ett eget `::after`-lager, och bara dess
     `opacity` animeras (ren GPU-komposition, webbläsaren blandar bara
     ett redan uppritat lager). Samma andnings-effekt visuellt, mycket
     billigare att köra.
  4. **`.soul-star`s `drop-shadow`-filter borttaget** av samma skäl som
     punkt 2 — bara `fill` + `opacity`-tvinkel kvar.

Verifierat: `.soul-stream`/`.soul-ribbon`/`.soul-star`-antal kontrollerat
via Playwright på både draft- och stridsskärmen (bekräftat 0 instanser i
`.arena-ambient` under strid, 1 kvar i `.stage-ambient`), plus
skärmdumpar av båda skärmarna och dragkortet som bekräftar de smalare,
vertikala banden och den fortfarande fungerande gulglöden. Ren CSS/
markup, ingen spellogik rörd, inget permanent test. Hela testsviten
grön (100/100, oförändrat testantal).

**Fas 4r: Soul Stream fick riktiga "andar"-partiklar** — engelsk brief
den här gången: små gröna/teal-glödande partiklar som antingen rider
med de befintliga ljus-ramarna eller vandrar självständigt uppåt,
"small, delicate and subtle... no large effects, no bright green fog,
no beams and no clutter". Två nya partikeltyper, båda BARA i
`.stage-ambient` (samma lagg-fix-gräns som fas 4q ovan — aldrig i
`.arena-ambient`):

- **Ramridande partiklar** — `<circle>` med SMIL `animateMotion`/
  `<mpath href="#soulPathX-stage">`, som refererar till samma
  `<path>`-element ramarna redan ritas med (varje ram fick nu ett eget
  `id`) istället för att duplicera `d`-strängen. Rör sig i SVG:ns egna
  user units, till skillnad från en CSS `transform` på ett SVG-element
  (som skulle behöva extra hänsyn för att hålla sig synkad med
  `viewBox`-skalningen på olika skärmstorlekar) — samma
  motivering som varför `animateMotion` valdes för korts-VFX:ens
  räls-tekniker tidigare i sessionen.
- **Självständigt vandrande partiklar** — SMIL `animateTransform`
  (translate, flera waypoints för en mjuk sidled-vandring medan de
  stiger) + en `animate` på opacity som tonar in/ut vid loopens
  start/slut (så de inte "poppar" synligt). Samma SMIL-familj som
  ramridarna, av samma skäl.
- **Mjuk glöd via en `radialGradient`-fyllning, INTE ett blur-/
  drop-shadow-filter** — direkt tillämpning av fas 4q:s lagg-lärdom:
  ett filter på ett kontinuerligt animerat element tvingar
  webbläsaren att räkna om det varje bildruta, en gradient-fyllning
  gör inte det.

2 ramridande + 3 vandrande partiklar tillagda, alla små (r 0.5-0.7 i
100-enhets-viewBox:en) och dämpade i opacitet, per "keep the effect
small, delicate and subtle". Verifierat via Playwright: element-antal
kontrollerat (`.soul-wisp-particle`: 2, `.soul-wander-particle`: 3),
plus tre skärmdumpar med paus emellan som visar en vandrande partikel
faktiskt stiga från nära "YOUR FATE AWAITS" hela vägen upp till bredvid
"TRIAD ARENA"-titeln över ett par sekunder — bekräftar att
animationscykeln (15-18s) faktiskt kör och rör sig uppåt som begärt.
Ingen JS-logik rörd, inget permanent test (samma konvention som all
tidigare ambient-kosmetik). Hela testsviten grön (100/100, oförändrat
testantal).

**Fas 4s: Soul Stream — mjuka glödande kanter, organisk böjning, och
partiklar som avviker/återvänder + korta ljusspår.** Ny engelsk brief,
uttryckligen "keep their existing motion and speed... make them feel
more alive rather than replacing them". Fyra separata tillägg, alla
respekterar den regeln:

- **Mjuk glödande kant** — varje ram fick en andra, bredare (stroke-
  width ~2-2.4 mot huvudlinjens 0.3-0.45), lågopacitets (~0.14-0.16)
  kopia av samma linje BAKOM den befintliga ljusa streckade — INTE ett
  blur-filter (fortfarande förbjudet sedan lagg-fixen), bara en andra
  helt vanlig `stroke` utan dasharray. Nästan gratis extra kostnad
  (en till statisk stroke, inget filter att räkna om).
- **Organisk böjning** — `<animate attributeName="d">` på varje ram
  (både glöd-kopian och den ljusa linjen delar EXAKT samma
  d-värden/varaktighet så de alltid ligger exakt på varandra även
  medan de böjer sig), som mjukt interpolerar mellan kurvans
  ursprungliga kontrollpunkter och en lätt förskjuten variant och
  tillbaka — samma start-/slutpunkter (ankarna orörda) så "overall
  placement" inte ändras, bara en långsam (8.5-13s), oberoende
  andnings-cykel per ram. `soulRibbonFlow`/`soulSwirl`s befintliga
  hastigheter/varaktigheter rörda inte alls, per "keep the current
  movement speed".
- **Partiklar som avviker och återvänder** — en av de befintliga
  räls-ridande partiklarna fick en andra, ADDITIV
  `animateTransform`(`additive="sum"`) ovanpå sin `animateMotion`, en
  liten oberoende vinglingsrörelse som kombineras med bankurvan istället
  för att ersätta den — bara på EN av partiklarna ("occasional
  particles", inte alla).
- **Korta ljusspår** — två extra, mindre/svagare (opacitet 0.45/0.25,
  radie 0.45/0.3 mot huvudpartikelns 0.6) "eko"-cirklar som rider samma
  bana med en lätt negativ `begin`-offset (så de ligger en bråkdels
  cykel BAKOM huvudpartikeln i tid) — ett klassiskt "kometsvans"-knep,
  ingen motion-blur-filter behövs.

Verifierat via Playwright: element-antal kontrollerat
(`.soul-ribbon-glow`: 3, `.soul-ribbon`: 3 oförändrat, `.soul-wisp-
particle`: 4, `.soul-wisp-trail`: 2, `.soul-wander-particle`: 3
oförändrat), inga sidfel, plus tre skärmdumpar med paus emellan som
visar både en synlig mjuk glöd runt linjen och fortsatt partikelrörelse
uppåt. Ren markup/CSS, ingen spellogik eller hastighet rörd, inget
permanent test. Hela testsviten grön (100/100, oförändrat testantal).

**Fas 4t: Odins ultimate-röstlinje inkopplad** — sjunde ElevenLabs-
uppladdningen ("ZANTETSUKEN Odins ultimate ljud", `voices/odin.mp3`,
33784 bytes, bekräftat unik via `md5sum` mot befintliga röstfiler).
Filnamnet råkade fortfarande säga "Ifrit" (troligen en kvarglömd
ElevenLabs-preset-etikett från verktyget, inte en felmärkning av
användaren — meddelandet var uttryckligt: "Odins ultimate ljud") men
användarens egen instruktion vägde tyngre än filnamnet. Odin hade sedan
tidigare bara sin impact-SFX (`sfx/odin.mp3`, fas 4n) inkopplad, ingen
röstlinje — det här är den delen. Inkopplad i `ULTIMATE_VOICE_LINES`
som `odin: 'voices/odin.mp3'`, engångsrad, ingen ny kod. Fas 4c-testet
utökat igen med en `odinCall`-kontroll. Hela testsviten grön (100/100,
oförändrad teststruktur, bara en ny assertion i ett befintligt test).

**Fas 4u: Soul Stream — helt omdesignad efter "ser ut som maskar"-
feedback.** Ett skärmfoto av den bredbildslayouten (samma som fas 4o/4q
skapade) visade tydligt problemet: de vindlande S-kurvorna kombinerat
med jämnt streckade segment (`stroke-dasharray`) längs dem lästes som
två krälande, ledade kroppar snarare än energi. En uppföljande fråga
till användaren gav en fullständig omdesign-brief: behåll rörelse/
hastighet, men gör själva formen mycket tunnare/mjukare/etherisk, bryt
upp varje strimma i flera separata, avsmalnande fragment med mjukt
tonande ändar, variera längd/ljusstyrka/opacitet (några ska nästan
försvinna), låt PARTIKLARNA vara det tydligaste elementet medan
strimmorna förblir subtil bakgrundstextur, och undvik orm-lika kurvor,
tjocka linjer, hårda kanter och enhetliga former helt.

- **soulPathA/B/C-stage rakades ut** (från multi-böj S-kurvor till en
  enda mild `Q`-kurva, nästan lodrät) OCH gjordes helt osynliga
  (`stroke="none"`) — de finns nu ENDAST kvar som rörelseguider för de
  räls-ridande partiklarnas `animateMotion`/`mpath`, aldrig som synlig
  linje. Detta är exakt hur "keep their existing movement and speed"
  uppfylldes för partiklarna: samma id:n, samma `mpath`-referenser,
  bara den tidigare SYNLIGA streckade linjen längs samma bana togs bort.
- **9 nya `.soul-wisp-fragment`-element** (3 per "körfält", korta raka
  `<line>`, inga kurvor alls) ersätter den gamla enda streckade linjen
  per körfält. Varje fragment avsmalnar mjukt i båda ändar via EN delad
  `linearGradient` (`soulFragGrad-stage`) som använder standard
  `gradientUnits="objectBoundingBox"` — det betyder att SAMMA
  gradient-definition automatiskt tonar ut vid vardera fragmentets EGNA
  början/slut, oavsett dess egen längd/position/vinkel, utan att behöva
  en unik gradient per fragment. Ingen `stroke-dasharray` någonstans —
  det var just de jämnstora, tätt packade streck-segmenten som läste
  som maskled. Varje fragment har sin egen bredd (0.12-0.25),
  bas-opacitet (0.13-0.45, flera medvetet mycket svaga) och
  drift-varaktighet (13-21s), animerat med samma beprövade
  `animateTransform`(translate)+`animate`(opacity fade-in/ut vid
  loopens ändar)-teknik som de självständigt vandrande partiklarna
  redan använde — ingen ny mekanism, bara samma mönster applicerat på
  linjer istället för cirklar.
- **Partiklarna gjorda mer framträdande** ("particles should be the
  most recognizable element") — radien höjd på alla räls-ridande och
  vandrande partiklar (0.5-0.7 → 0.65-0.85) och kärnans opacitet i
  `soulParticleGrad-stage` höjd något (0.65 → 0.7), utan att röra deras
  rörelsemönster.
- All död CSS från den gamla tekniken (`.soul-ribbon`, `.soul-ribbon-a/
  b/c`, `.soul-ribbon-glow`, `soulRibbonFlow`-keyframen,
  `.soul-ribbon-group-2`) borttagen istället för att lämnas kvar
  oanvänd. `soulSwirl`-svajet återanvänt rakt av, nu på
  `.soul-wisp-fragment-group` istället för `.soul-ribbon-group`.

Verifierat via Playwright: element-antal kontrollerat (`.soul-wisp-
fragment`: 9, `.soul-wisp-particle`: 4, `.soul-wander-particle`: 3,
guide-paths: 3), inga sidfel, plus skärmdumpar i både en smal
mobil-liknande vy och EXAKT samma breda desktop-upplösning som
användarens ursprungliga skärmfoto — bekräftar att inga synliga
"mask"-linjer finns kvar, bara mjuka gröna partikelglöd. Ren markup/
CSS, ingen spellogik eller hastighet rörd, inget permanent test. Hela
testsviten grön (100/100, oförändrat testantal).

**Fas 4v: Interaktiv "How to Play"-tutorial + färdiga nybörjar-
uppställningar** ("man måste göra en bra tutorial så nya spelare
förstår spelets mening... dom gissar sig fram... man fattar inte hur
spelet fungerar eller ens gå ut på"). Två separata, av användaren
uttryckligen prioriterade funktioner (bekräftade via AskUserQuestion:
"Interaktiv guidad genomgång" respektive "Färdiga nybörjar-
uppställningar"):

- **`BEGINNER_DECKS`** — två färdiga 5-korts-uppställningar, en-
  klicks-genväg högst upp i "Choose Your Five"-panelen (bara i manual-
  läget, syns inte i Random Draft/Campaign). Varje deck bygger på EN
  enda lättförklarad idé istället för att stapla flera på en gång:
  - **Bonded Guardians** (Darien/Elara/Sarah/Zaevir/Vayra) — lutar sig
    mot Dariens/Elaras REDAN BEFINTLIGA `pairPresence`-bonus (+2 Power
    på alla sidor så länge båda är på brädet) som det tydligaste
    "de här två kort samverkar"-exemplet som redan finns i spelet,
    istället för att uppfinna en ny mekanik att förklara.
  - **Windswept Vanguard** (Zaevir/Sylvarion/Aurelian/Sarah/
    Shadowking) — tre Wind-kort för att visa upp den valfria Elemental
    Clash-regelns "gynnsam matchning"-idé om spelaren slår på den.
  - Att klicka en deck-knapp sätter `state.selected = deck.cardIds.
    slice()` rakt av (samma fält som manuell klick-val redan skriver
    till) och renderar om — `Begin the Duel` blir direkt klickbar.
- **`TUTORIAL_STEPS` + `startTutorial()`/`endTutorial()`/
  `checkTutorialAutoAdvance()`** — en riktig, spelbar 7-stegs
  genomgång istället för ett bildspel. `startTutorial()` sätter upp
  ett DETERMINISTISKT scenario: spelarens hand är fast satt till
  Bonded Guardians-decket, `state.enemyHand = []` (Forest har inga
  kort alls den här omgången), och EXAKT ETT medvetet svagt
  dummy-fiendekort ("Weakling", 1/1/1/1 på alla sidor) förplacerat på
  rutan i mitten (index 4). Eftersom alla riktiga kort i spelarens
  hand har betydligt högre siffror garanterar det att den ALLRA
  FÖRSTA placeringen spelaren gör — oavsett vilket av de fem korten
  eller vilken angränsande ruta de väljer — faktiskt erövrar dummyn
  och visar upp en riktig flip, istället för att riskera en förklaring
  som inte matchar vad som faktiskt hände på skärmen.
  - Varje steg har en `text`-sträng som visas i en fast overlay-panel
    (`renderTutorialOverlay()`, `.tutorial-overlay`/`.tutorial-panel`)
    ovanpå den riktiga stridsskärmen — INTE en separat modal-vy, brädet
    och handen är fullt klickbara bakom panelen hela tiden.
  - Vissa steg har en `autoAdvanceIf()`-closure (t.ex. steg 2 kollar
    `!!state.pendingCard`, steg 3 kollar att brädet har fler än 1
    fylld ruta) som låter steget hoppa fram automatiskt i samma
    ögonblick spelaren faktiskt utför den riktiga handlingen —
    `checkTutorialAutoAdvance()` körs sist i `render()`, gated på
    `state.tutorialActive`, utan att något klick-handler-kodställe
    någonsin behöver veta att en tutorial pågår.
  - **"Next" är ALLTID klickbar oavsett auto-advance-status** (samma
    knapp-rad har också en permanent synlig "Skip Tutorial"-knapp och,
    på sista steget, en "Finish"-knapp istället för "Next") — medvetet
    designval så att ingen kan fastna på en detektionsedge-case.
    Skip/Finish går båda via `endTutorial()` → `resetGame()`, som
    redan (sedan en tidigare rad i samma reset-literal) nollställer
    `tutorialActive`/`tutorialStep`, så draft-skärmen alltid nås rent.
  - Efter att spelaren placerat alla fem kort avslutas matchen av
    motorns EGEN befintliga "inga fler drag möjliga"-logik i
    `advanceTurn` (båda händer tomma) — tutorialen kräver ingen egen
    specialkod för att märka att spelaren är klar, bara `finishGame()`
    som redan finns.
  - **`🎓 How to Play`-knapp** tillagd direkt under regel-texten på
    draft-skärmen (synlig oavsett vilket läge-flik som är aktivt),
    startar tutorialen.

Verifierat via ett engångs-Playwright-skript (inte tillagt i den
permanenta sviten — ren UI/state-verifiering av klick-flödet, samma
gräns som testfilens egen "täcker inte UI-klick"-kommentar drar):
How to Play-knappen syns och startar tutorialen; dummy-kortet ligger
på rätt ruta; att klicka ett handkort auto-avancerar till steg 2;
`placeCard(1, ...)` mot en ruta bredvid dummyn flippar den till blue
och auto-avancerar till steg 3; Finish-knappen finns på sista steget
och återställer till `phase:'draft'`/`tutorialActive:false`; Skip
Tutorial mitt i gör detsamma; de två beginner-deck-knapparna syns i
Choose Your Five och fyller `state.selected` korrekt. Bekräftat med
skärmdumpar i både smal mobilvy och bred desktopvy. `node --check` på
extraherat script-innehåll grönt. Hela den permanenta testsviten körd
om efteråt: 100/100 grönt, oförändrat testantal (rent tillägg av
UI/state, inga ändringar i den befintliga strids-motorn).

## Triad Arena 2.0 — designöversyn och Fas 1

Efter en längre serie VFX/audio/bugfix-punkter bad användaren om en
helt annan sorts arbete: en djup, kritisk analys av HELA spelet
("Jag vill göra Triad Arena mycket roligare, mer strategiskt och mer
engagerande att spela... Var kritisk. Om något är dåligt eller
tråkigt, säg det.") innan någon kod ändrades. Fem parallella
research-agenter läste igenom motorn, hela kortrostret, AI:n,
UI/UX+prestanda respektive campaign-systemet var för sig (varje agent
fick exakta radintervall att verifiera, inga gissningar), och
resultatet syntetiserades till en fullständig rapport (avsnitt 1-7 +
A-E, se sessionens konversationshistorik för hela texten — för lång
för att upprepa här i sin helhet, men de viktigaste verifierade
fynden var):

- **Ingen förhandsvisning existerade alls** — koden hade en egen
  kommentar (`battleNeighbors`) som bekräftade "this is a real attack
  resolution (not a hover preview)". Spelaren kunde aldrig se vad en
  placering skulle göra innan den utfördes.
- **Kortens tryckta siffror stämde inte** — `effectiveStatFor` räknade
  bara in `captureBonus`/`sideBonus`, medan `fullEffectiveValue`
  faktiskt stapinar över 30 andra modifierare (pairPresence,
  sisterAura, board-lead, rivalitet, olika auror, m.m.) som aldrig
  syntes i den visade siffran.
- **AI:t är en ren giriga 1-drags-simulator** (`simulateFlips`) utan
  lookahead, utan Same/Plus/Combo-förståelse, utan försvarslogik,
  utan svårighetsgrader — men bekräftat att den INTE fuskar (läser
  aldrig spelarens hand).
- **Bara ~22% av kortrostret (15/68 kort) har någon multi-kort-synergi
  alls**; 34 av 66 ability-nycklar används av exakt ETT kort vardera.
- **Tre kvarvarande animationer** (`.card.selected`/`selectedGlow`,
  `.special-diamond.locked/.ready`, `.card.special-ready`/
  `specialReadyPulse`) animerade fortfarande `box-shadow`/`filter`
  direkt varje bildruta under helt vanligt, frekvent spelande (inte
  bara sällsynta Ultimate-cast som redan var åtgärdade).
- Fullständig kortroster-, campaign- och AI-statistik finns i
  konversationshistoriken (bl.a. 17 campaign-etapper med verklig
  svårighetskurva, men numera helt kosmetiska "unlocks"; endast EN
  localStorage-nyckel i hela spelet).

Användaren godkände en prioriterad 5-fas-roadmap och bad mig börja
med **Fas 1: "spelet slutar ljuga"** — grunden allt annat i roadmapen
bygger på.

**Fas 1a: Live capture-preview.** Löser huvudproblemet direkt: när
spelaren valt ett handkort märks nu (a) varje tom, laglig ruta som
FAKTISKT skulle erövra minst en fiende med en grön glöd +
en `⚔ N`-badge som visar exakt hur många, och (b) varje fiendekort som
kan erövras från MINST EN tom ruta just nu med en orange
"vulnerable"-ring runt hela rutan. Ingen hover behövs (fungerar
identiskt på mobil och desktop) — hela poängen var att lösa problemet
utan att ändra den beprövade "tryck kort, tryck ruta"-interaktionen.

- **`computeCapturePreview(cardId, cellIndex, owner)`** (efter
  `computeSamePlusCaptures`) — återanvänder de redan rena/read-only
  bitarna av motorn (`computeSamePlusCaptures`, `fullEffectiveValue`,
  `isShielded`, marginShieldThreshold/weightOfAges-tröskeln) istället
  för att skriva om jämförelselogiken en andra gång, så förhandsvisningen
  ALDRIG kan glida isär från hur en riktig placering faktiskt löser sig.
  En tillfällig "stub"-post skrivs till `state.board[cellIndex]` och tas
  bort igen SYNKRONT (inget annat kod kör emellan) så att dessa rena
  funktioner ser en "precis nyplacerad" post, utan att någonsin anropa
  den MUTERANDE `battleNeighbors`/`resolveFlips`-vägen (som annars kan
  kaskadera in i `destroyCard`/graveyard-bieffekter som aldrig får
  trigga av en ren förhandsvisning). Medvetet begränsning: simulerar
  INTE en Combo-kedja (BFS-vidarebattlen som bara finns när Same/Plus
  OCH Combo är på samtidigt) — den kedjan förblir en välkommen
  överraskning istället för att spoilas helt.
- **`getPreviewCaptureTargets()`** aggregerar `computeCapturePreview`
  över alla tomma lagliga rutor en gång per rendering, så
  `boardCellHtml` kan märka en fiende som "sårbar just nu" oavsett
  vilken specifik tom ruta den skulle erövras från.
- Ny CSS: `.cell.would-capture` (grön variant av `.targetable`),
  `.capture-badge` (siffer-badge), `.cell.preview-vulnerable` (statisk
  orange ring, ingen animation alls — billigast möjliga val).

**Fas 1b: Korrekt siffervisning.** `effectiveStatFor` utökad med
`staticLiveBonusFor(card, cellIndex, owner)` — men bara för de
modifierare som är BÅDE (a) inte beroende av vilken specifik
motståndare/sida som anfaller (så en enda platt siffra ärligt kan
representera dem) OCH (b) inte roll-låsta till bara anfall eller bara
försvar (så de är sanna i vila, inte bara mitt i strid):
`rivalryBonusAt`, `lastStandBonus`, `pairPresence` (bara `amount`-
varianten, inte den attack/defense-uppdelade), `sisterAura`,
`boardLeadBonus`, `adjacentAlliesBoost`, `adjacentEnemyAuraThisRound`,
`auraPerPetrifiedEnemy`, `auraPerFrostmarkedEnemy`. Medvetet
EXKLUDERADE: `flatAttackBonus`, `axisBonus`, Elemental Clash,
`weakVsElement`, `vsStrongerTotalPowerBoost` m.fl. — dessa betyder
bara något mot en specifik motståndare/roll, och är exakt vad den nya
live-förhandsvisningen redan visar korrekt, per matchup, istället för
att låtsas att de kan pressas in i en enda vilo-siffra.
`boardCellHtml` skickar nu `cellIndex:i` vidare till `cardFace`/
`effectiveStatFor` (tidigare bara `owner`/`captureBonus`/`sideBonus`).

**Fas 1c: Tre prestanda-fixar**, samma redan etablerade mönster som
`.card-back-face::after`/`cardBackGlow` (statiskt `box-shadow`-VÄRDE på
ett `::after`-lager, bara `opacity` animerad — aldrig blur/spread-
värdena själva):
- `.card.selected` — `selectedGlow` flyttad till `::after`.
- `.special-diamond.locked/.ready` — `filter` är nu ETT statiskt värde
  per state (ingen interpolation), pulsen kommer helt från
  `transform:scale`+`opacity`.
- `.card.special-ready` — `border-color`/`filter` statiska, glöden
  flyttad till `::after`, bara `opacity` animerad.

Verifierat: `node --check` grönt, ny permanent regressionstest
tillagd (`computeCapturePreview`/`getPreviewCaptureTargets`: rapporterar
rätt utfall i båda riktningarna, rör aldrig det riktiga brädet, ignorerar
redan ockuperade rutor, aggregerar rätt över flera tomma rutor) samt en
befintlig test uppdaterad (siffervisnings-testet döptes om och utökat
med två nya assertions: en `pairPresence`-bonus SKA nu synas på en
brädplacerad Darien, en `flatAttackBonus` ska FORTFARANDE inte synas).
Hela testsviten grön: 101/101 (100 befintliga + 1 ny). Playwright-
skärmdumpar bekräftar både förhandsvisningen (grön ⚔-badge på rätt
rutor, orange ring på rätt fiendekort, diagonaler korrekt oberörda) och
att alla tre omskrivna glow-effekterna fortfarande syns visuellt
identiskt efter prestanda-fixen.

**Fas 2: AI-överhalning.** Innan koden skrevs stämdes två designval av
med användaren via AskUserQuestion (båda svarade med det rekommenderade
alternativet):
1. Får sökningen använda spelarens redan synliga, redan utdelade hand
   för sin "vad gör motståndaren härnäst"-resonemang, eller ska den bara
   gissa på ett generiskt värsta-scenario? → **Ja, använd den riktiga
   handen** (samma princip som schack-AI: perfekt information om det
   som redan är känt/utdelat, ingen gissning om framtida slump —
   dessutom klassisk Triple Triad-regel att BÅDA händer syns för båda
   spelare, även om just den här UI:n medvetet visar Forest-handen dold
   för spelaren som atmosfär).
2. Svårighetsväljare nu eller senare? → **Nu**, en Easy/Normal/Hard-
   knapprad på draft-skärmen.

Den gamla AI:n (`simulateFlips`, helt borttagen — ingen anropare kvar)
utvärderade bara de 4 direkta grannarna till EN kandidatplacering, på
råa värden, utan Same/Plus/Combo-förståelse och utan någon aning om vad
spelaren kunde göra som svar (bekräftat i designöversynens AI-avsnitt).
Ersatt med en riktig minimax-sökning med alpha-beta-pruning:

- **`cloneScratchBoard`/`simulatePlacementOutcome(board, cellIndex,
  card, owner)`** — simulerar EN placering (inklusive Same/Plus-fångst
  och, om Combo är på, kedjereaktionen) på en KLON av brädet, rör
  aldrig originalet. Återanvänder de redan rena/read-only bitarna av
  motorn (`computeSamePlusCaptures`, `fullEffectiveValue`, `isShielded`,
  `marginShieldThreshold`) så sökningen aldrig kan glida isär från hur
  en riktig placering faktiskt löser sig. Medveten avgränsning: simulerar
  INTE de ovanligare on-win/on-capture-bieffekterna (destroy, revive,
  petrify, frostmark, debuff-this-round, permanenta aura-flaggor, ...) —
  att återskapa alla ~20 av dem i en klonbar, tusentals-gånger-per-drag
  sökfunktion vore ett mycket större och mer riskabelt jobb än den här
  omgången. Det VALDA draget spelas fortfarande på riktigt via
  `placeCard()`/`resolveFlips()` (se `enemyTurn`), så varje korts fulla
  kit fortfarande löser ut exakt som skrivet när det faktiskt händer —
  bara sökningens EGEN interna framåtblick förenklar bort de ovanliga
  effekterna medan den bestämmer VAR den ska spela.
- **`boardControlScore(board, owner)`** — löv-heuristiken. Eftersom
  hela matchen avgörs rent av vem som kontrollerar flest rutor på
  slutet (`finishGame`), är "vem leder just nu" inte bara EN proxy för
  vinnaren, det ÄR vinstvillkoret — ingen handgjord viktning behövdes.
- **`searchBestPlacement(board, hands, turnOwner, aiOwner,
  depthRemaining, alpha, beta)`** — minimax med alpha-beta-pruning över
  BÅDA sidornas riktiga kvarvarande händer, alternerar varje ply.
- **`AI_FULL_SEARCH_MAX_EMPTY = 5`** — under så här många tomma rutor
  är en uttömmande sökning ända till matchens slut billig (värsta fall
  några tiotusentals lövvägar, långt under realtidsbudgeten med
  pruning) och strikt bättre än vilket fast djup som helst, så
  svårighetsgraden slutar spela roll i slutspelet — alla nivåer spelar
  det sant bästa draget.
- **`AI_DIFFICULTY_DEPTH = { easy:1, normal:2, hard:3 }`** — annars,
  hur många steg som söks framåt. Prestandaverifierat via Playwright:
  Hard, alla valfria regler på, färskt bräde (9 tomma rutor, 5-korts
  händer) → **~12-13ms** för hela sökningen. Ingen async/webworker
  behövdes.
- **`chooseAIPlacement()`** — anropas från `enemyTurn()`, väljer djup
  enligt ovan och returnerar `{cellIndex, card}`.
- **Svårighetsväljare** på draft-skärmen (`.difficulty-toggle`,
  synlig i alla lägen inklusive Campaign), sparas i `localStorage`
  (`triadArenaAIDifficulty`, samma mönster som campaign-sparningen) och
  överlever `resetGame()` precis som `rules`/`draftMode` redan gör.
- **Smartare special-timing (bara Hard)**: en en-rads "är det värt det
  än"-koll i `enemyTryUseSpecial` — en engångs-AOE-special väntar med
  att avfyras tills minst 2 fiendekort finns på brädet (om tomma rutor
  fortfarande finns kvar där fler kan dyka upp), istället för att som
  förut avfyras direkt så fort den är råd att ha. Avfyras ändå
  garanterat om brädet blir helt fullt (aldrig permanent bortkastad).
  Easy/Normal oförändrade (avfyrar fortfarande direkt).

Verifierat: `node --check` grönt. Fem nya permanenta regressionstester
tillagda (`simulatePlacementOutcome`s korrekthet+renhet inklusive ett
Same-regel-fall, ett handbyggt "fälla"-scenario som bevisar att en
2-stegs sökning undviker vad en 1-stegs girig sökning går rakt in i
— girig väljer ruta 1 (slutresultat 3), 2-stegs väljer ruta 4
(slutresultat 5, strikt bättre), `chooseAIPlacement`s slutspels-
override + rök-test vid fullt bräde för alla tre svårighetsgrader,
Hard-specialtimingen, samt att svårighetsvalet sparas/överlever
reset). Hela testsviten grön: **106/106** (101 tidigare + 5 nya).
Playwright bekräftar även att en riktig AI-omgång (blue placerar →
red:s tur löser sig) fungerar felfritt end-to-end på Hard, och att
svårighetsväljaren renderar och fungerar korrekt i UI:t.

**Fas 3: kortsystems-koherens.** Innan koden skrevs stämdes fyra
konkreta val av med användaren via AskUserQuestion (svaren styrde
exakt vad som byggdes):

1. **Duplicerade kort** — flera av de "duplicerade" paren
   (Evil Twist Yang/Yin, Aurelian/Vorlix) är AVSIKTLIGT tematiskt
   speglade (yin-yang-dualitet, himmel/horisont-syskon) och lämnades
   helt orörda. Darum/Maximus hade däremot identiska siffror utan
   någon lore-koppling. Svar: **"Även en lätt touch på tvillingparen"**
   — så både Darum/Maximus OCH Twin Brothers/Twin Sisters fick varsin
   liten differentierande krok.
2. **Elementsystem** — Elemental Clash förstår bara fire/wind/earth/
   water; 5 andra element gör inget under den regeln. Svar:
   **"Förklara det som medvetet"** — ren dokumentationsfix, ingen
   ny beats-kedja.
3. **"Flavor only"-förmågor** — alla 10 var redan ärligt märkta i
   speltexten (inget förtroendeproblem). Nyxaras "Shadow Rend" var
   den ENDA som gick att koppla in med redan befintlig kod. Svar:
   **"Koppla in bara Nyxara nu"**.
4. **Synergi-utbyggnad** — bara ~22% av rostret (15/68 kort) hade
   någon multi-kort-synergi alls. Svar: **"Liten pilot: 2-3 nya
   synergier"**.

Konkreta ändringar (alla kort finns i BÅDA HEROES och FOREST_FOES där
tillämpligt — ändrade på båda ställena):

- **Maximus fick "Warpath (Passive)"** — nytt `active.flatAttackBonus:1`
  (permanent, ovillkorligt +1 vid anfall). Darum rörd INTE alls (han
  har redan sin egen försvars-identitet via `shield`+
  `onWinDirectionalBoost` — "Blood for Glory" vs "Crushing Counter"
  var redan olika mekanismer, bara siffrorna var identiska).
- **Twin Brothers fick "Fraternal Fury (Passive)"** — nytt
  `active.onCaptureBonus:1` (permanent +1 alla sidor per erövring,
  samma primitiv som Bahamut/Vayra/Maximus). **Twin Sisters fick
  "Sisterly Ward (Passive)"** — nytt `active.marginShieldThreshold:1`
  (samma primitiv som Darien/Elara/Medusa: en attack som vinner med
  bara 1 Power blockas istället och blir oavgjord). Deras delade bond
  (`pairPresence`+2, bas-`shield`, Ultimate) rördes INTE — differentieringen
  är additiv, inte en ersättning av deras identitet som par.
- **Elementsystem-förtydligande**: regelpanelens Elemental Clash-text
  fick en ny mening som förklarar att ❄️✨🌑🔮🖤 (ice/light/dark/magic/
  shadow) medvetet står utanför cykeln. Element-badgens tooltip på
  varje kort visar nu "(outside the Elemental Clash cycle)" för de
  fem elementen `ELEMENT_BEATS` inte känner till.
- **Nyxaras "Shadow Rend" kopplades in**: nytt `checkOnWinBonuses`-
  hak (`onWinDestroyWeakestEnemy`), placerat bredvid det redan
  liknande `onWinDestroyIfLoserWeak`. Skannar HELA brädet (inte bara
  kortet hon just slogs mot) efter fienden med lägst `totalPower`,
  respekterar `isDestroyImmune`, och förstör den utan möjlighet till
  Graveyard-återupplivning. BALANS (medveten avvikelse, samma
  resonemang som `onWinLineDestroy` ovan): begränsad till en gång per
  match via `onWinDestroyWeakestUsed` — obegränsad "förstör svagaste
  fienden vid varje vinst" ovanpå hennes redan höga stats och
  `sisterAura`-skalning vore en snöbollseffekt utan motspel.
  Skiltexten bytt från "(Flavor only — ...)" till en riktig
  beskrivning.
- **Synergi-pilot, två nya `pairPresence`-band** (samma primitiv som
  Darien/Elara, +1 istället för Legendary-parens +2 — lägre eftersom
  dessa inte är lika centrala boss-kort): **Zaevir ↔ Sylvarion**
  ("Hunt-Bond", två vind-jägare — redan delad wind-element +
  jägar-/Wild Hunt-tematik i rolltexten) och **Torn ↔ Vayra**
  ("Kindred Shadows", två earth-"shadowblade"-assassiner — redan
  delad earth-element + "Shadow"-namngivning i rolltexten). Båda
  paren var tidigare 100% fristående kort utan någon synergi.

Verifierat: `node --check` grönt. Fyra nya permanenta regressionstester
tillagda (Maximus/Darum + Twin Brothers/Twin Sisters-differentieringen,
inklusive ett margin-shield-blockerings-test för Twin Sisters; Nyxaras
Shadow Rend — träffar rätt icke-angränsande svagaste fiende inte den
hon faktiskt slogs mot, ignorerar en starkare angränsande överlevare,
begränsad till en gång per match även inom SAMMA placering med två
samtidiga erövringar, respekterar destroy-immunitet och väljer näst
svagaste istället; de två nya pairPresence-banden end-to-end via
`fullEffectiveValue`). Två befintliga tester (Zaevir, Maximus)
uppdaterade för att reflektera de nya, avsiktliga `skills`-tilläggen
och den nya `flatAttackBonus`-siffran. Hela testsviten grön:
**109/109** (106 tidigare, varav 2 uppdaterade för de nya avsiktliga
tilläggen, plus 3 helt nya tester). Playwright-skärmdumpar bekräftar
att alla nya skill-texter
renderar korrekt i kortmodalen och att regelpanelens nya
element-förklaring visas läsbart.

**Fas 4: progression — "en match till".** Tre val stämdes av med
användaren via AskUserQuestion innan koden skrevs (den andra
AskUserQuestion-omgången i sessionen registrerade bara ETT av tre
svar första gången — en uppföljande fråga fångade in de två
resterande):

1. **Meningsfulla campaign-unlocks** — svar: **"Kosmetiskt (ram/glow
   på kortet)"**, INTE startbonusar. Viktigt: `campaignPool()` gatar
   fortfarande INGENTING (bekräftat orört — se kommentaren i koden om
   att detta togs bort på användarens egen tidigare uttryckliga
   begäran). Den kosmetiska ringen är additiv, aldrig en spärr.
2. **AI per campaign-etapp** — svar: **"Ja, trappa upp automatiskt"**
   (etapp 1-5 Easy, 6-11 Normal, 12-17 Hard), matchar den befintliga
   regel-/stat-eskaleringskurvan. Den manuella väljaren från Fas 2
   gäller fortsätt fullt ut i Random Draft/Choose Your Five.
3. **Statistik-omfattning** — svar: **"Vinster/förluster + sträck +
   favoritkort (Rekommenderas)"**.

Konkreta ändringar:

- **`MATCH_STATS_SAVE_KEY`/`loadMatchStats()`/`saveMatchStats()`/
  `matchStats`** — exakt samma localStorage-mönster som
  `campaignProgress`. Ny statistik för Random Draft/Choose Your Five
  (tidigare helt spårlöst): `matches, wins, losses, draws,
  currentStreak, bestStreak, cardWins` (en räknare per kort-id).
- **`recordMatchResult(winner)`** — anropas från `finishGame()`.
  Explicit no-op för `state.draftMode === 'campaign'` (den har redan
  sin egen etapp-progress-spårning). Vid vinst inkrementeras
  `cardWins[id]` för alla fem kort i `state.selected` — "favoritkort"
  betyder alltså "kort jag vunnit flest MATCHER med i min femma", inte
  "flest enskilda erövringar med just det kortet" (enklare, billigare,
  och matchar hur en spelare naturligt skulle tänka på det).
  `favoriteCardInfo()` läser av argmax.
- **Ny "Your record"-panel** på draft-skärmen (`renderDraft()`,
  samma `.rules-toggle-panel`-stil som regel-/svårighets-panelerna),
  synlig i Random Draft/Choose Your Five (gömd i Campaign) och bara
  när `matchStats.matches > 0` (inget tomt-state-brus för en helt ny
  spelare).
- **`.card.champion-unlocked`** — ny CSS-klass i `cardFace()`, en
  statisk (oanimerad, kostar inget) guldring runt kort i
  `campaignProgress.unlocked`. Tillagd på draft-grid-anropen i
  manual-läget, campaign-etapp-valet och "Campaign complete"-vyn —
  ALDRIG på stridsplacerade kort (bara i urvals-vyer, per
  användarens egen "i draft-vyn"-formulering).
- **`campaignStageAIDifficulty(stageIndex)`/`effectiveAIDifficulty()`**
  — 0-baserat etapp-index, 1-5→easy, 6-11→normal, 12-17→hard.
  `effectiveAIDifficulty()` returnerar etapp-nivån i Campaign, annars
  `state.aiDifficulty` (spelarens manuella val) oförändrat. Både
  `chooseAIPlacement()` och `enemyTryUseSpecial()`s Hard-special-
  timing-koll uppdaterade att läsa via denna funktion istället för
  `state.aiDifficulty` direkt. Den manuella svårighetsväljaren på
  draft-skärmen gömd helt i Campaign-läget (`state.draftMode !==
  'campaign'`-gate) och ersatt av en liten info-rad ("🌲 Forest AI this
  stage: Normal — ...") på både etapp 1 och etapp 2+-vyerna, så
  spelaren alltid vet vilken nivå de faktiskt möter.

Verifierat: `node --check` grönt. Tre nya permanenta regressionstester
(`recordMatchResult` — vinst/förlust/oavgjort, sträck-räkning inklusive
en ny höjd bästa-sträck efter en tidigare förlust nollställt den,
`cardWins`-inkrementering, campaign-läget spårar INGET, persistens över
en simulerad omladdning; `cardFace`s kosmetiska klass + en explicit
kontroll att `campaignPool()` fortfarande returnerar hela rostret
oavsett unlock-status; `campaignStageAIDifficulty`s alla
etappgränser plus att `effectiveAIDifficulty()` korrekt växlar mellan
etapp-styrd och manuellt vald nivå). Hela testsviten grön: **112/112**
(109 tidigare + 3 nya). Playwright-skärmdumpar bekräftar att "Your
record"-panelen visar rätt siffror, att ett upplåst kort (Sarah) får
`champion-unlocked`-klassen och den statiska guldringen medan ett
icke-upplåst kort (Darien) inte gör det, och att campaign-etapp-vyn
visar rätt auto-tilldelad AI-nivå utan att den manuella väljaren syns.

**Fas 5: onboarding/UI-polish.** Sista fasen i den ursprungliga
designöversynens roadmap. Tre konkreta punkter, ingen ny mekanik:

1. **How to Play-knappen fick sin egen framträdande stil.** Den ärvde
   tidigare `.ghost`-klassen — samma dämpade, halvtransparenta look som
   knappar man förväntas kunna ignorera. Fel signal för just den
   knappen: en förstagångsspelare är exakt vem den finns för, och den
   låg dessutom längst ner under regeltexten, lätt att svepa förbi på
   väg till Random Draft. Gav den en egen guldkantad/guldtonad
   helbreddsstil (samma visuella språk som `.mode-btn.active` redan
   använder för "det här spelar roll, tryck här") istället för att
   konkurrera om uppmärksamhet som en eftertanke.
2. **Info-knappen (`i`) på handkort på mobil fick ett större tryckbart
   område utan att växa synligt.** Den synliga badgen är bara 13×13px
   på 44px-breda handkort — ingen plats att göra den fysiskt större
   utan att krocka med stat-/element-badgarna. Löst med en osynlig
   `::before`-overlay (`position:absolute; inset:-6px`) ovanpå den
   redan `position:absolute`-placerade knappen — ett klick var som
   helst inom det utökade ~25×25px-området räknas som ett klick på
   knappen själv (det är knappens eget renderade innehåll, inte ett
   syskon-element), så noll JS-ändringar krävdes.
3. **Regelbokens sidbilder fick riktig alt-text.** Läste igenom alla 7
   sidbilder (`rulebook-page-*.jpg`) direkt — de är illustrerade och på
   svenska, med substantiellt regelinnehåll (t.ex. bas-sidan täcker
   placering/jämförelse/flip plus Same/Plus/Combo/Elemental Clash,
   "optional"-sidan upprepar samma fyra regler mer detaljerat).
   Tidigare fick en skärmläsare bara höra "Rulebook page N of M" —
   ingen maskinläsbar text alls. Vägde en full textbaserad
   regelboks-ersättning (skulle kräva att skriva OCH översätta en hel
   parallell regelbok från svenska — ett mycket större
   innehållsåtagande) mot en nedskalad version: en ny parallell
   `RULEBOOK_PAGE_ALT`-array (separat från `RULEBOOK_PAGES` så all
   befintlig `.length`/`.map`-användning där förblir orörd) med en
   trogen engelsk beskrivning av varje sidas faktiska innehåll,
   tillagd i `renderRulebookModal()`s `<img alt="...">` som en
   fortsättning efter det gamla sidnummer-fallbacket. Denna
   avgränsning (alt-text, inte en full text-regelbok) är ett
   scope-beslut jag tog själv under arbetet — flaggat till användaren
   i slutrapporten för fasen, inte förhandsgodkänt.

Verifierat: `node --check` grönt. Tre nya permanenta regressionstester
(How to Play-knappen saknar `.ghost` och har den nya
guldkant/helbredd-stilen; `.info-btn::before` expanderar exakt 6px åt
alla håll på mobil-viewport medan den synliga badgen förblir 13px;
`RULEBOOK_PAGE_ALT` har lika många poster som `RULEBOOK_PAGES` och
`renderRulebookModal()` inkluderar rätt beskrivning för både sida 1
och sida 4, med sidnummer-texten kvar som prefix). Hela testsviten
grön: **115/115** (112 tidigare + 3 nya). Playwright-skärmdumpar på
både desktop och 375px mobil-viewport bekräftar att knappen syns
tydligt guldkantad ovanför "Optional rules"-panelen och att
mobillayouten inte fått några regressioner; ingen konsol/page-error
i något test.

## Designöversyn #2 och Fas 6

Efter att hela Fas 1-5-roadmapen (ovan) var klar och mergad till `main`
bad användaren om en NY djup kritisk designöversyn av HELA spelet ("Kör
en ny djup designöversyn på hela spelet igen, säg sen vad vi ska göra
bättre och ta bort"). Sex parallella research-agenter (kärnloop,
kortsystem/balans, AI, game feel/VFX-bloat, UI/UX, progression) grävde
igenom koden var för sig och rapporterade tillbaka; jag sammanställde
fynden till en prioriterad lista (topp-problem, förbättringar sorterade
"billigast + störst effekt" → dyrare innehållstunga förslag, samt en
explicit "vad ska vi ta bort"-lista, eftersom användaren specifikt bad om
det). Användaren godkände att köra på med "billigast + störst
effekt"-listan.

**Fas 6: "billigast + störst effekt".** Sex punkter, ingen kräver ny
grafik/ljud/innehåll:

1. **Same/Plus/Combo på som standard i Random Draft/Choose Your Five.**
   Kärnloop-agenten pekade ut detta som den enskilt billigaste/mest
   verkningsfulla ändringen: `state.rules` gick från
   `{same:false,plus:false,combo:false,elemental:false,graveyard:false}`
   till `{same:true,plus:true,combo:true,elemental:false,graveyard:false}`
   — en rad. Innan detta spelades de flesta matcher i praktiken som ren
   "jämför fyra siffror, högst vinner", det absolut grundaste sättet att
   spela, eftersom det verkliga strategilagret satt gömt bakom en
   hopfälld panel nya spelare aldrig hittade. Elemental/Graveyard förblir
   opt-in (svagare effekt respektive för överraskande för en ny
   spelare). Campaign påverkas inte alls — `startCampaignBattle()`
   skriver alltid över `state.rules` helt från etappens egna
   `CAMPAIGN_STAGES`-data. `resetGame()` bevarar spelarens EGET senaste
   val precis som för `aiDifficulty`/`fastMode` (ändrar bara
   förstagångs-defaulten).
   - Bieffekt: exponerade en latent bugg i ETT befintligt test
     ("Triune Desire: Void Embrace..."), vars syntetiska bräda (10/10/10/10
     mot fyra 1/1/1/1:or) råkade göra alla fyra sidosummor lika (11) —
     exakt Plus-regelns triggervillkor. Med Plus nu på som standard
     routades capturen via `computeSamePlusCaptures` istället för den
     normala `battleOneNeighbor`-vägen testet faktiskt skulle pröva,
     vilket hoppade över on-win-hooken. Fixat genom att sätta
     `state.rules` explicit till allt-av i just det testet (samma mönster
     10 andra tester redan använde) — inte en spelbugg, bara en
     test-setup som tyst förlitat sig på den gamla globala defaulten.
2. **Fast Mode** — ny ⏩-knapp i masthead (tredje ikonen, bredvid
   fullscreen/sound), `state.fastMode` (localStorage-persisterad som
   `aiDifficulty`, bevaras över `resetGame()`). Game feel-agenten pekade
   ut den obligatoriska, icke-hoppningsbara timingen (flip-stagger,
   conquest-banner, mellan-drag-väntan) som den största friktionskällan
   för en spelare som spelar match 50. Ny `fxTime(ms)` skalar de RUTINMÄSSIGA
   väntetiderna (`CONQUEST_BANNER_MS`, SFX-synk-delayerna, chainShake/
   cleanup/winsPopup-timeouts, `finishGame`-delayen, `nextTurnDelay`,
   flip-stagger-beräkningen) ×0.4 när på. CSS-sidan: ny `--fx-speed`
   custom property på `.arena-frame` (default 1, `.fast-mode` sätter
   0.4), och `flip`/`captureRingBlue/Red`/`cardLand`/`conquestPop`s
   `animation`-deklarationer bytta till `calc(Xs * var(--fx-speed,1))`.
   **Medvetet INTE tillämpat** på `ULTIMATE_WINDUP_MS`/`SHAKE_MS`/
   `CLEANUP_MS` eller Ultimate-bannerns/per-kort-identitets-VFX:ens CSS —
   de är den sällsynta "wow"-belöningen en spelare faktiskt vill se i
   fullängd, inte friktion att skära bort, och sker för sällan (någon
   gång per match) för att vara värda den extra synk-risken.
3. **Sköld-bugg i AI-sökningen fixad.** AI-agenten hittade en riktig bugg
   (inte bara en designkritik): `cloneScratchBoard` (används av
   `simulatePlacementOutcome`/`searchBestPlacement`) tappade
   `grantedShield`/`shieldUsed`/`protectiveAuraUntilTurnCount` helt —
   AI:n kunde alltså bedöma en placering som en säker capture som
   `resolveFlips` sedan faktiskt blockerade (ett aktivt beviljat skydd
   "försvann" i simuleringen), OCH ett redan förbrukat engångsskydd
   (`active.shield` + `shieldUsed:true` på riktiga brädan) återställdes
   till "oanvänt" i varje simulerad nod (AI:n förblev onödigt försiktig
   kring ett kort den redan brutit igenom). Samma fynd: Ancient Wyrmkings
   `weightOfAges`-marginalvägg (växer med `turnsStanding`) beräknades
   ALDRIG i simuleringens `battleOneNeighbor` — en helt osedd
   capture-blockerande mekanik. Fixat: `cloneScratchBoard` breddad till
   att bevara alla dessa fält (plus `turnsStanding`-trion), och
   `weightOfAges`-bonusen tillagd i `battleOneNeighbor` (speglar exakt
   den riktiga `battleNeighbors`-logiken).
4. **`AI_FULL_SEARCH_MAX_EMPTY` trappad per svårighetsgrad** (var en
   platt `5` för alla nivåer → `{easy:2, normal:3, hard:5}`). AI-agenten
   pekade ut att på en 9-rutors bräda innebar den gamla platta 5:an att
   den uttömmande "spela alltid det objektivt bästa draget"-sökningen
   kickade in redan efter ~4 totala placeringar — Easy spelade alltså
   bara riktigt grunt de allra första dragen innan den tyst spelade
   perfekt schackmotor-slutspel precis som Hard. Nu stannar Easy kvar på
   sitt grunda djup (1-ply) genom hela slutspelet, matchar äntligen sin
   egen `AI_DIFFICULTY_DESC`-text.
5. **Matchstatistik syns nu på RESULTATSKÄRMEN**, inte bara i
   förhandspanelen. Både UI/UX- och progression-agenten oberoende av
   varandra pekade ut detta som den billigaste missade payoffen i hela
   progressionssystemet — en ny streak eller ett nytt personbästa var
   osynligt precis när det faktiskt hände. Ny `.result-stats`-sektion i
   den icke-campaign resultatvyn: `🔥 N-win streak` (bara från 2 i rad,
   `— new best!` när `currentStreak === bestStreak`) plus
   `⭐ Favorite champion` (visas alltid när ett finns, oavsett vinst/
   förlust). Gated exakt som `recordMatchResult()` redan är — syns
   ALDRIG i Campaign (som har sin egen etapp-progress-feedback).
6. **Badge-krock fixad.** UI/UX-agenten hittade en reproducerbar visuell
   bugg: `.special-diamond` och `.petrified-badge` renderades båda på
   EXAKT samma position (`bottom:4px; right:4px`) — ett förstenat kort
   med en oanvänd Special dolde den ena badgen helt bakom den andra,
   trots att `.petrified-badge`s egen kommentar hävdade en
   kollisionsfri plats (den räknade bara med `.element-badge`, inte
   `.special-diamond`). Fixat utan en femte badge-position: ny
   sibling-selector `.petrified-badge ~ .special-diamond{ bottom:27px; }`
   (förlitar sig på att petrified-badge redan renderas FÖRE
   special-diamond i `cardFace()`) staplar diamanten ovanför istället
   för att kräva ett helt nytt hörn.

Verifierat: `node --check` grönt. Sju nya permanenta regressionstester
(default-rules + campaign-oberoende + `resetGame()`-bevarande; Fast
Mode-persistens/toggle/`fxTime()`-skalning/Ultimate-timing orörd;
`.arena-frame`s `fast-mode`-klass + masthead-knappens `on`-state;
sköld-/`weightOfAges`-fixen med fyra separata scenarier; AI-trappningen
bevisad genom en hand-konstruerad 3-tom-cells-fälla där Easy fortfarande
går i den men Normal/Hard nu undviker den — inte bara en konstant-koll;
resultatskärmens streak/favoritkort-rader genom en hel sekvens av
vinst→vinst→vinst→förlust plus ett campaign-särfall; badge-kollisionen
via `getComputedStyle`). Hela testsviten grön: **122/122** (115 tidigare
+ 7 nya, inklusive den ena befintliga testfixen ovan). Playwright-
skärmdumpar bekräftar: draft-skärmens regelpanel visar Same/Plus/Combo
förikryssade och Elemental/Graveyard tomma; ⏩-knappen syns i masthead;
resultatskärmen visar "🔥 2-win streak — new best!" och
"⭐ Favorite champion: The Celestial Bahamut (2 wins)" direkt under
Victory-rubriken; båda badgarna syns tydligt särskilda på ett
petrifierat kort med redo Special. Ingen konsol/page-error i något
test.

**Fas 7: "resten av listan" — medel-kostnad + de två större punkterna.**
Efter Fas 6 bad användaren att köra vidare med resten av designöversyn
#2:s lista. Två AskUserQuestion-omgångar avstämda innan kodning: (1) om
borttagningarna (skär 2-3 "apocalypse boss"-skurkar, slå ihop Random
Draft in i Choose Your Five) skulle göras — svar: **"Fråga mig igen
precis innan varje borttagning"**, och när de faktiska förslagen lades
fram (skär Zalazar / skär Zalazar+Umbrael, respektive slå ihop Random
Draft) svarade användaren **nej på båda** — inga kort/lägen togs bort.
(2) Om de två större punkterna (campaign-eskalering, meta-lager) skulle
räknas in nu eller sparas — svar: **"Räkna in dem nu också"**.

Sju punkter genomförda, ingen kräver ny grafik/ljud:

1. **De 7 copy-paste-Ultimates fick verkliga, unika effekter.** Alla sju
   (Zaevir/Sarah/Vayra/Ysara/Ragnar/Tilda/Aurelian) delade tidigare
   bokstavligt identisk `SPECIAL_HANDLERS`-kod (samma tröskelkoll, samma
   `attackBoost(srcEntry,1)`), bara olika namn/flavor-text. Zaevirs
   Eternal Arrow behölls som basversionen (delas redan med ett dussintal
   lägre-profil-kort som Darien/Vorathos/Deathblade — inte unikt för
   just honom längre). De andra sex fick varsin mekanisk krok, alla
   återanvänder befintliga `SpecialVerbs`-primitiv (`grantShield`,
   `debuffThisRound`, `extraTurn`, `directionalBoost`) — ingen ny
   motor-kod:
   - **Sarah** (Aion's Last Light): på vinst skyddar hon nu också en
     slumpmässig ALLIERAD (aldrig sig själv eller kortet hon precis
     erövrade — en riktig bugg hittades och fixades här: filtret
     exkluderade ursprungligen bara `srcEntry`, inte det nyss erövrade
     `targetEntry`, vilket gjorde testet icke-deterministiskt).
   - **Vayra** (Eclipse): ignorerar nu mål-kortets sköld helt (samma
     "ignorerar försvar"-mönster som Lyriths Serpent's Wrath).
   - **Ysara** (Eternal Eclipse): ger en extra tur vid vinst istället för
     permanent stat-bonus — Tidsväverskan spolar tillbaka ögonblicket
     istället för att bara slå hårdare nästa gång.
   - **Ragnar** (Blood Fury): raseriet skvätter nu över på en andra
     slumpmässig fiende (-2 denna runda) vid vinst.
   - **Tilda** (Nightfall): försvagar nu MÅLET (-2 denna runda) INNAN
     anfallet, istället för att buffa sig själv — en riktig sabotage-
     mekanik som alltid mattar målet även vid ett misslyckat anfall, men
     ger ingen permanent vinst.
   - **Aurelian** (Skybreaker): den permanenta bonusen landar nu bara på
     topp/botten (men dubbelt så stor, +2 istället för +1) istället för
     alla fyra sidor — matchar hans egen `axisBonus`-passiv.
2. **9 döda "(Flavor only)"-förmågor lösta.** Exakt granskning av varje:
   Ifrits "Rage of the Beast" (tidigare olöst tolkning) kopplades in —
   tolkad som "när ett ANNAT kort på Ifrits sida erövras av fienden får
   Ifrit +2 alla sidor denna runda", byggd i `checkOnWinBonuses` (måste
   ligga FÖRE funktionens `if(!a) return`-early-return, eftersom kroken
   är knuten till FÖRLORARENS sida, inte vinnarkortets egna `active` —
   en riktig bugg hittades och fixades här också, upptäckt via ett eget
   test med en syntetisk anfallare utan `active`-fält alls). De
   återstående 8 (Celestial Judgments Divine Judgment + Heavenly Aegis,
   Infinite Seraphs Cosmic Insight + Infinite Paths + Omniscient Aegis,
   Fenrirs Curse, Odins Raven's Insight, Triune Desires Weakness — Broken
   Focus) beskriver alla system som genuint inte finns i motorn (oavgjort-
   utfall per ruta, hand-reveal/fog-of-war, fri ompositionering,
   matchöverskridande state, generisk negation av ALLA framtida bonusar)
   — att bygga en hel ny delsystem bara för en rad flavor-text vore precis
   den scope-creep-fällan granskningen varnade för, så texten togs bort
   istället för att uppfinna sex nya mekaniker under tidspress.
3. **AI:ns enkel-mål-special-timing generaliserad.** Samma "är det värt
   det än"-mönster som redan fanns för AOE-specialer (Fas 2) nu även för
   vanliga enkel-mål-specialer: på Hard väntar AI:n med en engångs-
   special om bästa tillgängliga mål är värt mindre än halva kortets
   egen power OCH fler än en tom ruta återstår — innan var beteendet
   helt deterministiskt och inlärbart (avfyra alltid direkt när NÅGOT
   vinnbart mål fanns).
4. **Draft-skärmen omstrukturerad.** Läges-väljaren (Random Draft/Choose
   Your Five/Campaign) och den faktiska kort-hämtningen flyttades UPP,
   före inställningarna — en förstagångsspelare möter nu den primära
   handlingen direkt istället för att skrolla förbi tre inställnings-
   paneler först. De tre separata `.rules-toggle-panel`-boxarna (Optional
   rules/AI-svårighet/Your record) slogs ihop till EN "Match Settings"-
   panel med interna sektionsrubriker istället för upprepad ram-stil.
5. **Turn/Wins-hierarkin rättad.** Turordnings-texten fick en egen
   guld-pill med bakgrund/kant (upp från vanlig text) och Wins-chipsen
   fick en statisk glow/scale när det är den sidans tur (`.active-turn`)
   — bådaväger nu visuellt tyngre än rutantalet, som bara spelar roll
   på slutet men tidigare dominerade visuellt.
6. **Campaign-etapp 9-16 fick riktig mekanisk eskalering**, inte bara
   omblandade fiender + hårdare AI. Nytt `statBoost`-fält per etapp
   (1/1/1/2/2/2/3/3, stapling: `campaignStatBoost()`) — samma shallow-
   copy-mönster som befintlig `ngPlusBoostCard()` men en SEPARAT,
   okapad summa som staplar additivt med NG+ istället för att dela dess
   `Math.min(...,3)`-tak. Etapp 17 (systrarnas final) fick medvetet
   INGEN stat-boost — den är redan tematiskt/AI-mässigt toppen, inte
   bara-större-siffror. Syns för spelaren på campaign-panelen, samma
   synlighetsprincip som AI-svårighets-raden.
7. **Ett litet achievement-system** (meta-lagret, billigaste versionen
   av progression-agentens förslag) — återanvänder BARA befintlig
   `matchStats`-data, inget nytt spårningssystem. Sex prestationer
   (First Blood, Total Domination, Hard-Fought Victory, On a Roll,
   Veteran, Purist), persisteras i `localStorage` som `unlockedAchievements`.
   Aldrig i Campaign (samma no-op-mönster som `recordMatchResult`). Nya
   låsta upp visas direkt på resultatskärmen ("🏅 Achievement unlocked:
   ..."), alla upplåsta syns som badge-rad i Match Settings-panelens
   "Your record"-sektion.

Verifierat: `node --check` grönt genomgående. Fem nya permanenta
regressionstester utöver att tre BEFINTLIGA tester (Tilda/Aurelian/
Ysara) uppdaterades för att matcha de nya Ultimate-effekterna istället
för den gamla "oförändrad"-texten: de tre nya unika Ultimate-krokarna
(Sarah/Vayra/Ragnar) som befintliga tester råkade inte träffa; Ifrits
Rage of the Beast (inklusive självfångst-undantaget); campaign
statBoost (default-av tidiga/final-etapper, rätt stapling 9-16, additiv
staplig med NG+, faktisk `startBattle()`-tillämpning); achievement-
systemet (alla sex triggers, ingen dubbelupplåsning, Campaign-no-op,
resultatskärms-visning). Hela testsviten grön: **126/126** (122
tidigare + 5 nya, plus 3 uppdaterade + 1 i sig oförändrat test där bara
namnet gjordes mer korrekt). Playwright-skärmdumpar bekräftar: draft-
skärmens nya ordning (läges-väljare + kort-hämtning före den
konsoliderade Match Settings-panelen); resultatskärmen visar flera
samtidiga achievement-rader korrekt; Match Settings visar "Your record"
+ en badge-rad med upplåsta achievements; turordnings-pillen och den
aktiva sidans Wins-chip (med glow) läser tydligt som mest framträdande
över rutantalet. Ingen konsol/page-error i något test.

**Fas 8: VFX-expansion — fler kort, delat system.** Användaren ville ha
fler kort med egen Ultimate-VFX-identitet (som Nyxara/Ifrit/Vaelira/
Seraphine/Omega Weapon/Shiva/Bahamut redan hade). Två snabba
AskUserQuestion-avstämningar: (1) bygga om till ett delat, parametriserat
system FÖRST (istället för att kopiera in ett 8:e ~80%-identiskt block,
precis vad designöversynens game feel-agent flaggade som nästa-touch-
kandidat) — svar: **"Ja (Rekommenderas)"**. (2) vilka kort — svar:
**"Låt mig välja åt dig"**. Användaren klargjorde också att ljud kommer
i efterhand — bara VFX den här omgången.

Två delar:

1. **Delad geometri (JS) — ren refaktor, noll visuell risk.** Två
   funktioner extraherade: `cellCenterPercent(cellIndex)` (cellens
   mittpunkt i % av brädet) och `angleAndLengthPercent(originX,originY,
   targetX,targetY)` (vinkel+längd för en riktad stråle, normaliserad för
   brädets 5/7-bildförhållande — en Silver Judgment-kommentar refererade
   redan till en `angleAndLengthPercent()` som om den fanns, den gjorde
   det inte förrän nu). Samma exakta matematik som fanns inline på **8
   ställen** (Nyxara/Ifrit/Vaelira/Seraphine/Omega/Shiva/Bahamut/Odins
   attack-slash) migrerade till att anropa de delade funktionerna —
   identiska tal, bara deduplicerat.
2. **Delat CSS-verktygslåda (`.ultimate-vfx`/`.vfx-*`) — ny, för kort
   FRAMÅT.** De 7 befintliga kortens fungerande, redan finjusterade
   `*-fx`-block rördes INTE (verklig regressions-risk för noll synlig
   vinst, ren intern städning) — istället en ny, ren uppsättning
   återanvändbara primitiver som varje nytt kort bygger på: `.vfx-ring`
   (expanderande våg/blast — det absolut mest upprepade mönstret i alla
   7 befintliga kort), `.vfx-hit` (per-mål-träff), `.vfx-flash`
   (helskärms-färgvåg), `.vfx-particle` (8 fasta erbjudna offset-
   positioner, indragning under cast), `.vfx-twinkle` (6 kvardröjande
   glitter-partiklar) — alla färgsatta via CSS custom properties
   (`--vfx-ring-color` osv.) istället för hårdkodad rgba() per kort.
   Tre nya kort byggda helt på detta:
   - **Odin — Zantetsuken** ("sju blixtsnabba slag"): 7 staggade
     `.vfx-hit`-träffar på samma mål (7×0.07s mellanrum) följt av en
     avslutande `.vfx-ring`, guld/vitt.
   - **Tiamat — The Fivefold Apocalypse**: alla fem krafter (eld/is/
     storm/void/natur) manifesteras SAMTIDIGT som fem olikfärgade
     `.vfx-ring` som konvergerar på målet, oavsett vilken kraft spelaren
     faktiskt valde mekaniskt (att koppla VFX:en till det faktiska valet
     hade krävt att leda `extra.power` genom `state.ultimateBanner` bara
     för detta — undvikt, "Fivefold" läses lika bra som hela gruppen av
     krafter som visar sig på en gång).
   - **Ancient Wyrmking — Conquests Witnessed**: drakisk rytande
     chockvåg — en stor jordfärgad `.vfx-ring` från hans egen cell +
     `.vfx-hit` per fiende (riktig AOE, `'Conquests Witnessed'` tillagd
     i `playUltimateSequence`s `aoeEnemyIndicesAtCast`-lista precis som
     de 6 andra AOE-korten) + kvardröjande `.vfx-twinkle`-damm.

Verifierat: `node --check` grönt. Fyra nya permanenta regressionstester
(de två delade geometri-funktionerna ger exakt samma tal som cellindex
0/4/8 samt korrekt vinkel/längd inklusive bildförhållande-normalisering;
en explicit regressionskoll att Nyxara/Bahamut/Seraphines härledda
VFX-positioner/vinklar är numeriskt OFÖRÄNDRADE efter refaktorn — två av
dessa körningar avslöjade en flyttals-precisionsfälla i själva testet
(`100/6` och `0.5/3*100` är INTE bit-identiska i JavaScript trots att de
är matematiskt lika — `false !== true` på ett strikt strängmatchnings-
test), fixat genom att beräkna det förväntade värdet via samma delade
funktion istället för en handskriven bråkform; de tre nya kortens VFX
använder verktygslådan korrekt (Odins 7 träffar, Tiamats 5 ringar,
Wyrmkings AOE-träffar+glitter, inget renderas utan aktiv banner);
Conquests Witnessed snapshotas korrekt i `aoeEnemyIndicesAtCast`. Hela
testsviten grön: **130/130** (126 tidigare + 4 nya). Playwright-
skärmdumpar av alla tre nya kort (cast + impact-fas) bekräftar att de
faktiskt renderar som avsett, plus ett regressions-spot-check av Nyxara
(Void Dominion-cirkel korrekt centrerad) och Bahamut (Megaflare-svepet +
träffar på rätt celler) efter geometri-refaktorn — inga visuella
regressioner. Ingen konsol/page-error i något test.

**Fas 9: VFX-expansion, runda 2.** Användaren bad om merge av Fas 8 till
`main` OCH att fortsätta med fler kort, "ditt val". Fyra kort valda:
**Medusa** (Gorgon's Dominion — AOE, förstening), **Fenrir** (Ragnarök —
riktnings-special, INTE AOE), och tvillingparet **Twin Brothers/Twin
Sisters** (Solar Tempest/Lunar Eclipse — enkelmål, spegeldesign).

Två genuina fynd under arbetet, inte bara nya kort:

1. **`state.ultimateBanner` saknade `direction`.** Fenrirs Ragnarök är
   det FÖRSTA riktnings-baserade kortet som får egen VFX — ingen
   tidigare kort-identitet behövde veta VILKEN rad/kolumn som valts.
   `extra.direction` fanns redan i `job`-objektet i `playUltimateSequence`
   (använt av `SPECIAL_HANDLERS.fenrir` själv) men trädde aldrig igenom
   till `state.ultimateBanner`, som renderingslagret faktiskt läser.
   Tillagt (`direction: extra && extra.direction`) på både cast- och
   impact-fasens banner-tilldelning. VFX:en återanvänder den redan
   existerande `enemiesInDirection(index, direction, owner)`-funktionen
   (samma som den riktiga upplösningen/AI:n redan använder) istället för
   att räkna ut rad/kolumn en tredje gång.
2. **Gorgon's Dominion (Medusa) är en AOE som varken förstör eller
   fångar** — lades till i `aoeEnemyIndicesAtCast`-listan i
   `playUltimateSequence` (samma "snapshot fiende-positioner vid cast"-
   mönster Diamond Storm redan etablerade för icke-förstörande AOE:er)
   samt i skärm-skaknings-opt-in-listan tillsammans med Ragnarök (båda
   sätter aldrig `justFlipped`, så `capturedCount` skulle annars alltid
   bli 0 och skakningen aldrig utlösas — samma resonemang som Void
   Dominion/Hellfire m.fl. redan dokumenterat där).

Design: Medusa — sten-grå/grön ring + träffar + kvardröjande "stendamm";
Fenrir — endast cellerna i den FAKTISKT valda riktningen får en isblå
träff (bekräftat med en Playwright-skärmdump: kortet i "upp"-riktningen
lyser, kortet i "ner"-riktningen förblir helt orört); tvillingarna —
varmt guld (Solar Tempest) vs kallt silverblått (Lunar Eclipse), samma
speglade designspråk som deras `pairPresence`-band i kortdatan.

Verifierat: `node --check` grönt. Två nya permanenta regressionstester
(alla fyra kortens VFX renderar rätt antal/färg/position, inklusive den
explicita riktnings-filtreringen och en "ingen riktning vald ännu"-
säkerhetskoll som inte får krascha; `state.ultimateBanner.direction`
bekräftat trätt igenom vid en riktig `runSpecialResolution`-anrop, samt
Gorgon's Dominions `aoeEnemyIndicesAtCast`-snapshot) — en av dessa
avslöjade en riktig testbugg (inte en spelbugg): `state.ultimateBanner`
återställdes aldrig till `null` mellan de två testade specialerna, så
den andra `runSpecialResolution`-anropet köades istället för att köras
direkt (samma kö-mekanism som förhindrar två samtidiga Ultimate-
banderoller) — fixat genom att explicit nolla den mellan de två
scenarierna. Hela testsviten grön: **132/132** (130 tidigare + 2 nya).
Playwright-skärmdumpar av alla fyra kort bekräftar att de renderar
korrekt, med Fenrirs riktnings-specifika träff som det tydligaste
beviset. Ingen konsol/page-error i något test.

**Fas 10: VFX-expansion, runda 3.** Användaren bad om ännu fler kort,
"ditt val" (samma instruktion som startade Fas 9). Fyra kort valda:
**The Celestial Judgment** (Eternal Verdict — riktnings-special, precis
som Fenrirs Ragnarök men kan faktiskt FÖRSTÖRA celler), **Lyrith**
(Serpent's Wrath — enkelmål, ignorerar sköldar, chans till kritisk
förstörelse), **Vorlix** (WorldCleaver — enkelmål, tonad som en
void-lila spegelbild av Aurelians redan-VFX:ade gyllene vertikala tema,
matchar deras `pairPresence`-band i kortdatan) och **Triune Desire**
(Forbidden Harmony — förstör upp till 4 angränsande fiender, en per
riktning).

Ett genuint tekniskt problem, inte bara nya kort: Eternal Verdict är det
FÖRSTA riktnings-baserade kortet som kan förstöra celler (Fenrirs
Ragnarök är en ren permanent debuff — cellerna finns alltid kvar på
brädet). Att återanvända Ragnaröks mönster (läsa `enemiesInDirection()`
direkt mot `state.board` vid render-tillfället) hade tystat träff-VFX:en
för varje cell som redan hunnit förstöras innan impact-fasen renderas
(`destroyCard` nollställer cellen, och en nollställd cell räknas inte
längre som "fiende i linjen"). Löst genom att utöka
`playUltimateSequence`s befintliga `aoeEnemyIndicesAtCast`-snapshot-
mekanism (tidigare bara för hel-bräde-AOE:er som Infernal Pact/Silver
Judgment) med två nya, mer begränsade varianter:

1. **Eternal Verdict** snapshot:ar bara `enemiesInDirection(sourceIndex,
   direction, owner)` — samma linje special:en faktiskt träffar, inte
   hela brädet.
2. **Forbidden Harmony** snapshot:ar bara de upp-till-4 cellerna direkt
   angränsande casten (samma rad/kol-loop som
   `SPECIAL_HANDLERS.triunedesire` själv använder), inte hela brädet
   heller.

Båda återanvänder samma `enemyIndices`-fält på `state.ultimateBanner`
som de befintliga hel-bräde-AOE-korten redan trär igenom — inget nytt
banner-fält behövdes. Båda lades också till i skärm-skaknings-opt-in-
listan (ingen av dem sätter någonsin `justFlipped`, samma resonemang som
Ragnarök/Gorgon's Dominion redan dokumenterat).

Design: Eternal Verdict — gyllene/vitt "dom"-tema (matchar Celestial
Judgments egen guldaccent och vind-element); Serpent's Wrath — giftig
magenta ring, distinkt färg från Vorlix egen; WorldCleaver — void-lila,
medvetet skild från Lyriths magenta så de två aldrig kan förväxlas i en
skärmdump; Forbidden Harmony — varje träff cyklar genom de tre systrarnas
EGNA identitets-VFX-färger (Nyxaras void-magenta från Void Dominion,
Vaeliras infernal-crimson från Infernal Pact, Seraphines silver-guld från
Silver Judgment), samma "cykla en fast palett per träff"-idé som Tiamats
`FIVEFOLD_COLORS` men tonad till just dessa tre systrar istället för de
fem elementen — en visuell påminnelse om att "de tre systrarna förenas"
utan att uppfinna en fjärde paletts.

Verifierat: `node --check` grönt. Två nya permanenta regressionstester
(alla fyra kortens VFX renderar rätt antal träffar/färger/positioner,
inklusive ett explicit test att Eternal Verdicts träff-VFX överlever en
redan-nollställd cell — precis anledningen till att den använder
snapshot:et istället för en live brädfråga; samt ett separat test som
bekräftar att både Eternal Verdict och Forbidden Harmony bara snapshot:ar
SINA EGNA påverkade celler vid en riktig `runSpecialResolution`-anrop,
inte hela brädet, till skillnad från de befintliga hel-bräde-AOE-korten).
Hela testsviten grön: **134/134** (132 tidigare + 2 nya). Playwright-
skärmdumpar av alla fyra kort bekräftar att de renderar korrekt — Serpent's
Wrath och WorldCleaver visar tydligt sina distinkta ring-färger runt
målkortet, och Forbidden Harmonys skärmdump visar alla fyra
systerfärgerna samtidigt runt Triune Desire. Ingen konsol/page-error i
något test.

**Fas 11: Game-feel-uppföljning — hitstop + impact-punch.** Användaren
frågade om tips på att göra Ultimate-effekterna ännu bättre. Jag föreslog
(kort, utforskande svar, inget implementerat än) fyra idéer och
rekommenderade en: **hitstop/impact-frame-paus** (billigast, träffar hela
det delade systemet på en gång) + en liten **kamera-punch** (skalzoom vid
träff). Användaren godkände ("Ja gör det") men la själv till ett genuint
observation-fynd: för AOE-attacker som förstör kort hinner korten redan
försvinna från brädet i SAMMA tick som träff-VFX:en visas — spelaren
hinner aldrig se attacken faktiskt träffa dem innan de förstörs.

Rotorsak: `playUltimateSequence`s gamla fas 2 körde `handler()` (som
anropar `destroyCard()` synkront) i EXAKT samma tick som impact-
banderollen sattes och renderades — så det första impact-renderingen
någonsin visade ett redan-tomt bräde för varje förstört kort, oavsett
special. Detta gällde inte bara Fas 8-10:s nya AOE-kort utan varenda
Ultimate i spelet, inklusive redan existerande (Infernal Pact, Silver
Judgment, Omega Protocol, m.fl.) — ett genuint, tidigare odokumenterat
game-feel-hål i grundarkitekturen, inte en kort-specifik bugg.

Lösning: `playUltimateSequence` delades upp i tre riktiga faser istället
för två:

1. **Windup** (oförändrad, `ULTIMATE_WINDUP_MS`).
2. **Träff** (ny gräns): banderollen växlar till `phase:'impact'`,
   `attackFlash` sätts, ljud spelas, och rendern visar ring/hit/flash-
   VFX:en — men brädet är fortfarande OFÖRÄNDRAT. Ny konstant
   `ULTIMATE_HITSTOP_MS = 220` (samma "spectacle, inte friktion"-princip
   som de andra `ULTIMATE_*`-konstanterna — medvetet INTE skalad av
   `fxTime`/Fast Mode) håller kvar detta läge en kort stund.
3. **Upplösning** (efter hitstop-pausen): `handler()` körs nu FÖRST här —
   flip/förstörelse/debuff, `capturedCount`, chainShake-beslutet och
   "Conquered!"-popupen, precis som tidigare kod, bara flyttad bakom
   hitstop-pausen.

Detta löser användarens observation helt generellt (alla nuvarande OCH
framtida Ultimate-kort, inte bara AOE-förstörare) utan att röra en enda
kort-specifik `SPECIAL_HANDLERS`-funktion.

**Impact-punch**: ny `state.impactPunch`-flagga, satt (medvetet
OVILLKORLIGT — till skillnad från `chainShake`s
`capturedCount>=3`-tröskel) i samma ögonblick som upplösningen sker, så
även en enda liten fångst känns som en träff. Renderas som
`.board.impact-punch` (en kort `scale(1.035)`-puls) — medvetet på
`.board`, INTE `.arena-frame` (som `chain-shake` redan animerar via
`transform`), eftersom två `animation`-deklarationer på samma element inte
går att kombinera i CSS (den senare i källkodsordning vinner helt, de
adderas inte) — genom att lägga punchen på ett barn-element (`.board`
inuti `.arena-frame`) kan translate-skaket och scale-punchen köra
samtidigt utan att krocka.

Verifierat: `node --check` grönt. En stor testfil-uppdatering krävdes —
24 befintliga tester väntade exakt `ULTIMATE_WINDUP_MS + 50` innan de
läste av upplösningsresultatet (flip/fångst/förstörelse), vilket nu sker
`ULTIMATE_HITSTOP_MS` senare; alla uppdaterade till att vänta
`ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50` (samt tre
cleanup-väntningar med `+ 1300 + ...`). Tre nya permanenta
regressionstester: (1) det faktiska hitstop-hålet — ett AOE-förstöra-kort
(Vaeliras Infernal Pact) har sin impact-banderoll/VFX redan aktiv medan
målet fortfarande finns kvar OFÖRSTÖRT på brädet, och förstörs först efter
hitstop-pausen; (2) `impactPunch` triggas ovillkorligt vid en enda liten
fångst (Twin Brothers' Solar Tempest, som INTE når `chainShake`s
tröskelvärde) och rensas tillsammans med skaket; (3) `.board` får
`impact-punch`-klassen bara när flaggan är satt. Hela testsviten grön:
**137/137** (134 tidigare + 3 nya). Playwright-skärmdumpar av ett riktigt
Forbidden Harmony-anrop (Triune Desire mot 4 Cave Ogres) bekräftar
flödet visuellt: en bild tagen precis när impact-fasen börjar visar
ringen/träff-VFX:en över fyra fullt intakta, ofärgade Cave Ogres, och en
andra bild tagen precis när `destroyGhosts` faktiskt fylls visar samma
fyra kort nu krossade/bleknande — exakt den ordning användaren efterfrågade.
Ingen konsol/page-error i något test.

**Fas 12: VFX-expansion, runda 4.** Användaren bad om ännu fler kort,
"ditt val" (samma återkommande instruktion). Fyra kort valda: **Vorgrath**
(The Falling World — tredje riktnings-kortet, alltid-förstör-variant),
**Pallis** (Wave of Loyalty — den FÖRSTA "välsignelse"-identitets-VFX:en,
riktad mot EGNA element-matchande allierade istället för fiender) och
paret **Evil Twist Yang/Yin** (Yang/Yin Resonance — spegeldesign,
vit/guld mot svart/violett, matchar deras `pairPresence`-band).

Två genuina designval, inte bara nya kort:

1. **Wave of Loyalty är den första VFX:en som aldrig rör en fiende.**
   Pallis special:en läker/skölder sina EGNA element-matchande
   allierade — helt annorlunda semantik än varje tidigare AOE/enkelmål-
   VFX i spelet, som alla river ner fiender. Löst genom att återanvända
   samma `element`-tröskel-mönster som `direction` redan etablerade i
   Fas 9 (`state.ultimateBanner.element`, trätt igenom från
   `extra.element` på båda banderoll-tilldelningarna i
   `playUltimateSequence`), och sedan derivera träffpositionerna live
   i `renderBattle()` genom att filtrera `state.board` på
   `owner === banner.owner && card.element === banner.element` — säkert
   att göra LIVE (inte ett cast-tids-snapshot) eftersom Wave of Loyalty
   aldrig förstör eller flyttar något, bara buffar det som redan finns
   kvar. Ett test-fynd under arbetet (inte en spelbugg): Pallis egen
   `SPECIAL_HANDLERS.pallis`-filter utesluter aldrig casten själv, så om
   spelaren väljer sitt eget element (Pallis är Earth) välsignar han SIG
   SJÄLV också — mitt första test förväntade sig 2 träffar men fick 3,
   fixat genom att korrigera testets förväntan (inte koden, som redan
   var konsekvent med den riktiga handler-logiken).
2. **Deltar INTE i skärm-skaknings-opt-in-listan.** Till skillnad från
   varenda annan AOE-VFX hittills är Wave of Loyalty en välsignelse på
   egna kort, inte en attack som landar — ett stridsskak hade känts fel
   för en läkande/skyddande effekt, så den lämnades medvetet utanför
   `chainShake`-listan (dokumenterat med kommentar i koden).

Vorgraths The Falling World återanvänder exakt samma cast-tids-snapshot-
mönster som Eternal Verdict (Fas 10) eftersom den, till skillnad från
Fenrirs Ragnarök, alltid förstör (`destroyCard`, aldrig bara debuff) —
tillagd i samma villkorsgren i `playUltimateSequence` snarare än en ny
duplicerad gren. Yang/Yin Resonance är en ren `debuffThisRound`-AOE
(förstör aldrig) och lades därför till i den befintliga hel-bräde-
`aoeEnemyIndicesAtCast`-listan, samma resonemang som Diamond Storm redan
etablerade.

Design: The Falling World — undergångs-eld (rost-orange/djupröd, matchar
Vorgraths egen eldaccent); Wave of Loyalty — varm honung-guld
"välsignelse", medvetet ljusare/mjukare än Eternal Verdicts skarpare
domsguld och utan `.vfx-flash` (ingen fullskärms-krigs-wash för en
läkande effekt); Yang Resonance — vitt/guld; Yin Resonance — svart/
violett, tydligt skild från både WorldCleavers void-lila och Lunar
Eclipses kalla silverblå (verifierat med explicita "inte den andra
paletten"-kontroll-asserts i testerna, samma mönster som Solar/Lunar i
Fas 9).

Verifierat: `node --check` grönt. Två nya permanenta regressionstester
(alla fyra kortens VFX renderar rätt antal träffar/färger — inklusive
Wave of Loyaltys "bara EGNA element-matchande allierade, aldrig fiender"-
kontroll och Yang/Yins ömsesidiga färg-uteslutning; samt ett separat test
som bekräftar `extra.element` trätt igenom banderollen vid ett riktigt
`runSpecialResolution`-anrop, att The Falling World bara snapshot:ar den
valda linjen (inte hela brädet), och att Yang Resonance läggs till i
hel-bräde-`aoeEnemyIndicesAtCast`-listan). Hela testsviten grön:
**139/139** (137 tidigare + 2 nya). Playwright-skärmdumpar av alla fyra
korten bekräftar att de renderar korrekt — Wave of Loyaltys skärmdump
visar tydligt att den gyllene välsignelsen träffar Pallis två blå
allierade men lämnar den röda fienden (Nyxara) helt orörd. Ingen
konsol/page-error i något test.

**Fas 13: VFX-expansion, runda 5 — fyra HELT NYA tekniker, inte bara nya
färger.** Användaren ville "bygga mer på spelet, göra det coolare" men
efterfrågade uttryckligen NÅGOT ANNORLUNDA — inte bara fler kort som
återanvänder samma ring+hit+twinkle-formel som varenda kort hittills
(Fas 8-12). Jag föreslog fyra genuint nya visuella TEKNIKER (inte
färgscheman) och lät användaren välja — svaret var "jag håller med dig
låter bra allt", så alla fyra byggdes i en och samma runda, varsitt kort:

1. **`.vfx-projectile`** (Aurelian — Skybreaker): det FÖRSTA elementet
   som faktiskt FÄRDAS över skärmen istället för att dyka upp direkt vid
   target. Ett fallande spjut/stjärnskott som störtar ner från ovanför
   brädet under hela cast/windup-fasen (synkat exakt mot
   `ULTIMATE_WINDUP_MS`, 0.95s), och landar precis när rendern växlar
   till impact-fasen och ersätts av den vanliga ring/hit-explosionen.
   Matchar hans egen flavor text ("Skybreaker crashes down").
2. **`.vfx-shard`** (Daron — Shattered Crown): en krona-krossas-burst av
   kantiga splitter som flyger utåt från målet vid impact. Genuint eget
   behov — Daron FLIPPAR sitt mål (stjäl kraft), han förstör det aldrig,
   så det befintliga `destroyGhosts`-blekningsmönstret (för kort som
   faktiskt LÄMNAR brädet) passar inte alls här.
3. **`.vfx-clockhand`** (Vorathos — Time Collapse): två tunna linjer som
   snurrar ett helt varv runt målet under cast-fasen — ROTATION är en
   helt ny rörelsetyp i verktygslådan (allt tidigare är antingen en
   statisk ring eller nu (denna runda) en rak fallande bana), passande
   för en Timelancer-tematik.
4. **`.vfx-crack-svg` / `.vfx-crack-line`** (Nexzoth — The Ending): den
   FÖRSTA hel-bräde-skaliga VFX:en — spruckna, taggiga linjer som sprider
   sig över HELA arenan (inte bara en cell-lokaliserad ring), tecknade
   med den klassiska stroke-dasharray/stroke-dashoffset-"rita-sig-själv"-
   tekniken under cast-fasen. Passande för en bokstavligt
   apokalyptisk hel-bräde-förstörelse ("The World Eater... nothing
   remains").

Tekniskt: alla fyra kort behövde bara små, redan etablerade
tillägg utanför själva CSS/markup-arbetet — The Ending lades till i den
befintliga hel-bräde-`aoeEnemyIndicesAtCast`-listan (samma mönster som
Megaflare/Infernal Pact, eftersom den förstör alla fiender på hela
brädet) samt skärm-skaknings-opt-in-listan (aldrig en flip, alltid en
`destroyCard`). Skybreaker/Shattered Crown/Time Collapse är alla vanliga
enkelmåls-flippar (redan fullt stödda av `targetIndex`-fältet sedan
tidigare faser) och behövde ingen ny banderoll-logik alls.

Verifierat: `node --check` grönt. Två nya permanenta regressionstester
(alla fyra kortens nya primitiv renderar rätt — projektilen syns bara
under cast-fasen inte impact-fasen, 6 splitter, 2 klockvisare, 5
sprickor som alla börjar exakt i Nexzoths egen cell; samt ett separat
test som bekräftar The Endings hel-bräde-`aoeEnemyIndicesAtCast`-
snapshot vid ett riktigt `runSpecialResolution`-anrop). Ett litet
testskrivfel (en dubbel-escapead apostrof i en assert-sträng som
orsakade en JS-syntaxfel i hela testfilen) hittades och fixades direkt.
Hela testsviten grön: **141/141** (139 tidigare + 2 nya). Playwright-
skärmdumpar av alla fyra kort bekräftar tekniken visuellt: Skybreakers
projektil syns tydligt mitt i fallet ovanför brädet (fångad via en
riktig `runSpecialResolution`-cast, inte en manuellt satt banderoll);
Shattered Crowns splitter flyger synligt utåt; Time Collapses två
klockvisare syns mitt i sin rotation; och The Endings sprickor sprider
sig synligt över HELA arenan (inte bara en cell) innan de bleknar när
alla tre fiendekorten är förstörda. Ingen konsol/page-error i något
test.

**Fas 14: "Erövrad"-badgen ombyggd — engelsk text, ny AI-genererad
konst, och från en stor centrerad banderoll till en liten badge PER
erövrat kort.** Användaren frågade om vi skulle ta bort hela
"Erövrad"-slashen nu när Ultimate-VFX:en blivit mycket coolare (Fas
8-13) — den gamla bilden (`conquered-badge.png`/`-red.png`) visade sig
ha "ERÖVRAD" + "FIENDEKORTET HAR ERÖVRATS" inbakat direkt i konstverket,
inte i koden. Efter en kort diskussion (se AskUserQuestion-liknande
utbyte i chatten) landade vi på: byt inte bort effekten helt (den är
fortfarande den ENDA flourishen en vanlig 1-korts-fångst får), men bygg
om den — mindre, på engelska, och sittande direkt PÅ det erövrade
kortet istället för stort och centrerat över hela brädet.

Eftersom texten satt fast i bilden och den här miljön saknar
bildgenereringsverktyg skrev jag åt användaren två färdiga
bildgenererings-prompts (en blå, en röd) att klistra in i ChatGPT/
DALL-E, medvetet hållna enklare/mer högkontrast än originalet eftersom
en lika detaljerad bild (kedjor, rök, mängder splitter) hade blivit
oläslig i den mindre storleken. Användaren skickade tillbaka en bild med
båda badgesen sida vid sida ("CONQUERED" i guld-beveled fantasy-typografi,
blå respektive röd blixt/eld-tema) — delades upp i två separata filer med
Pillow (tight-crop mot alfa-kanalen + nedskalning till 480px, samma
filstorlek som originalen) och sparades under exakt samma filnamn som
förut (`conquered-badge.png`/`conquered-badge-red.png`) så ingen kodväg
behövde ändras.

Den strukturella ombyggnaden var större än bara en bildbyte:

1. **Från ett globalt `state.conquestPopup`-flagga till ett rent
   per-cell-derat mönster.** Den gamla banderollen behövde en egen
   `showConquestPopup()`-funktion med sin egen token/timer (samma mönster
   som `ultimateBannerToken`) eftersom den var en enda delad bild som
   inte kunde "höra hemma" på ett specifikt kort vid en Same/Plus/Combo-
   kedja eller en AOE-Ultimate som flippar flera celler samtidigt — det
   var uttryckligen DÄRFÖR den låg centrerad över hela arenan (dokumenterat
   i en gammal kommentar). Den nya badgen renderas istället direkt i
   `boardCellHtml`, gated på `cell.justFlipped` — SAMMA flagga som redan
   driver kortets egen flip-animation och dess befintliga
   ~1300ms/`fxTime(1300)`-cleanup — så ingen separat state/timer behövs
   längre alls. Löser multi-cell-begränsningen helt naturligt: en
   instans renderas per fångat kort, med `cell.fxDelay` (samma
   Same/Plus/Combo-kedje-stagger varje annat per-cell-effekt redan
   använder) så flera badges i en kedja poppar in i en kaskad istället
   för samtidigt.
2. **`showConquestPopup`/`conquestPopupToken`/`CONQUEST_BANNER_MS` togs
   bort helt** (två anropsplatser: `placeCard`s flip-hantering och
   `playUltimateSequence`s capture-count-koll). `advanceTurn`s AI-paus-
   logik (som använde `state.conquestPopup` för att avgöra om AI:n skulle
   vänta lite extra efter en fångst) läser nu istället
   `state.board.some(e => e && e.justFlipped)` direkt — samma
   underliggande signal, bara utan mellanhanden. Konstanten döptes om
   till `CAPTURE_PAUSE_MS` (samma värde, 1400ms, samma playtestade
   paceringskänsla — bara namnet som beskrev en nu borttagen banderoll
   var missvisande).

Ett riktigt designfynd under arbetet (inte bara en refaktorering): det
gamla systemets tredje test ("en `justFlipped`-kvarleva på en annan cell
ska INTE ge en falsk positiv") skyddade mot ett helt annat buggmönster
som bara existerade för att banderollen var GLOBAL — en kvarvarande
flagga på ett kort kunde tidigare felaktigt trigga banderollen för en
SENARE, orelaterad, icke-fångande handling. I det nya per-cell-systemet
finns inget sådant globalt tillstånd att korrumpera: en kvarvarande
flagga på ett kort visar bara det kortets EGEN, fortfarande giltiga,
badge — inget att skydda mot längre. Testet skrevs om för att istället
verifiera den nya (enklare) korrekthetsgarantin direkt.

Verifierat: `node --check` grönt. Tre befintliga "conquest banner"-tester
skrevs om till det nya per-cell-mönstret (inklusive fyndet ovan), plus
två helt nya tester (röd sida använder rätt bild och aldrig den blå;
en tvåcells-AOE-fångst — Pallis & Pells Hunter's Wrath — renderar TVÅ
separata badge-instanser, en per erövrat kort, istället för en delad;
badgen försvinner med exakt samma cleanup-fönster som allt annat
per-cell-flip-tillstånd). Hela testsviten grön: **143/143** (141
tidigare + 2 nya, netto +2 efter att 3 gamla ersattes 1:1 och 2 helt nya
lades till). Playwright-skärmdumpar bekräftar hela flödet visuellt: en
liten blå badge sitter prydligt centrerad ovanpå det just erövrade
kortet (inte längre stort och centrerat över hela brädet); samma för röd
sida; och Hunter's Wrath-skärmdumpen visar tydligt TVÅ separata badges,
en på vardera av de två samtidigt erövrade korten. Ingen konsol/page-
error i något test.

**Fas 15: Två helt nya kort — Elyrion och The Concord — skissade externt
(ChatGPT), granskade, reviderade och byggda in med VFX.** Användaren
skickade två färdiga kort-koncept (bild + full text) och bad om ett
designutlåtande innan något byggdes: kändes de som riktiga Triad Arena-
kort, tillförde de något nytt? Svar: ja på det mesta, men ett larm — The
Concords **United Presence** ("cannot be captured" medan 3+ allierade
kontrolleras) var en HELT NY mekanik-KATEGORI (erövringsimmunitet) som
inte finns någonstans i de 50+ befintliga korten, skulle behöva kollas i
varenda erövringsväg i motorn, och en trivialt lätt-nådd tröskel (3 kort
av 5 i handen) gjorde den till en risk för att kännas orättvis/tråkig för
motståndaren snarare än taktisk. Elyrions **Weaver's Touch** hade också
en mindre träffande detalj: "-1 Power NÄSTA runda", en tidsram motorn
inte har (bara "denna runda" eller permanent).

Användaren godkände båda invändningarna och gav två konkreta revideringar
innan implementation: Weaver's Touch byter till standardens "denna
runda"-fönster, och United Presence byts till en vanlig villkorsbaserad
Power-bonus ("+2 Power alla sidor vid 3+ allierade") utan någon
immunitets-mekanik alls. Användaren bad uttryckligen om en mekanisk
kontroll mot den befintliga motorn FÖRST, med bekräftelse att båda
revideringarna går att bygga med redan existerande primitives — se den
kontrollen (redovisad i chatten, sammanfattad här): Weaver's Touch mappar
rakt av mot `active.onWinDebuffLoserThisRound` (redan använt av flera
kort); United Presence mappar mot exakt samma "räkna `state.board`
live"-mönster `boardLeadBonus` redan använder i `fullEffectiveValue`/
`staticLiveBonusFor` (Little Jesp har redan en variant av samma
grundmönster).

Alla åtta förmågorna (fyra per kort, plus varsin Ultimate) byggdes till
slut på redan existerande primitives/mönster, en handfull nya men
lågriskade dispatcher-funktioner följer mönster som redan fanns:

- **Elyrion** ("The Soulweaver"): Soul Threads (samma `ON_PLACE_HANDLERS`-
  mönster som Zlaizers Divine Balance — slumpmässig allierad, sig själv
  inräknad); Weaver's Touch (`onWinDebuffLoserThisRound:1`, ren
  återanvändning); Thread of Fate (`volcanicArmorPenalty:1`, samma flagga
  Ifrits Volcanic Armor redan använder, ordagrant); Soul Resonance — den
  enda som behövde en ny liten dispatcher (`checkElyrionSoulResonance`,
  samma "sök brädet efter innehavar-kortet"-form som Triune Desires
  `checkTriuneTeamBoost` redan etablerat, bara sig-själv-riktad och
  sido-specifik istället för lagbred); Ultimate "Threads of Destiny" (
  samma "debuffa först, kolla sen om besegrad"-form som Tildas Nightfall +
  samma AOE-egen-sida-bonus som Pallis Wave of Loyalty).
- **The Concord** ("United We Rise"): Synchronized Souls och United
  Presence (två nya grenar i `fullEffectiveValue`/`staticLiveBonusFor`,
  samma `state.board`-räkne-mönster som `boardLeadBonus` — måste hållas i
  synk på BÅDA ställena, precis som `boardLeadBonus`/`sisterAura` redan
  är); Inspiring Aura — den andra nya lilla dispatchern
  (`checkConcordInspiringAura`, samma "sök brädet efter innehavar-
  kortet"-form som Morvaths `buffOnEnemyDestroyed` redan etablerat för
  förstörelse-händelsen, bara kopplad till placerings-händelsen istället,
  och medvetet vaktad så Concords EGEN placering inte buffar sig själv);
  Ultimate "United Will" (villkorad lag-bonus vid 3+ allierade + en
  ovillkorad egen-bonus, läst bokstavligt av den godkända kortexten).

Inget kort fick riktig konst — bildmallarna användaren skickade hade
siffror/förmågetext inbakat direkt i bilden (samma problem som "Erövrad"-
badgen i Fas 14), vilket krockar med att spelet redan renderar sina egna
siffror från kod. Korten använder tills vidare bara sin `icon`-emoji
(🧵/🤝) och gradient-bakgrund — samma inbyggda reservlösning
`CARD_IMAGES`/`FULL_CARD_IMAGES` redan ger varje kort utan egen bild.

VFX: Elyrion (🧵) fick ett smaragdgrönt enkelmåls-ring+hit (samma form som
WorldCleaver/Serpent's Wrath), en helt ny färgpalett ingen tidigare
identitet använt. The Concord (🤝) fick en gyllene "sammanhållnings"-AOE
som träffar HELA den egna sidan (sig själv inräknad) live-deriverat —
samma säkra "inget snapshot behövs, förstör aldrig något"-resonemang som
Pallis Wave of Loyalty redan etablerade.

Verifierat: `node --check` grönt. Ett test-fel hittades och fixades under
arbetet (mitt eget, inte en spelbugg) — `volcanicArmorPenalty`s
triggervillkor jämför TOTAL kraft (inte den enskilda sidan), så mitt
första testupplägg för Thread of Fate hade fel tal; fixat genom att
spegla exakt samma tal som det redan existerande Ifrit-testet. Fem nya
permanenta regressionstester (Elyrions fyra passiva förmågor + Ultimate;
Concords Synchronized Souls/United Presence/Inspiring Aura; Concords
Ultimate; VFX-verktygslåde-användning för båda). Hela testsviten grön:
**148/148** (143 tidigare + 5 nya). Playwright-skärmdumpar bekräftar
båda VFX:erna visuellt — Concords gyllene ring träffar tydligt bara sina
två blå allierade Cave Ogres, den röda Nyxara lämnas helt orörd. Ingen
konsol/page-error i något test.

**Fas 15, uppföljning: riktig konst tillagd.** Användaren påpekade att
korten fortfarande saknade bild och frågade om de skulle skicka
originalbilderna igen — de fanns redan sparade lokalt från den tidigare
turen, så inget behövdes skickas om. Samma problem som Fas 14:s
"Erövrad"-badge (siffror/text inbakat i själva bilden) gällde även här,
men `.card-art`s CSS (`background-size:cover; background-position:center
15%`) hanterar godtyckliga bildbeskärningar automatiskt, så lösningen var
enklare denna gång: beskar bort bara den rena karaktärsillustrationen
(ett vågrätt band mellan ~10% och ~46% av originalbildens höjd, som
undviker både hörn-siffercirklarna högst upp och kompass-ikon-raden +
text-panelen längre ner) med Pillow, sparade som
`cards/card-elyrion.jpg`/`cards/card-concord.jpg` och lade till i
`CARD_IMAGES` (inte `FULL_CARD_IMAGES` — den vägen renderar bilden RÅ
utan något kod-overlay alls, vilket bara passar en dedikerad stående
poster-bild, inte ett vågrätt beskuret band). Ett nytt permanent
regressionstest lades till (kontrollerar att båda korten har en
`CARD_IMAGES`-post). Hela testsviten grön: **149/149**. Playwright-
skärmdumpar bekräftar att konsten renderar korrekt både på spelbrädet
och i den fulla detalj-modalen (stat-diamanter/färdighetstext läggs
snyggt ovanpå, som för varje annat kort med egen bild).

**Fas 16: "Bättre ljuseffekter" — riktiga ljustexturer, inte bara CSS-
gradienter.** Användaren frågade vad som skulle behövas för bättre
ljuseffekter, och om ChatGPT kunde generera det. Svar: ja — hela VFX-
verktygslådan (ring/hit/particle/twinkle/etc, Fas 8-13) är rent CSS
(gradients, box-shadows, SVG-linjer), vilket alltid känns lite platt
jämfört med en riktig målad ljustextur. Rekommenderade tre färgneutrala
(vit/gråskala, för omfärgning per kort i CSS), symmetriska (ingen
inbyggd "upp"-riktning, funkar roterat) texturer: en ljus-burst/stjärn-
explosion, en gnist-/partikel-textur, och en magisk cirkel/energiring.
Skrev tre färdiga bildgenererings-prompts åt användaren med exakta
tekniska krav inbakade (transparent PNG, vit/grå ton, centrerad
komposition).

Användaren skickade tillbaka alla tre i EN bild sida vid sida (samma
mönster som Elyrion/Concord-korten och Erövrad-badgen tidigare) — delades
upp med Pillow (tredjedels-bredd-delning + tight-crop mot alfa-kanalen),
sparade som `vfx-lightburst.png`, `vfx-magiccircle.png`, samt en enskild
gnista beskuren ur partikel-klustret som `vfx-spark.png` (klustret i sig
behölls inte, bara den beskurna enskilda gnistan behövdes).

Teknisk lösning — CSS `mask-image`/`-webkit-mask-image` istället för
`filter:hue-rotate()`: en vit/grå textur kan INTE omfärgas meningsfullt
med hue-rotate (ingen mättnad att rotera), men maskerad mot en
`background-color: var(--vfx-ring-color)` blir den en ren stencil som tar
vilken CSS-färg som helst — samma `--vfx-ring-color`/`--vfx-twinkle-color`-
variabler varje kort redan sätter, så ingen kort-specifik kod behövde
röras. `mix-blend-mode:screen` gör att ljuset adderas ovanpå den mörka
arenan istället för att se ut som en platt färgad form.

Två av texturerna las in som `::before`-pseudo-element DIREKT på de
befintliga delade `.vfx-ring`/`.vfx-twinkle`-klasserna — uppgraderar
alla ~26+ kort som redan använder dem på en gång, utan att röra en enda
rad per-kort-markup (en pseudo-elements rendering komponeras som en del
av sin värd-elements box, så den ärver värdens egen opacity/transform-
animation gratis, ingen extra animation behövdes). Den tredje (den
magiska cirkeln) las till som en ny FRISTÅENDE primitive
(`.vfx-magic-circle`) — medvetet INTE auto-inkopplad i varenda ring
(hade blivit visuellt rörigt vid den lilla skalan en per-mål-träff
använder), redo att användas på ett framtida flaggskepps-korts
ursprungsring istället.

**En riktig CSS-bugg hittades och fixades under arbetet:** den magiska
cirkeln testades initialt med `width:220%; height:220%; margin:-110% 0 0
-110%` för centrering — men CSS-`margin`-procent (även `margin-top`)
räknas alltid mot CONTAINERNS BREDD, aldrig dess höjd, en äkta CSS-kvirk.
Eftersom `.ultimate-vfx`-wrappern matchar brädets 5:7-porträttformat (inte
kvadratisk), gjorde detta att cirkeln blev både felcentrerad OCH oval
istället för rund. Playwright-skärmdumpar avslöjade felet direkt (en
enorm gul cirkel i fel hörn av skärmen). Fixat genom att byta till
`width:N%; aspect-ratio:1` (garanterar en sann cirkel oavsett
container-proportioner) plus `transform:translate(-50%,-50%)` för
centrering (som använder ELEMENTETS EGEN beräknade storlek, inte
containerns bredd-kvirk).

Verifierat: `node --check` grönt. Ett nytt permanent regressionstest
(bekräftar att `.vfx-ring`/`.vfx-twinkle` faktiskt refererar de nya
texturerna via `::before`, samt ett getBoundingClientRect()-baserat test
som specifikt återskapar bugg-scenariot — en icke-kvadratisk container —
och verifierar att cirkeln both är centrerad OCH lika bred som hög).
Hela testsviten grön: **150/150** (149 tidigare + 1 ny). Playwright-
skärmdumpar bekräftar den visuella förbättringen tydligt på befintliga
kort (Serpent's Wrath, Forbidden Harmony) — en riktig strålande
stjärn-burst istället för bara en ring-kontur, och skarpa gnist-glimmer
istället för släta prickar — samt den fixade magiska cirkeln, nu perfekt
centrerad och rund. Ingen konsol/page-error i något test.

**Fas 17: VFX-expansion, runda 7 — och den nya magiska cirkeln får sin
flaggskeppsdebut.** Användaren bad om fler kort (mitt val) och erbjöd sig
skicka fler texturer om det behövdes. Fyra kort valda: **Three Head
Dragon** (Apokalyps — hel-bräde-debuff, FÖRSTA kortet som använder Fas
16:s nya `.vfx-magic-circle`-primitive), **The Infinite Seraph** (All
Possibilities — riktnings-debuff, permanent inte "denna runda", samma
live-`enemiesInDirection()`-mönster som Fenrirs Ragnarök eftersom den
aldrig förstör), **Tilda** (Nightfall — enkelmål, mörk "natt"-palett) och
**Graff** (Whirlwind Assault — en helt ny HYBRID-form: ett riktigt
enkelmål PLUS en ovillkorad debuff-splash på varenda annan fiende, i
samma special).

Graffs kort krävde en genuint ny mönster-variant: tidigare kort har
antingen varit rena enkelmål ELLER ren AOE, aldrig båda samtidigt. Löst
med TVÅ separata positions-arrayer i samma derivations-block — en stor
huvud-träff vid det faktiska målet (samma `.vfx-ring`+`.vfx-hit`-form som
alla andra enkelmålskort), plus mindre, svagare `.vfx-hit`-markörer
(egen `--vfx-hit-color`-override, dämpad opacitet) på varje annan
fiende, live-deriverat eftersom splashen (`debuffThisRound`) aldrig
förstör någon. Playwright-skärmdumpen visar tydligt skillnaden: en stark
ljus kärnträff på huvudmålet, en svagare vindby-liknande dis över de två
splash-träffade fienderna.

Verifierat: `node --check` grönt. Ett nytt permanent regressionstest
(alla fyra kortens VFX renderar rätt — inklusive en explicit koll att
Apokalyps faktiskt använder `.vfx-magic-circle`, och att Whirlwind
Assault visar exakt 3 träffar: 1 huvudmål + 2 splash, aldrig
dubbelräknar målet självt). Hela testsviten grön: **151/151** (150
tidigare + 1 ny). Playwright-skärmdumpar bekräftar alla fyra — Apokalyps
bekräftar särskilt att den nya magiska cirkeln (fixad i Fas 16) nu
sprider sig dramatiskt över hela brädet, precis det "flaggskepps"-momang
den var tänkt för. Ingen konsol/page-error i något test.

**Fas 18: Morvaths röstlinje.** Användaren skickade en ElevenLabs-
genererad ljudfil (`ElevenLabs_..._Ifrit_...mp3` — "Ifrit" i filnamnet är
bara röstprofilen som användes för att generera klippet, inte kortet det
är till för) med texten "The endless tide". Identifierade kortet direkt
mot kortdatan: "The Endless Tide" är ordagrant Morvaths (The Abyssal
King) Ultimate-namn. Sparad som `voices/morvath.mp3`, tillagd i
`ULTIMATE_VOICE_LINES` (samma befintliga system som redan spelar upp
riktiga röstlinjer för Ifrit/Nyxara/Vaelira/Seraphine/Triune Desire/
Bahamut/Tiamat/Three Head Dragon/Omega Weapon/Shiva/Odin). Det
befintliga "Game feel phase 4c"-testet utökades med Morvath istället för
att skriva ett nytt separat test — samma mönster, en rad till. Hela
testsviten grön: **151/151** (oförändrat antal — ett befintligt test
utökat, inget nytt test tillagt).

**Fas 19: bättre ljuseffekter, runda 2 — riktad ljusstråle-textur.**
Användaren skickade en ny bild från ChatGPT/DALL-E: en riktad
ljusstråle-textur (avlång, ljus i ena änden, tonar ut mot den andra).
Beskuren till alpha-bbox och nedskalad till 800px bredd med Pillow,
sparad som `vfx-beam.png`.

Byggde två nya delade CSS-primitiver, `.vfx-beam` (yttre) och
`.vfx-beam-inner` (inre, animerad) med `@keyframes vfxBeamShoot`,
modellerade direkt efter Seraphines redan existerande skräddarsydda
`.silver-judgment-beam`/`.silver-judgment-beam-inner`-uppdelning: ett
element kan inte samtidigt ha en inline `transform:rotate()` (för att
peka mot målet) OCH en oberoende keyframe-animerad `transform:scaleX()`
(för "skjuts ut"-effekten) utan att den ena kolliderar med den andra —
därför håller det yttre elementet den statiska rotationen/positionen/
bredden, medan det inre håller den animerade scaleX.

Kopplade in strålen på alla fyra kort som redan har ett "riktnings"-
/linje-mål: Ragnarök (Fenrir), Eternal Verdict (Celestial Judgment), The
Falling World (Vorgrath) och All Possibilities (Infinite Seraph).
Återanvände den befintliga `angleAndLengthPercent()`-hjälparen (från Fas
8) för att räkna ut vinkel och längd från kastarens egen ruta till den
LÄNGST BORT liggande träffpositionen, så strålen sträcker sig genom hela
träffraden istället för att stanna vid första fienden. Ny markup lades
till som FÖRSTA barnet inuti varje korts `.ultimate-vfx`-wrapper (före
den befintliga `.vfx-ring`), så strålen renderas bakom ring/gnista-
effekterna snarare än ovanpå dem.

Verifierat med en Playwright-skärmdump (Fenrir på ruta 7 castar
Ragnarök riktning "upp" mot fiender på rutorna 4 och 1): strålen syns
tydligt som en ren vit/blå linje som skjuter rakt igenom hela
mittkolumnen, från Fenrirs ruta upp genom båda Cave Ogre-rutorna, precis
som tänkt. Nytt permanent regressionstest tillagt (alla fyra kortens
`.vfx-beam`/`.vfx-beam-inner` verifieras, plus ett edge-case: inga
träffar → ingen stråle). Hela testsviten grön: **152/152** (151 tidigare
+ 1 ny). Ingen konsol/page-error.

**Fas 20: buggfix — fastnat spel, "numbers didn't go down, couldn't press
end turn".** Användaren rapporterade att en match hade fastnat direkt
efter ett Ultimate-cast: siffrorna (kortens värden) uppdaterades aldrig,
och End Turn-knappen svarade inte längre. Ingen specifik kort-kombination
mindes användaren, bara att det hände "right after an Ultimate cast".

Byggde ett automatiserat stress-test (Playwright, körs utanför testsviten)
som gick igenom alla 61 kort med ett Ultimate/special i HEROES+
FOREST_FOES, castade var och en isolerat mot ett bräde omgivet av fyra
fiender (plus dess ev. `requiresPartner`-allierad), och kontrollerade att
`state.ultimateBanner` alltid blev `null` igen efter hela sekvensen utan
någon page-error. Alla 61 klarade detta isolerade test — buggen satt
alltså inte i någon enskild handlers logik.

Nästa hypotes: `ultimateQueue`-mekanismen (om spelaren castar ett andra
Ultimate medan det första fortfarande spelar upp sin ~2,7s långa
windup/hitstop/impact-sekvens, köas det andra istället för att köra
direkt — se `runSpecialResolution`). `playUltimateSequence` läser sitt
`targetEntry` LIVE från `state.board[targetIndex]` i varje fas, inte en
snapshot tagen vid castögonblicket. Om det FÖRSTA Ultimate i kön är en
AOE-förstör-allt-typ (t.ex. Nexzoths "The Ending" eller Bahamuts
"Megaflare") och det ANDRA, köade Ultimate är ett single-target-kort vars
valda mål råkar vara en av de fiender som just förstördes av det första
— är cellen `null` redan innan det köade kortets egen `handler()` någonsin
körs. Varenda single-target-handler i `SPECIAL_HANDLERS` läser
ovillkorligt `targetEntry.card`/`targetEntry.owner` utan null-koll, så
anropet kastade en `TypeError: Cannot read properties of null (reading
'card')`. Eftersom den kraschen sker MITT I `playUltimateSequence`s sista
`setTimeout`-callback avbryts hela resten av den callbacken direkt —
raden som nollställer `state.ultimateBanner` längre ner körs aldrig.
`endPlayerTurn()` har en explicit vakt (`if(state.ultimateBanner) return;`)
just för att inte kollidera med en pågående Ultimate-sekvens, så resultatet
blev exakt det rapporterade: spelet såg ut att hänga permanent, korten
uppdaterades aldrig (kraschen avbröt effekten innan den hann göra klart
sitt jobb) och End Turn svarade inte alls.

Reproducerad exakt med ett riktat repro-skript: Nexzoth castas (AOE-
förstör-allt), och medan den sekvensen fortfarande spelar upp castas Ifrit
(single-target Hellfire) mot en av samma fiender — Ifrits cast köas bakom
Nexzoths. Efter Nexzoths fulla sekvens är fienden borta; när Ifrits köade
cast sedan kör sin egen sekvens kraschar den precis som förutspått,
`state.ultimateBanner` fastnar för alltid på `{phase:'impact', ...}`.

Fix: i `playUltimateSequence`s tredje fas (där `handler()` annars alltid
anropas), en ny vakt — om `special.targets === 'single'` och
`targetEntry` visar sig vara `null` vid resolve-tillfället (målet
existerar inte längre), hoppa över `handler()`-anropet helt och sätt
istället en enkel "hittar inget att slå mot"-logg-rad. Resten av
sekvensen (impact-punch, ev. chain-shake, cleanup, `maybeEndTurn`, och att
plocka nästa jobb ur `ultimateQueue`) fortsätter helt normalt efter det —
spelet "fizzlar" den bortfallna attacken snyggt istället för att krascha.

Nytt permanent regressionstest tillagt som återskapar exakt detta
scenario (Nexzoth följt av köad Ifrit mot samma fiende) och verifierar
att `state.ultimateBanner` blir `null` igen som vanligt, att en
fizzle-logg-rad sätts, och att ingen page-error kastas — det gamla felet
skulle ha kraschat precis här. Hela testsviten grön: **153/153** (152
tidigare + 1 ny). Verifierat även manuellt med samma repro-skript direkt
mot `index.html` (inte bara testsviten) före och efter fixen — kraschade
garanterat innan, fastnade aldrig efter.

**Fas 21: VFX-utbyggnad runda 7 — de sista 29 korten utan egen VFX.**
Användaren bad mig fortsätta bygga på fler VFX medan hen sov, "tills det är
klart". Kartlade FÖRST exakt vilka av spelets 61 Ultimate-bärande kort
(HEROES+FOREST_FOES) som fortfarande bara visade den vanliga namn-bannern
utan någon ring/hit/beam/twinkle alls — 29 kort saknade helt egen VFX.

Istället för att skriva 29 separata copy-paste-derivationer (samma mönster
som tidigare rundor), delade jag in dem i fyra återanvändbara former,
varje form en enda delad derivation+markup-kodblock i `renderBattle()`,
nyckel på Ultimate-namn i en liten lookup-tabell istället för en egen
`const xxxActive` per kort:

- **Enkla single-target-fångster** (15 kort: Darien, Zaevir, Sarah, Vayra,
  Ysara, Ragnar, Deathblade, Tahabata, Aurelia, Twisted Gipsy, Maximus,
  Darum, Astrael, Yojimbo, Chocobo King) — samma ring+hit-form som
  WorldCleaver/Nightfall redan använder, bara nyckel i
  `SIMPLE_SINGLE_TARGET_VFX` istället för egen kod. Zaevirs Eternal Arrow
  och Chocobo Kings Royal Choco Meteor fick även Skybreakers
  `.vfx-projectile` (pil respektive meteor som faller in före träffen).
  Astraels Falling Stars fick en `.vfx-twinkle` för stjärn-känslan.
- **Egen-sida-välsignelser** (3 kort: Elara/Requiem of Light, Naline/Rise
  Again, Zlaizer/Rebirth) — alla tre helar/återupplivar sin EGEN sida
  istället för att attackera en fiende, så de återanvänder Wave of
  Loyaltys "egen-sida"-form rakt av (ring vid kastaren + en hit-markör på
  varje egen ruta). Naline/Zlaizers faktiska återupplivade rutor är inte
  kända förrän handlern kör (efter impact-fasens render), så hela
  sidan markeras som approximation — samma "platt effekt över hela
  laget"-förenkling som Concords United Will redan gör.
- **Hela-brädet-fiendeträffar** (9 kort: Torn/Lethal Volley, Sylvarion/
  Herald's Gale, Ferea/The Frozen Crown, Leviathan/Abyssal Deluge — rena
  debuffs, förstör aldrig — plus Morvath/The Endless Tide, Zalazar/
  Apocalypse — hela-brädet-FÖRSTÖR, samt Kaeldryx/Dragonslayer, Umbrael/
  End of All, Pallis & Pell/Hunter's Wrath) — alla nio lades till i den
  redan existerande `aoeEnemyIndicesAtCast`-snapshotmekanismen i
  `playUltimateSequence` (samma "vem var fiende INNAN förstörelsen"-cast-
  tidsnapshot Diamond Storm/The Ending redan använder), så destroy-korten
  aldrig visar träffeffekter på redan-tomma rutor (exakt samma buggklass
  som Fas 20 fixade, förebyggd direkt här genom att återanvända samma
  beprövade infrastruktur). Kaeldryx och Umbrael behövde två helt nya
  snapshot-grenar eftersom deras mål inte är "alla fiender": Dragonslayer
  förstör alla DRAKKORT oavsett ägare (filtrerar på `card.isDragon`, inte
  ägare), och End of All förstör ALLA ANDRA kort — allierade som fiender
  — förutom Umbrael själv. Morvath (som redan hade en riktig röstlinje
  sedan Fas 18) fick flaggskepps-behandlingen: samma `.vfx-magic-circle`
  som Apokalyps, en stor blå tidvattenvåg som sveper över hela brädet.
- **Två helt egna former** som inte passade något av ovanstående:
  Voidqueens Oblivion's Call (vissnar fiender INTILL målet, aldrig målet
  självt — ring vid målet + hit-markörer bara på angränsande fiende-
  rutor, live-deriverat eftersom effekten aldrig förstör något) och
  Little Jesps Scales of Judgment (själv-buff + debuff på vilken sida som
  än leder i Wins just nu — läses live från `state.wins`, säkert eftersom
  det inte kan ändras innan handlern kör).

Hittade och städade samtidigt bort en genuint död kodrest: SPECIAL_HANDLERS
innehöll av misstag TVÅ separata `littlejesp`-nycklar (ett gammalt
"Divine Arrow"-baserat single-target-anfall som en tidigare ombyggnad till
"Scales of Judgment" aldrig tog bort). I ett JS-objektlitteral vinner
alltid den SENARE nyckeln, så den gamla varianten kördes aldrig — men den
matchade inte ens kortets faktiska `special.name` längre, ett tydligt
tecken på att den var en kvarleva. Borttagen; ingen beteendeförändring
(det var redan dött, oanvänt kod).

Verifierat i flera lager: (1) hela 61-korts stress-testet från Fas 20
(varje Ultimate castad isolerat, kollar att `state.ultimateBanner` alltid
blir `null` igen utan krasch) kördes om — alla 61 gröna, inga nya krascher
från de två nya snapshot-grenarna. (2) Ett separat täckningsscript
bekräftade att samtliga 61 kort nu renderar NÅGON `.vfx-*`-klass vid sitt
Ultimate (de 7 "avvikande" träffarna i första körningen var falska
negativ — Ifrit/Bahamut/Shiva/Omega Weapon/Vaelira/Seraphine/Nyxara
använder sina egna, äldre bespoke CSS-klassnamn från INNAN det delade
toolkitet fanns, inte regexens `.vfx-*`-prefix). (3) Playwright-
skärmdumpar av tre representativa kort: Morvaths The Endless Tide (stor
blå tidvattenring + magisk cirkel som sprider sig över hela brädet, ser
ut precis som tänkt), Voidqueens Oblivion's Call (lila ring vid målet,
vissnande glöd bara på den angränsande fienden, inte den icke-angränsande),
och Chocobo Kings Royal Choco Meteor (gyllene ring + fallande meteor-
projektil). Alla tre bekräftar formerna fungerar visuellt som tänkt.

Nytt permanent regressionstest tillagt som täcker alla 29 kort —
kontrollerar `.vfx-ring`/`.vfx-hit`-närvaro för alla, plus riktade koll av
de bespoke detaljerna (Zaevirs projektil, Astraels twinkle, Morvaths
magiska cirkel, att egen-sida-korten aldrig markerar fiende-rutor, att
Oblivion's Call bara vissnar den angränsande fienden och inte den
icke-angränsande, att Scales of Judgment markerar rätt ledande sida och
ingen alls vid oavgjort). Hela testsviten grön: **154/154** (153 tidigare
+ 1 ny).

Med denna runda har SAMTLIGA 61 Ultimate-bärande kort i spelet nu egen
identitets-VFX — ingen "tom namn-banner utan effekter"-kort återstår.

**Fas 22: VFX-polish på de äldre, enkla korten.** Efter Fas 21 hade alla 61
Ultimate-kort NÅGON VFX, men 12 av de 15 "enkla" single-target-korten från
just den rundan (Darien, Sarah, Vayra, Ysara, Ragnar, Deathblade, Tahabata,
Aurelia, Twisted Gipsy, Maximus, Darum, Yojimbo) hade bara den absolut
billigaste behandlingen: en ring + en hit-markör, inget mer. Användaren bad
mig fortsätta med just detta ("Kör på med VFX-polish på de äldre korten").

Gav 11 av de 12 en liten, namn-matchad extra touch, återanvänder befintliga
toolkit-primitiver istället för att uppfinna nya:

- **`.vfx-shard`-fragmentspray** (Shattered Crowns egen form) på fem
  "vapen/krossar"-kort: Darien (Shadow Breaker), Ragnar (Blood Fury),
  Tahabata (Inferno Dominion), Maximus (Axe of Dominion), Yojimbo
  (Zanmato) — passar "breaker"/"axe"/"cuts down"-temat.
  Ny delad `SIMPLE_TARGET_SHARDS`-array (samma sexpunkts-spridning som
  `SHATTERED_CROWN_SHARDS`).
- **Rikare `.vfx-twinkle`-spridning** (fyra punkter istället för en enda
  prick — samma mönster Wave of Loyalty/Astrael redan använder, nu även
  här) på tre ljus/arkana-kort: Vayra (Eclipse), Aurelia (Dawn's
  Reckoning), Twisted Gipsy (House of Shadows).
- **`.vfx-clockhand`** (Vorathos Time Collapses eget par av motroterande
  visare) på Ysara (Eternal Eclipse) — Timeweaver-temat matchar rakt av.
- **`.vfx-projectile`** (Skybreakers fallande spjut/stjärna) på Sarah
  (Aion's Last Light) — "något skjuts in utifrån"-känslan passar en
  ranger.
- Darum (Gate of Dominion) lämnades MEDVETET som ren ring+hit — "Unbreakable
  Bulwark" läses lika bra som solid och stillsam, inte varje kort behöver
  en extra krusning.

**Deathblade (Shadow Assault) fick egen bespoke behandling**, inte bara en
ny flagga i tabellen: till skillnad från alla andra single-target-kort
FÅNGAR eller FÖRSTÖR han aldrig sitt mål — han BYTER FYSISK PLATS med det
(se `SPECIAL_HANDLERS.deathblade`). En ren ring+hit bara vid målet hade
missat halva effekten. Ny egen derivation (`shadowAssaultActive`) som
visar en ring+hit vid den URSPRUNGLIGA målrutan OCH en andra, dämpad
ring+twinkle vid Deathblades EGEN ursprungsruta — läses som "något
försvann här och dök upp där" istället för ett vanligt anfall.

Verifierat: `node --check` grönt. Nytt permanent regressionstest
(shard-närvaro på alla fem, exakt 4-punkts twinkle-spridning på alla tre,
båda clockhand-visarna på Ysara, projektil på Sarah, att Darum MEDVETET
förblir ren, och att Deathblade visar exakt 2 ringar på 2 olika platser
plus en twinkle — aldrig den generiska single-target-formen). Tre
Playwright-skärmdumpar bekräftar visuellt: Maximus (röda fragment kring
axhugget), Ysara (lila ring med en svag svepande visarlinje), Deathblade
(två separata lila glöd-punkter — mål och ursprung — samtidigt lysande),
Twisted Gipsy (gyllene ring med spridda arkana gnistor). Hela testsviten
grön: **155/155** (154 tidigare + 1 ny). Ingen konsol/page-error.

**Fas 23: nya hjälpmedel för Easy/Normal — "var är smartast" + "galen
combo"-glöd.** Användaren bad om två saker för lättare svårighetsgrader:
en hint om var det är smartast att lägga sitt valda kort, och att rutan
lyser i ett "slingrande ljus" när en placering skulle utlösa en galen
Same/Plus/Combo-kedja.

**Var är smartast att lägga sitt kort.** Istället för att uppfinna en ny,
separat "hur bra är detta drag"-heuristik (som lätt kunde hamna i
osämja med hur Forest AI:n faktiskt själv spelar), återanvänds AI:ns
EGNA minimax-sökning (`searchBestPlacement`) rakt av: `hands.blue`
begränsas till bara det valda kortet, så sökningen effektivt frågar
"om detta vore mitt enda kort, var skulle jag själv spela det" — exakt
samma motor som redan avgör Forest AI:ns drag, bara riktad mot spelarens
eget kort. Fast sökdjup 2 (matchar `AI_DIFFICULTY_DEPTH.normal`,
"tänker två drag framåt") oavsett vilken svårighetsgrad som faktiskt är
vald — hintens skärpa ska inte bero på hur svår MOTSTÅNDAREN råkar
spela just nu, bara om den visas alls.

**"Galen combo"-glöd.** Varje tom, laglig ruta simuleras (icke-
muterande, se nedan) med det valda kortet — om `sameOrPlus + combo >=
BIG_COMBO_CHAIN_THRESHOLD` (samma tröskel, nu en delad namngiven
konstant, som REDAN utlöser en riktig skärmskakning vid en verklig
placering, se `placeCard`s `chainShake`) får den rutan ett spinnande,
slingrande ljus runt kanten (`conic-gradient` + `mask-composite:exclude`,
kontinuerligt roterande) — löftet infrias alltid, om hinten lyser och
man spelar där SKA skärmen skaka.

**Riktig bugg hittad och fixad under arbetet.** För att beräkna
`sameOrPlus`/`combo` separat behövde `simulatePlacementOutcome` (AI-
sökningens egna, redan existerande, icke-muterande simuleringsfunktion)
ge en mer detaljerad uppdelning än bara den resulterande brädan. Vid
den omskrivningen upptäcktes att dess EGEN Combo-kedje-BFS av misstag
såddes från `flipped` (ALLA fångster hittills, inklusive vanliga
strids-vinster utan någon Same/Plus alls) — den riktiga motorn
(`resolveFlips`/`battleNeighbors`) kedjar bara vidare från en FAKTISK
Same- eller Plus-fångst (`samePlusSeeds`), aldrig från en vanlig
stridsvinst. Det innebar att AI:ns sökning ibland kunde krediterade en
placering med kedjefångster som den riktiga motorn aldrig skulle ge —
en existerande, tyst korrekthetsbugg i AI:ns egen värdering, oavsett
denna nya hint-funktion. Fixad: BFS-kön såddes nu bara från de riktiga
Same/Plus-träffarna, exakt som `resolveFlips` redan gör. Döpt om till
`simulatePlacementDetailed` (returnerar `{board, sameOrPlus, combo}`);
`simulatePlacementOutcome` lever kvar oförändrad som ett tunt omslag
runt den (`.board`) så INGEN av de många befintliga anropsställena
(sökmotorn + dess egna tester) behövde ändras.

Ny delad namngiven konstant `BIG_COMBO_CHAIN_THRESHOLD = 4` ersätter det
gamla inline-talet `4` i `placeCard`s `chainShake`-villkor, så de två
aldrig kan glida isär av misstag.

Nya overlay-element (inte pseudo-element eller box-shadow-lager, för att
aldrig krocka med `.targetable`/`.would-capture`s egna `::before`/
`::after`/box-shadow som redan kan vara aktiva SAMTIDIGT på samma ruta):
`.suggested-ring`+`.suggested-badge` (💡, pulserande cyan) och
`.combo-hint-ring` (den roterande gyllene kant-ringen). Båda helt
avstängda på Hard (`aidsEnabled()`), och bara synliga när ett handkort
faktiskt är valt — exakt samma gating som den redan existerande
fångst-förhandsvisningen (`getPreviewCaptureTargets`).

Verifierat: `node --check` grönt. Fyra nya permanenta regressionstest:
(1) buggfixen specifikt — en ren stridsvinst utan Same/Plus får ALDRIG
såga en vidare kedja; (2) en riktig Same-såddad tvåstegskedja räknas
korrekt i `.combo`, inte bara `.sameOrPlus`; (3) hela hjälpmedels-floden
— rätt ruta föreslås, en 4-vägs Same-fångst tänds korrekt, och BÅDA
stängs av helt på Hard, även på exakt samma bräde som skulle tändas på
Normal. Playwright-skärmdumpar bekräftar visuellt: 💡-märket syns på den
föreslagna rutan, en gyllene ljusstrimma (den snurrande ringen, fångad
mitt i sin rotation) syns kring combo-rutans kant på Normal, och båda
försvinner helt på Hard (bara den redan existerande gröna "skulle
fånga"-badgen kvar, opåverkad). Hela testsviten grön: **158/158** (155
tidigare + 3 nya: buggfixen, kedje-cascade-testet, och hela
hjälpmedels-integrationstestet).

**Fas 24: buggfix — spelet frös på riktigt efter en Same/Plus-fångst.**
Användaren skickade en skärmdump från en verklig match: precis efter att
ha placerat Chocobo King och fått "Chocobo King claims 2 enemy squares!
(Same/Plus!)" i loggen, frös skärmen helt på "THE FOREST'S MOVE...".

Undersökte i flera steg. Först uteslöts prestanda som orsak: tidtagning
av `chooseAIPlacement()` (AI:ns egen minimax-sökning) på ett bräde med
samma form som skärmdumpen (4 upptagna rutor, 5 tomma, 2-3 kort på
handen) tog under 30ms även på Hard — inte en långsam sökning som
"känns" som en frysning.

Byggde istället ett sviep-script som körde `enemyTurn()` FÖR RIKTIGT
(inte bara sökningen) mot exakt samma bräde (Omega Weapon/Leviathan/
Chocobo King/Nexzoth, alla blå-ägda) med varje enskilt Forest-kort som
Forest AI:ns hand, ett i taget. Resultat: **8 av 61 kort kraschade
konsekvent** med `TypeError: Cannot read properties of null (reading
'card')` i `getEnemyNeighbors`, anropat från `battleNeighbors`, anropat
från `resolveFlips`s Combo-kedje-loop.

Spårade exakt orsak med tillfällig instrumentering (monkey-patchade
`destroyCard`/`battleNeighbors` för att logga varje anrop, sedan
återställt): Astrael placerad i mitten Same/Plus-fångar BÅDE Leviathan
och Nexzoth samtidigt. Combo-kedjan attackerar sedan vidare FRÅN Nexzoth
(nu röd) mot Chocobo King — Nexzoth vinner, men hans egen passiva
förmåga `onWinDestroyLoserAlways` ("destroyed outright instead of
captured") FÖRSTÖR Chocobo King istället för att fånga honom
(`destroyCard`). Den riktiga buggen: `battleNeighbors` räknade ändå
ovillkorligt denna ruta som en fångst (`result.flips++;
newlyFlipped.push(p.ni);`) EFTER att `checkOnWinBonuses` redan hade
förstört den — så `resolveFlips`s Combo-kö fick in den nu null-satta
rutan, och när kön senare skulle bearbeta den kraschade
`getEnemyNeighbors` på `state.board[index].card` där `state.board[index]`
var `null`. Kraschen avbröt hela `placeCard()`-anropet mitt i — exakt
samma buggklass som Fas 20 fixade (state.turn fastnar, inget renderas
vidare, spelet ser ut att frysa permanent), fast den här gången via en
helt vanlig placering (inte ett Ultimate-cast).

Fix: i `battleNeighbors`, efter `checkOnWinBonuses` körts, kolla om
rutan FORTFARANDE är ockuperad innan den räknas som fångst/köas för
combo-kedjan — om `checkOnWinBonuses` själv förstörde den (Nexzoths
`onWinDestroyLoserAlways`, eller Deathblades `onWinDestroyIfLoserWeak`,
eller vilken framtida "förstör-vid-vinst"-förmåga som helst), räknas den
korrekt INTE som en fångst (och bidrar inte längre felaktigt till
`state.wins`, som en bonus-korrigering — "förstörd" och "fångad" är inte
samma sak, och kortets egen text säger uttryckligen "destroyed outright
INSTEAD OF captured").

Verifierat: samma 61-korts svep om — alla 61 gröna, inga fler krascher.
Nytt permanent regressionstest som återskapar exakt det rapporterade
scenariot (Astrael → Same/Plus-fångar Leviathan+Nexzoth → Nexzoth kedjar
in mot Chocobo King → förstör honom istället för att fånga) och
verifierar: inget kastas, Chocobo King är verkligen förstörd, Leviathan
och Nexzoth är fångade, och `wins` räknas korrekt (exakt 2, inte 3 — den
förstörda rutan räknas inte dubbelt). Hela testsviten grön: **159/159**
(158 tidigare + 1 ny).

**Fas 25: Particle Swarm — riktiga slumpade energipartiklar istället för
fasta twinkle-rutnät.** Användaren och ChatGPT diskuterade en ny VFX-idé:
istället för en enda PNG med prickar på fasta positioner ("gröna maskar"),
återanvänd den befintliga `vfx-spark.png`-spriten och skapa MÅNGA
instanser med JS — varierad storlek, opacitet, hastighet, svag drift,
glow, och att några ibland följer en böjd bana istället för en rak
linje. Efter att ha bekräftat riktningen ("det är ju snyggt nu men gör
det bättre") byggdes det som en ny delad toolkit-primitiv.

Ny CSS-primitiv `.vfx-particle` — samma mask-image-teknik mot
`vfx-spark.png` som `.vfx-twinkle::before` redan använder, men applicerad
direkt på elementet (inte via `::before`) eftersom JS behöver sätta en
egen `--size` per instans. Ny JS-funktion `particleSwarmHtml(count)`
genererar `count` stycken `<div>`, var och en med SLUMPADE
`--size`/`--peak-opacity`/`--duration`/`--delay`/`--dx`/`--dy` (riktning +
avstånd beräknat via `Math.cos`/`Math.sin` på en slumpad vinkel) — ingen
instans ser likadan ut två gånger. Cirka 30% av partiklarna får en
`.orbit`-klass som byter ut den räta `vfxParticleDrift`-animationen mot
`vfxParticleOrbit`, en enkel 3-punkts kurva (start/mittpunkt-förskjuten-i-
sidled/slut) — medvetet INTE en riktig cirkulär `offset-path` (mycket
bredare webbläsarstöd, och vid den här storleken/varaktigheten läser en
mjuk sväng redan som "kurvig" utan att en perfekt cirkel behövs).

Ersatte de gamla fasta twinkle-rutnäten (`[0,1,2,3,4,5].map(n =>
.vfx-twinkle-${n})` respektive `[0,1,2,3].map(...)`) med
`particleSwarmHtml()`-anrop på alla sex ställen de användes: Ancient
Wyrmking (Conquests Witnessed), Medusa (Gorgon's Dominion), Triune Desire
(Forbidden Harmony), Pallis (Wave of Loyalty), The Concord (United Will)
— alla uppgraderade till 10 partiklar — samt Elara/Naline/Zlaizers
delade egen-sida-välsignelse (7 partiklar) och de fyra enkla
single-target-korten från VFX-polish-rundan som redan hade en
`twinkle`-flagga (Astrael/Vayra/Aurelia/Twisted Gipsy, 6 partiklar
vardera). Deathblades egen bespoke enstaka twinkle-prick (Shadow Assault,
positionerad vid hans ursprungsruta) lämnades oförändrad — det är inte
ett rutnät, bara en enda accentprick, inget problem att lösa där.

Verifierat: `node --check` grönt. Uppdaterade tre befintliga test som
räknade `.vfx-twinkle`-element specifikt (nu `.vfx-particle`) och
justerade förväntat antal där det ändrats (4→6 för single-target-korten).
Nytt permanent regressionstest för själva primitiven: exakt rätt antal
partiklar oavsett slump, varje instans bär sina egna slumpade CSS-
variabler, TVÅ separata anrop ger ALDRIG identisk output (bevisar riktig
slumpning, inte en återanvänd statisk mall), en stor batch (200 st)
innehåller garanterat både raka och `.orbit`-kurviga partiklar, och att
Wave of Loyaltys riktiga impact-markup nu faktiskt renderar 10 riktiga
partiklar med det gamla fasta rutnätet helt borta. Playwright-
skärmdumpar bekräftar visuellt: en spridd ring av små ljusa
gnist-punkter runt kortet, tydligt skild från den gamla symmetriska
6-punkts-layouten. Hela testsviten grön: **160/160** (159 tidigare + 1
ny).

**Fas 26: Leaderboard — en riktig delad topplista mellan spelare, med en
gratis Firebase/Firestore-databas.** Användaren frågade "Ska vi göra en
ranking list?", vilket jag först tolkade (via `AskUserQuestion`) som en
tier-lista över korten (S/A/B/C) — men fick omedelbart en uppföljning som
omdefinierade hela begäran: "Inte bara det menar jag så man kan se en
topp lista på spelare som var spelat". Två ytterligare
`AskUserQuestion`-rundor klargjorde exakt vad som skulle byggas: en
RIKTIG delad topplista (alla spelare, inte bara lokal historik på egen
enhet), vilket kräver en databas, och att användaren själv skulle skapa
ett gratis Firebase-projekt och bli guidad steg för steg genom
konsolen (eftersom jag inte kan skapa eller äga ett konto åt dem). Innan
någon kod skrevs klargjorde jag också explicit att en topplista och
riktig realtids-multiplayer är två helt separata saker — multiplayer är
ett mycket större separat projekt (matchmaking, realtidssynk,
disconnect-hantering) och lämnades uttryckligen som en möjlig framtida
egen begäran, inte något som byggdes här.

Ledde användaren (icke-teknisk med Firebase specifikt) genom hela
konsol-flödet i flera skärmdump-baserade utbyten: skapa projekt, välja
Web-appen (`</>`), hoppa över `npm install` helt (spelet är en enda
statisk HTML-fil utan byggsteg — jag skötte all kodkoppling själv mot
den riktiga `firebaseConfig` användaren klistrade in), skapa
Firestore-databasen, och publicera säkerhetsreglerna. Reglerna är
medvetet öppna för läsning (`read: if true`, så alla kan se listan utan
inloggning) men valideringsstyrda för skrivning — bara rätt fältformer,
strängtyper och en maxlängd på spelarnamnet godkänns, ingen riktig
auktorisering. En medveten avvägning för ett hobbyspel utan
inloggningssystem: en tekniskt kunnig spelare skulle kunna manipulera
sin EGEN rad via devtools, men inte andras, och konsekvensen av det är
låg.

Spelaridentitet utan inloggning: ett slumpat `playerId`
(`crypto.randomUUID()` med fallback) genereras en gång och sparas för
alltid i `localStorage`, används som Firestore-dokument-ID
(`players/{playerId}`) så en återvändande spelare uppdaterar sin egen
rad istället för att skapa dubbletter. Ett separat, spelarvalt
`playerName` (också `localStorage`-sparat) är det enda som någonsin
visas publikt, redigerbart direkt i Match Settings-panelen. Eftersom
detta är den FÖRSTA fritextinmatningen någon spelare kan skriva i hela
spelet, och den renderas (via `innerHTML`) i alla andra spelares
webbläsare, byggdes en `escapeHtml()`-hjälpare och en dedikerad
regressionstest med en riktig `<img src=x onerror=...>`-payload som
bevisar att den aldrig exekveras, varken i namn-inputen eller i
listraderna — Firestore-reglerna validerar bara typ/längd, inte
HTML-säkerhet.

`syncLeaderboardScore()` anropas som sista raden i `recordMatchResult()`
efter varje avslutad match och följer samma "best-effort, kraschar
aldrig kärnspelet"-filosofi som redan gäller för presentationslager i
spelet: om `window.leaderboardSyncScore` saknas (Firebase-modulen inte
laddad, nätverket nere, en annonsblockerare) skippas synken tyst utan
att påverka spelflödet. Bryggan mellan spelets klassiska (icke-modul)
huvudscript och Firebases moduluppbyggda JS-SDK (laddat via CDN som
`<script type="module">`) sker via två globalt exponerade funktioner,
`window.leaderboardSyncScore`/`window.leaderboardFetchTop`, som spelets
kod anropar utan att veta något om Firebase internt.

Två separata CSS-specificitetsbuggar hittades och fixades under
byggandet, båda av exakt samma buggklass: en generell basstil med lika
eller högre specificitet vinner över en ny, mer specifik klass oavsett
källordning, tills den nya regeln får en STÖRRE specificitet. Först
kollapsade "Visa topplista"-knappen namn-inputen till ~22px bredd,
eftersom `button.ghost{ width:100%; }` (tagg+klass, specificitet
(0,1,1)) övertrumfade min klass-bara `.leaderboard-view-btn`
((0,1,0)) — fixat med `button.ghost.leaderboard-view-btn`
(tagg+2 klasser, (0,2,1)). Sedan visade själva topplistemodalen namn
trunkerade till en enda bokstav och en helt fel proportionerad layout;
`getComputedStyle`-diagnostik avslöjade att `.leaderboard-modal`s
`max-width` faktiskt var 780px, inte de 480px jag satt. Orsaken:
korts-infomodalens `@media (min-width:700px){ .modal-poster{
max-width:780px; display:flex; ... } }` (för dess sida-vid-sida
art+skills-layout) delar samma bas-klass `.modal-poster` som
topplistemodalen återanvänder, med LIKA specificitet (0,1,0) — och
eftersom den regeln står senare i filen vann den på källordning, vilket
både blåste ut bredden och tvingade `display:flex` på hela
modal-elementet (så rubrik/status/lista klämdes ihop i kolumner istället
för att staplas). Fixat på samma sätt: `.modal-poster.leaderboard-modal`
(två klasser, (0,2,0)) med explicit `display:block`, som vinner
oavsett var i filen den nyare regeln står.

Denna sandlådemiljös nätverksproxy blockerar utgående anrop till
externa domäner som `www.gstatic.com` (bekräftat via `connect_rejected`
i agent-proxy-loggen), så en riktig end-to-end-test mot det verkliga
Firebase-projektet är omöjlig härifrån. Testningen byggdes istället kring
mockade `window.leaderboardSyncScore`/`leaderboardFetchTop`-funktioner i
Playwright, vilket dessutom naturligt speglar produktionsbeteendet bakom
en annonsblockerare eller offline (testramverkets `newPage()` blockerar
redan alla externa nätverksanrop av andra skäl). Två nya permanenta
regressionstest: ett som bekräftar att spelet aldrig kraschar utan
Firebase-modulen laddad OCH att rätt payload/anrop sker när funktionerna
mockas in, och ett som bevisar XSS-skyddet med en riktig
`<img onerror>`-payload. Hela testsviten grön: **162/162** (160 tidigare
+ 2 nya). Eftersom den riktiga nätverksanslutningen inte kan testas
härifrån behöver användaren själv göra en sista manuell koll live
(skriva ett namn, spela en match, öppna topplistan) för att bekräfta att
synken mot den riktiga databasen fungerar end-to-end.

**Fas 27: Coinflip-kompassen — bytt från procedurell SVG till beställd
konst i tre lager.** Användaren ville ändra utseendet på
"Rolling for first move"-skärmens roterande visare, och tog fram ny konst
med ChatGPT: en referensbild med tre motiv sida vid sida (en gyllene/lila
kompass-rosett med ett runt hål i mitten, en dubbelspetsig nål/dolk med en
egen liten juvel inbyggd, och en separat större orb med fyra diamant-
spetsar). Planen (föreslagen av ChatGPT, bekräftad av användaren) var tre
separata lager istället för en enda bild: en stillastående bas, en nål som
snurrar, och en stillastående mitten-orb ovanpå — annars hade juvelen
snurrat med nålen istället för att sitta fast som en pivot.

Användaren påpekade träffande att jag redan brukar klippa ut tillgångar
själv i det här projektet (se Pallis-omklippningen i Fas 55 nedan, med
samma teknik) — så istället för att be om tre separata filer klipptes de
ut direkt ur referensbilden användaren redan skickat. Bilden hade redan
äkta alfa-transparens; ett litet Python/PIL-script (numpy för
alfa-tröskling) hittade de tre motivens exakta pixel-bounding-boxar via
kolumn-/rad-genomsökning av alfakanalen, beskar varje motiv tajt, och
centrerade dem i var sin genomskinlig 512×512-kanvas med bevarat
bildförhållande — `compass-base.png`, `turn-arrow.png`, `turn-center.png`,
sparade i repo-roten (samma plats som de befintliga `vfx-*.png`-filerna).

`renderCoinflip()` byttes från de gamla inline-SVG:erna
(`.arena-rosette`/`.coin-arrow`, handritade polygoner) till tre
`<img>`-lager staplade och centrerade ovanpå varandra i
`.coinflip-frame`: basen fyller hela ramen och står still, nålen roterar
(samma `spinArrow`-keyframe och samma `--final-rot`-vinkel-logik som
tidigare — blue-vinst ger 90°, red-vinst -90°, plus tre extra varv för
själva snurr-känslan), och mitten-orben ligger som översta lager exakt i
kompass-basens hål, vilket medvetet döljer nålens egen inbyggda juvel
istället för att de två skulle synas dubbelt. Enda knepiga CSS-biten:
`translate(-50%,-50%) rotate(var(--final-rot))` i den ordningen — annars
snurrar den absolutpositionerade nålen excentriskt istället för runt sin
egen mittpunkt. Den generella `.arena-rosette`-klassen och dess helt
separata användning som bakgrundsdekor bakom själva spelbrädet
(`arena-frame`) rördes inte alls, bara coinflip-skärmens egen kopia.

Verifierat med Playwright-skärmdumpar i båda utfallen (blue vinner/red
vinner) — nålen landar synligt åt olika håll, mitten-orben täcker pivoten
snyggt, och de tre bildernas `naturalWidth`/`complete`-status bekräftar
att alla laddade korrekt. Inga befintliga test rörde de gamla SVG-
klasserna, så inget behövde uppdateras. Hela testsviten grön: **162/162**
(oförändrat antal — en ren visuell ombyggnad, ingen ny testbar logik).

**Fas 28: The Gambler — nytt kort, plus fem nya combo-fokuserade
färdighänder.** Användaren skickade egen ChatGPT-genererad konst (ett
porträtt, en pil/stöt-VFX, en helbräde-explosion) och bad mig skriva in
passande förmågor. Resultat: **The Gambler** (10/10/10/10, Void-element
🌌 — nytt elementtema, utanför element-cykeln) med tre förmågor:
**Roll the Dice** (passiv) — varje vanlig attack slår tre riktiga
tärningar (äkta 3d6-odds, inte handplockade procent) och visar 1/2/3
träff-blixtar beroende på hur många som matchar, men rent visuellt —
själva stridsresultatet påverkas aldrig, sista träffen avgör precis som
alla andra kort; **Flare** (placerings-passiv) — angränsande fiender
-1 Power denna runda, med en egen längre-varande `flareFlash`-glöd
(2,4 sekunder, eget flöde skilt från det delade 1300ms-svepet) efter
användarens egen begäran om att Flare skulle synas längre; **Special
Attack: Ultima** — ombyggd två gånger under samtalet: från ett
enmåls-anfall till en HELBRÄDE-attack (användarens egen begäran, "en
attack som tar hela bordet") som flippar VARJE fiendekort rakt av (ingen
strid, samma ovillkorliga flip-primitiv som Graffs Whirlwind Assault,
sköldar respekterade), med en färgskiftande (hue-rotate) helbräde-VFX
byggd från användarens egen konst istället för de vanliga procedurella
ring/hit-primitiverna. Kostnad landade till slut på 2 wins (nedsatt
från 4, efter att användaren rapporterat att 4 wins sällan gick att nå
i praktiken).

Samtidigt: fem nya färdighänder på "Choose Your Five", byggda kring
RIKTIGA, redan kodade synergier (inte påhittade teman) — Sisters of Ruin
(Vaelira/Seraphine/Nyxara, skalande `sisterAura`), Sky & Void
(Aurelian/Vorlix, `pairPresence` +2/+2), Twin Blades (Twin Brothers/Twin
Sisters, `pairPresence` +2/+2), Reunited Pack (Pallis/Pallis & Pell,
`RIVALRY_PAIRS`-närhetsbonus +1/+1, kräver att de placeras BREDVID
varandra) och Shadow Pact (Torn/Vayra, `pairPresence` +1/+1). Ingen ny
UI/hanterings-kod behövdes — den befintliga `beginner-deck-btn`-klicklogiken
och `.beginner-deck-row`s `flex-wrap`-layout var redan helt generiska över
`BEGINNER_DECKS`.

Även: en subtil overksam runa i tomma brädrutor (design-genomgång på
användarens egen fråga "vad kan förbättras") — provades först med en
redan befintlig, oanvänd tillgång (`vfx-magiccircle.png`) innan
användaren beställde egen konst; bytt till den beställda bilden
(`cell-rune.png`) när den var klar. Ren CSS-animation (ingen JS/render-
kostnad), staggrad per-ruta fördröjning så alla inte pulserar i takt.
SEO-metataggar (description/Open Graph/Twitter/keywords) lades också
till efter att användaren rapporterat att spelet var svårt att hitta på
Google.

**Fas 29: Progression-systemet, steg 1 — grunden (poäng, nivåer,
väska).** Användaren beskrev, i flera meddelanden som byggde på varandra
under en lång konversation, en hel ny meta-lager inspirerad av FF8:s
korthandel: en permanent "väska" per spelare, packs man köper för poäng
(Rare 5000/Epic 10000/Legendary 15000/Mystic 20000, 10 kort per pack),
10 nivåer man måste klättra för att FÅ KÖPA högre pack-rariteter (en
spärr, inte bara en räknare), och fem AI-motståndare med FF8:s riktiga
handelsregler (vissa "All" — hela den ILAGDA femman på spel, andra "One"
— bara ett kort) som låses upp EFTER att hela Campaign klarats en gång.
Kritiska förtydliganden under samtalet, alla direkt från användaren:
bara de FEM VALDA matchkorten (inte hela väskan) någonsin i riskzonen;
den befintliga kortrostern (t.ex. Campaign-startkorten) kan ALDRIG
förloras; poäng ska komma från VARJE match (även förluster), med mycket
större bonus för att klara Campaign; och — mycket viktigt, en egen
flaggad UX-kravspecifikation — spelaren måste FÖRVARNAS tydligt innan en
högrisk-AI-match, så ingen förlorar kort utan att förstå riskerna i
förväg.

Detta är enbart steg 1 (ren grund, "steg i taget" på användarens egen
begäran) — inga packs, ingen väska-UI, inga riskmotståndare än. Byggt:
`playerProgress` (poäng, `lifetimePoints`, `earnedCards` — tom tills
vidare, `campaignClearedOnce`), sparat i `localStorage` med exakt samma
mönster som `matchStats`/`campaignProgress` (aldrig rörd av
`resetGame()`, eftersom det är livstids-spelardata, inte per-match-
state). `LEVEL_THRESHOLDS` — tio steg, `playerLevel()` läser
`lifetimePoints` (aldrig `points`, den spenderbara balansen, så ett
framtida pack-köp aldrig kan sänka nivån). Poäng delas ut i
`finishGame()`: 50/20/10 (vinst/oavgjort/förlust) för Random Draft/
Choose Your Five, 100/20 för Campaign-steg, plus en engångsbonus på
2000 exakt första gången sista Campaign-steget klaras (kollat mot
`CAMPAIGN_STAGES.length`, `campaignClearedOnce` förhindrar att en New
Game+-genomspelning ger bonusen igen). En liten men synlig
"Progression"-sektion i Match Settings-panelen (nivå, poängsaldo, poäng
kvar till nästa nivå) så att framsteget är synligt från dag ett, inte
bara osynlig bokföring — annars hade poängen känts meningslösa fram
till att packs faktiskt finns.

Verifierat med två nya permanenta regressionstest: ett som täcker hela
poäng-flödet (vanlig vinst/förlust, Campaign-stegvinst, full Campaign-
klarning ger bonusen EN gång men inte igen vid en andra klarning, samt
nivå-gränsvärden inklusive precis under/vid en tröskel och långt över
max-nivån) och ett som bekräftar att `playerProgress` överlever en
sidladdning och `resetGame()` precis som `matchStats`/`campaignProgress`
redan gör. Hela testsviten grön: **164/164** (162 tidigare + 2 nya).

**Fas 30: Progression-systemet, steg 2 — packs.** Direkt fortsättning på
Fas 29, samma "steg i taget"-begäran. Byggt: `PACK_TIERS` (Rare
5000p/Level 1, Epic 10000p/Level 3, Legendary 15000p/Level 6, Mystic
20000p/Level 9 — exakt kostnaderna/nivåerna användaren angav),
`canBuyPack()`/`buyPack()`, och en ny `renderPacksModal()` i samma
modal-overlay/modal-poster-mönster som Graveyard/Leaderboard-modalerna,
öppnad via en ny "🎁 Packs"-knapp i Progression-sektionen. Hela systemet
förblir helt låst (ingen tier köpbar oavsett poäng/nivå) tills
`playerProgress.campaignClearedOnce` är sant, exakt enligt användarens
egen regel.

En ärlig avvägning, uttalad rakt ut till användaren innan bygget: det
finns inga PACK-EXKLUSIVA nya kort än — varje tidigare kort i spelet har
kommit med användarens egen beställda konst, ett i taget, och att
uppfinna dussintals nya balanserade kort tyst här hade varit precis den
sortens oombedd scope-utvidgning som borde undvikas. Så för nu drar alla
fyra rariteter från SAMMA pool (den befintliga HEROES-rostern) — bara
kostnad/nivåspärr skiljer tiers åt, inte innehållet. Riktiga
tier-exklusiva kort är ett naturligt uppföljningssteg när användaren vill
designa specifika nya kort (med egen konst, som vanligt).

Varje dragning respekterar taket på 10 kopior (`EARNED_CARD_CAP`) —
ett kort som redan ligger på 10 visas ändå i resultatlistan (taggat
"MAX") istället för att tyst försvinna, så spelaren ser vad som hände.
Dubbletter INOM samma pack hanteras korrekt (läser/skriver
`playerProgress.earnedCards` direkt i varje varv av dragnings-loopen,
inte batchat i slutet), verifierat explicit i test.

En riktig CSS-specificitetsbugg av exakt samma klass som tidigare i
projektet (`button.ghost.leaderboard-view-btn`-mönstret) dök upp igen
på köp-knapparna — `.packs-buy-btn` (klass-bara, specificitet (0,1,0))
förlorade mot den generella `button.ghost{width:100%}` ((0,1,1)) och
knapparna svämmade ut ur modalen. Fixat med `button.ghost.packs-buy-btn`
(tagg+2 klasser), samma lösning som redan etablerad tidigare.

Verifierat med ett nytt permanent regressionstest som täcker hela
flödet: helt låst före Campaign-klaring oavsett poäng/nivå, per-tier-
spärr på både poäng OCH nivå separat (kan ha råd men fel nivå, eller
rätt nivå men för lite poäng), att `buyPack()` drar exakt rätt
poängsumma och ger exakt `tier.count` kort, att ett nekat köp aldrig
kastar fel eller drar poäng, och 30 upprepade pack-öppningar mot ett
redan-vid-taket-kort som aldrig går över 10 men fortfarande dyker upp
flaggat i resultatet. Hela testsviten grön: **165/165** (164 tidigare +
1 ny).

**Fas 31: Packs — visuell flip-avslöjning istället för en statisk
grid.** Direkt uppföljning på Fas 30, samma session. Användaren pekade
på andra kortspels pack-öppningar som referens: korten ska ligga
nedvända och flippa upp en efter en ("bredvid varandra", inte alla på
en gång), och glöden vid avslöjandet ska matcha rariteten (Epic lila,
osv). Byggt med ren CSS: varje avslöjat kort är en `perspective`-
container (`.packs-reveal-card`) runt en `transform-style:preserve-3d`-
inre `div` (`.packs-reveal-inner`) som roterar `rotateY(0→180deg)` via
`@keyframes packsCardFlip`, med två `backface-visibility:hidden`-ytor
(`.packs-reveal-back` — samma `CARD_BACK_IMAGE` som draghögen redan
använder, `.packs-reveal-front` — det riktiga kortet). Staggring: varje
korts `--flip-delay`-CSS-variabel sätts från dess index i
`state.packOpenResult.drawn` (0.15s isär), så tio kort läses tydligt som
en sekvens, inte en enda simultan smäll.

Rarity-glöden (`--pack-glow`, en "r,g,b"-trippel så den kan komponeras
med olika alpha i `packsGlowPop`-keyframen) färgas efter vilket PACK som
öppnades (blå/lila/guld/röd för Rare/Epic/Legendary/Mystic) — inte per
enskilt kort, eftersom ingen per-kort-rarity finns än (se Fas 30:s egen
kommentar om att alla tiers delar samma pool). Förtydligat rakt ut till
användaren innan bygget så tolkningen kunde rättas om den var fel.
"NEW"/"MAX"-taggen tonas in efter att kortets egen flip landat
(`animation-delay: calc(var(--flip-delay) + 0.55s)`), inte samtidigt som
alla andra.

Ren presentationsändring — ingen ändring i `buyPack()`s egen logik, så
alla befintliga pack-test täcker fortfarande exakt samma beteende.
Verifierat visuellt med Playwright-skärmdumpar mitt i sekvensen (ett
kort helt flippat, ett kort i sidled mitt i vridningen, resten
fortfarande nedvända) och efter att alla landat (alla tio med synlig
lila glöd runt kanten för ett Epic-pack). Hela testsviten grön:
**165/165** (oförändrat — ren visuell ombyggnad, ingen ny testbar
logik).

**Fas 32: Progression-systemet, steg 3 — Rivals (de fem FF8-motståndarna).**
Det tredje och sista huvudsteget i den ursprungliga visionen från Fas
29-31: fem namngivna, fasta motståndare (`RISK_OPPONENTS`), varje med sin
egen signatur-hand (återanvänder befintliga HEROES-porträtt/förmågor,
samma "ingen ny konst än"-resonemang som packs) och sin egen FF8-regel —
"one" (förlorar exakt ETT av de fem satsade korten vid förlust) eller
"all" (förlorar ALLA fem). Precis de två reglerna användaren faktiskt
bad om (inte de fulla FF8-reglerna Direct/Diff, som aldrig efterfrågades).

Kritisk designinsikt från konversationen: eftersom standardrostern
ALDRIG kan förloras (Fas 29-30:s egen regel), och det enda som någonsin
riskeras är "de kort man väljer" till just den matchen, måste en
risk-match satsa kort från den INTJÄNADE poolen specifikt — annars
skulle "risken" vara tom (standardkort som aldrig kan försvinna). Så en
risk-match har sin egen satsnings-plockare (`earnedCardIds()`, bara kort
med `playerProgress.earnedCards[id] > 0`), skild från den vanliga
Choose Your Five/Random Draft-rostern. Kräver minst 5 SKILDA intjänade
kort-id:n (inte bara 5 kopior av samma kort — matchar hur en hand redan
aldrig kan innehålla dubbletter) för att ens kunna utmana.

Byggt: en ny `⚔️ Rivals`-modal (samma mönster som Packs/Leaderboard) med
två vyer — motståndarlistan (visar regel + hur många av spelarens kort
just den motståndaren för närvarande håller) och, efter "Challenge", en
OBLIGATORISK varningsskärm som tydligt visar regeln och konsekvensen
innan en satsnings-plockare (samma `cardFace()`-rutnät som draftskärmen)
låter spelaren välja exakt 5 kort — precis den varningen användaren
uttryckligen krävde ("man måste... få en varning innan man möter
motståndaren"). `beginRiskMatch()` återanvänder `startBattle()` helt
(samma coinflip-sekvens, brädsetup) — bara `state.riskMatch`-bokföringen
och motståndarens fasta hand/svårighetsgrad är särfall, byggt på exakt
samma sätt som Campaign redan särfallar sin egen `enemyHand` i samma
funktion.

`resolveRiskMatch()`, anropad från `finishGame()` efter den vanliga
vinst/förlust-bokföringen: vid FÖRLUST flyttas 1 (regel "one", slumpat
bland de fem) eller alla 5 (regel "all") satsade kort från spelarens
`earnedCards` till just den motståndarens `opponentHeld`-pool
(`playerProgress.opponentHeld[opponentId]`, ny per-motståndare-karta).
Vid VINST, om motståndaren håller några av spelarens kort sedan
tidigare, återfås exakt ETT slumpmässigt (flyttat tillbaka, respekterar
`EARNED_CARD_CAP`). Ett OAVGJORT rör ingenting alls — varken vinst eller
förlust, matchar att en oavgjord match aldrig beskrevs som en "förlust"
i användarens egna regler. `state.aiDifficulty` sparas undan och
återställs alltid efter matchen (vinst ELLER förlust), så en
Rivals-utmaning aldrig läcker in i spelarens vanliga svårighetsgrads-
inställning för nästa Random Draft-match. Resultatet ("⚔️ [Motståndare]
claimed X!" eller "Reclaimed X from [Motståndare]!") visas på samma sätt
som streak/favorit/achievement-raderna redan gör på resultatskärmen.

Verifierat med två nya permanenta regressionstest: ett som täcker hela
upplåsnings-/uppstarts-flödet (låst före Campaign-klaring oavsett
intjänade kort, låst med för få SKILDA intjänade kort-id:n, och att
`beginRiskMatch` korrekt sätter draftMode/selected/riskMatch OCH att
motståndarens egen fasta hand faktiskt dyker upp i en riktig
strid — inte ett slumpmässigt drag) och ett som täcker hela
`resolveRiskMatch`-matrisen (ONE tar exakt 1, ALL tar alla 5, en vinst
återtar exakt 1 hållet kort med rätt cap, en vinst utan något hållet
skapar inget påhittat resultat, och ett oavgjort rör bokstavligen
ingenting). Hela testsviten grön: **167/167** (165 tidigare + 2 nya).

Med detta är alla tre huvudsteg i progression-systemet (grund/poäng,
packs, Rivals) på plats — grunden användaren bad om, byggd stegvis
precis enligt "steg i taget".

**Fas 33. Campaign-balansering — två separata, bevisbaserade fixar
efter användarens egen feedback ("nu är det jätte svårt jag har inte
ens klarat hela campaign", senare "det går inte vinna på campaign nivå
1+ på nivå 12"). Istället för att gissa byggdes en riktig Monte Carlo-
simulering (Playwright, körde spelets egen `chooseAIPlacement`-sökning
på BÅDA sidor, inte en förenklad heuristik) som spelade igenom flera
sena Campaign-stages upprepade gånger med en stark, realistisk hand.

Fynd 1: Svårigheten var INTE en jämn kurva där Hard AI + statBoost
staplas mot slutet — "Hunter's Pact" (stage 9) och "The Twin Storm"
(stage 11), båda Normal AI, hade LÄGRE vinstfrekvens (37,5% resp. 25%)
än flera senare Hard AI-stages med högre statBoost (50-100%). Orsaken:
båda fiende-rosterna garanterar ett kraftfullt synergipar på plan
samtidigt (Aurelian+Vorlix staplar axisBonus+pairPresence till upp
till +3 i sin favoritriktning; Evil Twist Yin+Yang kombinerar
neutralizeAttackerBonus — som nollställer anfallarens bonusar i
försvar — med mindsBalanceSwap, som byter värde och vinner rakt av mot
ett högre kort). Den extra flata statBoost på dessa två stages
förstärkte bara en redan skarp spik. Fix: statBoost borttagen helt
från just dessa två (Hunter's Pact, The Twin Storm) — bekräftat med
simulering: 37,5%→56%, 25%→62,5%.

Fynd 2 (upptäckt när användaren rapporterade att stage 12 på New
Game+1 var okörbar): stagets egen statBoost och `ngPlusBoostCard`s
eget +2/cykel staplas additivt (avsiktligt, se `campaignStatBoost`),
vilket gjorde att en stage med statBoost:2 på NG+1 i praktiken slogs
mot +4 rakt Power på varje sida — en spik som aldrig testades under
den ursprungliga balanseringen (som bara körde ngPlus:0). Fix: hela
den återstående boostade sträckan (stage 10-16, statBoost 1,2,2,2,3,3)
halverades till 1,1,1,1,2,2, vilket lämnar utrymme för NG+ att stapla
ovanpå utan att bli okörbart. Verifierat med en större simulering
(n=30 per scenario) att sänkningen inte skadar NG+0-balansen (~50%
vinstfrekvens) och håller NG+1 rimligt spelbart (~65%) — och
användaren klarade stage 12 direkt efter fixen landade i spelet.

Två nya/uppdaterade permanenta regressionstest säkerställer att den
nya statBoost-kurvan (ingen boost på Hunter's Pact/Twin Storm/finalen,
1,1,1,1,2,2 på resten) faktiskt ligger i koden, att `campaignStatBoost`
och `ngPlusBoostCard` fortsatt staplas additivt och aldrig muterar det
delade FOREST_FOES-kortet, och att `startBattle()` faktiskt applicerar
rätt stage-boost på en riktig fiendehand. Hela testsviten grön:
**167/167**.

**Fas 34. Twin Brothers/Twin Sisters — de sista två kvarvarande korten
på den ursprungliga 16-korts audit-listan (punkt 15-16), aldrig
markerade KLAR till skillnad från de andra 14.** Solar Tempest/Lunar
Eclipse hade en `special`-post med cost/targets, men ingen egen
`SPECIAL_HANDLERS`-funktion alls — `runSpecialResolution`s egen
`if(!handler) return;`-guard gjorde att de var en helt TYST no-op i en
riktig match: kostade inget, gjorde inget, bara stängde special-läget.
Byggde `SPECIAL_HANDLERS.twinbrothers`/`.twinsisters` i samma form som
Aurelians Skybreaker/Vorlix WorldCleaver (kortets egna "+3 Power"
räknas in i själva träffchecken, inte en belöning efteråt) och Lyriths
Serpent's Wrath (ingen shield-check, matchar "enemy's defensive skills
can't activate"). Vid vinst buffas BÅDA tvillingarna +1 alla sidor
denna rond, inte bara den som castar — precis vad korttexten säger.

Brotherly Might/Dual Strike (Brothers) och Synergy of Souls/Echoing
Power (Sisters) beskriver båda samma triggerpunkt (vinner en
strid/tar över ett kort) och samma "den här rondens" varaktighet — vek
för samma "välj en riktning -> förenkla till alla sidor"-konvention
som redan är etablerad i den här filen (se Tildas egen kommentar om
detta), och vek dessutom in i ett REDAN implementerat fält
(`onCaptureBuffSelfThisRound`, redan använt av Templaren/Naline) i
stället för att uppfinna ett nytt. Lades till som `+3`
(`onCaptureBuffSelfThisRound:3` = 1 från Brotherly Might + 2 från Dual
Strike) på båda korten. Unbreakable Link/Graceful Unity var redan
korttextens egen "folded into Bound in Harmony"-notering sedan
tidigare, så den räknades aldrig som en egen lucka.

Ett nytt permanent regressionstest täcker allt: att en riktig
`placeCard`-erövring faktiskt ger +3 (plus Fraternal Furys redan
existerande permanenta +1 för Brothers, så +4 totalt där), att Solar
Tempest/Lunar Eclipse faktiskt flippar ett mål och kostar sina 2 wins
(bevisar att no-op-buggen är fixad), att en för stark fiende korrekt
INTE flippas och INTE ger någon buff, och att partnertvillingen (om
den står på brädet) också får sin +1 vid vinst. Hela testsviten grön:
**168/168**.

**Fas 35. Campaign utökad från 17 till 20 etapper**, på användarens
begäran ("Gör fler etapper upp till 20"). Två nya etapper (17-18,
"Sovereigns of the Deep" och "The Silent Reckoning") infogade FÖRE
Systrarna, med kort som ALDRIG tidigare figurerat som Campaign-fiender
(shiva, leviathan, omegaweapon, yojimbo, chocoboking, odin, gambler,
astrael, ysara, ferea) — färska hot istället för att bara blanda om
samma handfull namn igen. Ingen av rostren innehåller ett känt
pairPresence-par (se Fas 33s lärdom om varför det spelar roll), och
båda ligger på statBoost:2 — samma nivå som Ashes and Frost/Wyrmking's
Domain precis före, medvetet INTE eskalerat ytterligare givet vad Fas
33s NG+-fynd redan visade om stapling.

Systrarna flyttades till etapp 19 (oförändrad roster/banner/lore) för
att göra plats åt en helt ny sann final-boss på etapp 20: **Triune
Desire** ("The Forbidden Union — Boss, Triple Triad Sisters IV", de
tre systrarna smälta till en) — ett kort som redan var helt färdigbyggt
(10/10/10/10, brädtäckande +1/-1-aura, en förödande AOE-special som
blir helt gratis så fort en syster finns på plan) men ALDRIG kopplats
in i Campaign förrän nu. Fälld med bara 2 av de 3 systrarna
(vaelira+nyxara, inte seraphine) — inte alla tre — eftersom varje
systers egen `sisterAura`/"Sister's Bond"/"Sister's Command" redan
staplar till +3..+5 Power VAR när alla systrar är närvarande, plus TRE
separata bräd-rensande AOE-specialer ovanpå Triune Desires egen; att
stapla alla fyra samtidigt hade återskapat exakt den typ av
garanterad-synergi-spik hela Fas 33 gick ut på att fixa, fast värre.
Ingen statBoost på finalen, samma resonemang som den gamla
Systrar-finalen: kortets egen kraftnivå är redan höjdpunkten — en
tematisk klimax, inte en sifferspik.

Simulerat exakt som allt annat den här sessionen (Playwright,
`chooseAIPlacement`-sökning på båda sidor) innan det skeppades: 43-88%
vinstfrekvens på de två nya mellanetapperna (NG+0 och NG+1), 81-100% på
den nya finalen — tillräckligt svårt för en final utan att vara
omöjligt. Ett nytt permanent regressionstest täcker strukturen (20
etapper totalt, rätt namn på 17-20, finalen har Triune Desire + exakt 2
systrar + inget statBoost, att Triune Desire faktiskt är ett riktigt
kort i både HEROES och FOREST_FOES och att `startBattle()` faktiskt
fäller henne i en riktig fiendehand, samt att de två nya etapperna inte
råkar innehålla något känt pairPresence-par). Två äldre test som
hårdkodat index 16 som "Systrarnas/finalens plats" uppdaterades till
`CAMPAIGN_STAGES.length - 1` respektive det nya indexet 18. Hela
testsviten grön: **169/169**.

**Fas 36. My Bag — en ny läs-läge-vy för `playerProgress.earnedCards`**,
på användarens fråga ("vart hittar man sin bag med kort?"). Svaret var
att det inte gick — `earnedCards` fanns bara som data, ytan var
Rivals' egen wager-picker (en VAL-vy, hårt begränsad till 5 kort, inte
en full genombläddring av vad man äger). Ny knapp "🎒 My Bag" bredvid
Packs/Rivals i Match Settings-panelen, samma modal-poster/overlay-form
som Packs/Rivals, tre tillstånd (låst innan Campaign klarad, tom bag,
full bag). Full-vyn visar varje ägt kort sorterat efter antal (flest
först), med en ny `cardFace()`-option (`opts.countBadge`) som ritar en
guld ×N-badge i nedre vänstra hörnet.

Uppföljande begäran samma stund: "i väskan man ska man se sina
credits ... som guldmynt typ" — en ny `.bag-wallet`-pill direkt under
rubriken visar poängsaldot som ett guldmynts-märke (🪙, guldram/glöd,
samma `--gold-bright`-färg som resten av UI:t), synlig oavsett om
väskan är tom eller låst — så man alltid ser hur nära man är nästa
pack utan att stänga modalen.

Verifierat med skärmdumpar vid tre bredder (390/768/1280px) innan det
skeppades, samma disciplin som Packs-knapparnas tidigare
specificitetsbugg — ingen overflow den här gången. Ett nytt permanent
regressionstest täcker alla tre tillstånd, sorteringen, att ett kort
med 0 kvar (allt förlorat till en Rival) inte visas, och att
guldmynts-plånboken faktiskt visar rätt poängsumma. Hela testsviten
grön: **170/170**.

**Fas 36 (uppföljning). Riktig ChatGPT-genererad ikon för My Bag.**
Användaren skickade den genererade bilden direkt (en sliten
guld/lila-läderpung med mynt och ett korthörn som tittar fram, exakt
enligt briefen som skickades) — äkta alfa-transparens verifierad
(RGBA, hörnpixlar (0,0,0,0)), beskuren/nedskalad från 1254×1254 till
512×512 (samma konvention som `cell-rune.png`/`vfx-magiccircle.png`,
~387KB). Sparad som `bag-icon.png`, ersätter 🎒-emojin både i
"My Bag"-knappen och modal-rubriken via en ny `.bag-icon-inline`-klass
(1.15em, vertikalt centrerad mot texten). Verifierat med skärmdumpar
igen innan det skeppades. Hela testsviten grön: **170/170**.

**Buggfix: Systrarnas lore-text gick inte att läsa** — rapporterad av
användaren med en skärmdump från Stage 19 ("Hittade ett bugg man kan
inte läsa deras story"). Reproducerat direkt (inte gissat från bilden):
`.lore-panel` hade `max-height:420px; overflow-y:auto` men renderades
bara **34px** hög, trots att det faktiska innehållet var 1519px —
bara första rubriken syntes, ingen brödtext alls. Grundorsak: en känd
CSS-flexbox-fälla — ett flex-item med `overflow` skilt från `visible`
får en automatisk min-storlek på 0 istället för sitt eget
min-content-mått, så när sidans totala innehåll (banner + knapp +
lore + hela 30-korts-rostret) blev högre än viewporten (`.wrap` är en
höjdbegränsad flex-kolumn) klämde `flex-shrink` ihop just den här
panelen till nästan ingenting, trots dess egen `max-height`. Fixat med
`flex-shrink:0` på `.lore-panel` — bekräftat i headless Chromium: höjd
34px → 420px, samma fix verifierad med en riktig skärmdump av hela
berättelsen. Kollade alla andra scrollbara paneler i filen
(`.graveyard-cards`, `.leaderboard-list`, `.packs-reveal-list`,
`.rivals-picker-grid`) — alla ligger inne i `position:fixed`-modaler
och är därför inte påverkade av samma bugg; bara `.lore-panel` renderas
direkt i sidflödet. Ett nytt permanent regressionstest mäter både att
lore-innehållet verkligen överstiger 420px (annars skulle testet klara
sig även med buggen kvar) och att panelen faktiskt renderas nära sin
avsedda höjd. Hela testsviten grön: **171/171**.

**Fas 37 (steg 1 av 2). Campaign-klarningsbonusen skalar nu med NG+**,
på användarens begäran ("man får ännu mer poäng när man kör campaign
1+ och ännu mer om man klarar +2 osv"). Tidigare gav bara den ALLRA
FÖRSTA fullständiga klarningen 2000 poäng (`!playerProgress.
campaignClearedOnce`-grinden) — varje NG+-klarning därefter gav
ingenting extra alls utöver den vanliga etapp-bonusen. `campaignCleared
Once` stannar kvar som en engångs-flagga (den låser fortfarande upp
Packs/Rivals bara en gång), men själva poängbonusen körs nu vid VARJE
fullständig klarning och skalar: `2000 + campaignProgress.ngPlus *
1000` — 2000 första gången, 3000 för NG+1, 4000 för NG+2, och så vidare
utan tak. Uppdaterade det befintliga testet till att täcka både NG+1-
och NG+2-klarning. Hela testsviten grön: **171/171** (samma antal,
befintligt test byggdes ut snarare än ett nytt lades till).

**Fas 37 (steg 2 av 2, påbörjad). Fem nya "pack-exklusiva" kort** —
användarens nästa stora begäran: fem helt nya kort, en nivå starkare
än standardrostret, som ENDAST går att få genom Packs (aldrig
draftbara i Campaign/Random Draft/Choose Your Five) och som sedan ska
ha en CHANS att dyka upp när man drar sina fem kort i vanliga matcher
("man har en chans att dra i när man drar kort under nya systemet").
Detta kräver en riktig arkitekturändring: idag används `earnedCards`
ENDAST till Rivals-insatser — Random Draft/Choose Your Five/Campaign
drar alla sina kort direkt ur `HEROES`, så ett intjänat kort går aldrig
att faktiskt SPELA med i en vanlig match just nu. Väntar på användarens
egna 5 kortkoncept (namn/tema, de bygger dem, jag skriver stats/skills/
attacksiffror) innan implementationen kan börja på riktigt — två
bildbriefer redan skickade under tiden: en för kortet "Dragon" (en
lansriddare, INTE en bokstavlig drake) och en för en ny, extra
utsmyckad kortram exklusiv för dessa fem kort, uttryckligen refererad
mot spelets egen kortbaksida/kompass-stil.

**Fas 38 (klar). Det första pack-exklusiva kortet: Dragon, The Onyx
Lancer.** Hela den nya arkitekturen byggd och kortet färdigt, från
ChatGPT-genererad konst till spelbar mekanik. En helt ny, tredje roster
`PACK_EXCLUSIVE_CARDS`, medvetet SKILD från `HEROES`/`FOREST_FOES` --
`campaignPool()` och alla draft-pickers läser bara `HEROES`, så att
bara UTELÄMNA korten därifrån räcker för att göra dem odraftbara i
Campaign/Random Draft/Choose Your Five. `findCardById()` utökad att
även söka den nya arrayen så My Bag/Rivals/en riktig match ändå hittar
kortet när det väl dyks upp.

Två sätt att få tag på det, båda byggda:
- `buyPack()`: poolen är nu `HEROES` plus de `PACK_EXCLUSIVE_CARDS` vars
  `packTier` matchar det öppnade packet -- sällsyntheten kommer helt
  naturligt av poolstorleken (1 av ~59 kort), inget separat vikt-system
  behövdes. Dragon är taggad `packTier:'rare'`, användarens eget val
  ("jag tycker detta kort ska hamna i rare").
- `drawRandomFive()`: en ny `PACK_EXCLUSIVE_DRAW_CHANCE` (15%) ger en
  chans att byta ut en av de fem slumpade platserna mot ett ägt
  exklusivt kort, per användarens egna ord ("man har en chans att dra i
  när man drar kort"). Medvetet begränsat till Random Draft -- Choose
  Your Five förblir ett helt medvetet val ur standardrostret.

Mekaniskt: en lansriddare vars hela kit bygger på det en lans faktiskt
är till för -- att punktera rustning. Piercing Lance (passiv) gör att
alla hans VANLIGA attacker ignorerar mål-kortets Shield/försvarsförmåga
(samma "no shield check"-mönster Lyriths Serpent's Wrath redan
använder för specialer, här applicerat på vanliga strider också -- se
kommentarerna vid battleNeighbors båda anropsställen). Onyx Momentum
ger honom +2 Power specifikt när han anfaller ett Shielded kort --
alltså en genuin kontring mot sköld-tunga händer (Tahabata, Bahamut,
Aurelia, Twin Brothers/Sisters, Darum...) snarare än en universell
uppgradering, precis vad användaren bad om ("bättre... men användbart i
vissa situationer inte bara konstnärligt"). Special Attack: Dragonfall
Charge ignorerar Shield helt och ger en permanent +2 bonus bara om målet
faktiskt var Shielded. Stats (35 totalt) ligger medvetet under de
absolut starkaste Legendary/Mystic-korten (de flesta ligger 37-40) --
Rare är det billigaste/mest lättillgängliga packet, så ett rent
sifferövertag hade underminerat hela tier-stegen; hans fördel ligger
helt i mekaniken.

Visuellt: kortporträttet (941×1672, matchar exakt samma konvention som
Shiva/Leviathan/Omega Weapons egna "full art") och en ny, permanent
ornamenterad ramöverlägg (`exclusive-card-frame.png`, äkta
alfa-transparent mittenhål verifierat pixel-för-pixel) plus en
pulserande guld/lila-glöd (`opts.exclusiveFrame`/`.exclusive-card`) --
ny CSS-klass `.card-inner{z-index:3}` lades till så namntexten alltid
syns TYDLIGT ovanpå ramens hörnornament (var delvis skymd innan den
fixen). Glöden ligger medvetet på `::before` snarare än `::after` --
`.card.selected` äger redan `::after`, och ett kort kan vara BÅDE valt
och exklusivt samtidigt (t.ex. i handen), så de måste ligga på skilda
pseudo-element eller hade den ena statusens glöd tyst ersatt den andra.

Ett nytt permanent regressionstest täcker allt: att Dragon aldrig går
att drafta normalt men ändå går att hitta via `findCardById`, att
Piercing Lance/Onyx Momentum faktiskt fungerar i en riktig strid (bevisat
med en matchup som annars hade FÖRLORAT utan bonusen), att han bara
någonsin dyker upp i Rare-packet (aldrig Epic/Legendary/Mystic, 150
öppnade packet av varje), att `drawRandomFive()` faktiskt kan dra honom
om man äger honom men ALDRIG om man inte gör det, och hela
Dragonfall Charge-specialens shield-ignorering + villkorad bonus. Hela
testsviten grön: **172/172**.

**Fas 38 (uppföljning). Ramen saknades i detaljvyn.** Användaren märkte
att ramen bara syntes på de små kortvyerna (hand/bräde/My Bag), inte i
den stora detaljvyn där man faktiskt läser skills. Orsak: detaljvyn
(`renderModal()`) är en helt separat renderingsväg från `cardFace()`
(direkt `<img>` mot `FULL_CARD_IMAGES`, inte samma mall), så
frame-overlayen som lades till i `cardFace()` nådde aldrig dit. Lade
till samma overlay i `renderModal()`s `artBlock`, men med
`object-fit:contain` istället för `fill` -- detaljvyns bildruta är en
annan (smalare/högre, ~9:16) proportion än den 5:7-ram-tillgången är
gjord för, så att sträcka ut den (som på de små korten) hade synligt
snedvridit hörnmedaljongerna till ovaler. `contain` håller ramen
odistorderad, "brevlådad" i den högre rutan -- huvuddelen av
porträttets vertikala mitt (där motivet faktiskt är) hamnar ändå
innanför ramen. Hela testsviten grön: **172/172**.

**Fas 39. Andra pack-exklusiva kortet: Reaper, The Fallen Seraph
(Epic).** Användarens egen framing: "Dragons bror" -- men medvetet
KONTRASTERANDE tema snarare än en omskinnad kopia (vingad, himmelsk, en
stor lie/skära, stiger genom moln mot en taggig halo, ljust guld/vitt
istället för Dragons mörka/jordbundna stil). Tilldelad Epic-tier (ett
steg över Dragons Rare) på egen bedömning eftersom motivet kändes mer
påkostat, stats (36 totalt) en notch över Dragons 35 för att matcha.

Mekaniskt en bred AOE/comeback-kontrast till Dragons precisa
punktera-en-fiende-stil: Reaper's Toll (ny `onWinAreaDebuffThisRound`-
krok, en "denna rond"-syskon till Three Head Dragons redan
existerande permanenta `onWinAreaDebuff`) mjukar upp ALLA fiender
runt den erövrade rutan varje gång han vinner. Rising Vengeance
återanvänder det REDAN BEFINTLIGA `boardUnderdogAttackBonus`-fältet
(redan beprövat på Sylvarion) istället för en ny "räkna
kyrkogården"-mekanik jag först skissade och sedan skrotade --
`state.graveyard` registrerar bara riktiga FÖRSTÖRDA kort (inte
vanliga erövringar) och bara när den valfria Graveyard-regeln är på,
så den hade lästs som 0 i nästan varje riktig match. Special Attack:
Judgment Descent mjukar upp hela brädet -2 denna rond, samma
bräd-täckande mönster som Evil Twist Yin/Yangs Resonance redan
använder.

Samma porträtt+ram-visuella behandling som Dragon (941×1672-porträtt,
delad ramöverlägg, guld/lila-glöd). Ett nytt permanent regressionstest
täcker Reaper's Toll, Rising Vengeance (både med och utan
bräd-underläge, isolerat från den orelaterade `lastStandBonus`-
mekaniken), Judgment Descent, och att kortet bara någonsin dyker upp i
Epic-packet (aldrig Rare, där Dragon bor, eller någon annan nivå,
150 öppnade packet av varje). Hela testsviten grön: **173/173**.

**Fas 39 (uppföljning). Två riktiga live-buggar hittade genom att
användaren testade på riktigt (via ett konsol-fusk som låste upp
korten direkt i väskan, eftersom Campaign+Packs annars hade krävt en
hel replay).** Bekräftar exakt varför "jag vill se resultatet innan vi
jobbar vidare" var rätt instinkt.

1. **Ramen nådde inte kanterna i detaljvyn.** `object-fit:contain`
   (Fas 38s egen fix för att undvika distorsion) höll ramen
   odistorderad men lämnade ett oramat gap upptill/nedtill eftersom
   detaljvyns bildruta (~9:16) är smalare än ramen (5:7) -- `contain`
   krymper ner tills HELA ramen får plats, vilket lämnar tomrum i den
   andra ledden. Bytt till `object-fit:cover` istället: ramen skalas
   upp tills den TÄCKER hela rutan (kapar lite av sido-ornamentet
   istället för att lämna luckor upptill/nedtill) -- användarens egen
   avvägning: "man måste inte se alla detaljer i ramen. Men den ska
   vara runt kortet."
2. **Glöden saknades helt i detaljvyn.** `.card.exclusive-card::before`
   var skrivet med `.card`-prefix, men `renderModal()`s stora
   porträttvy (`.poster-art-full`) är en helt annan div utan `.card`-
   klassen alls -- reglen matchade den aldrig. Tog bort `.card`-
   prefixet (bara `.exclusive-card::before` nu) så samma regel matchar
   båda kontexterna, och lade till `exclusive-card`-klassen på
   `.poster-art-full` när kortet har `exclusiveFrame:true`.

Båda bekräftade med nya skärmdumpar (ramen sluter nu tätt runt hela
bilden, glöden syns runt hela postern). Hela testsviten grön:
**173/173**.

**Fas 40. Tredje pack-exklusiva kortet: Freya, The Blooming Grace
(Legendary).** Användarens lore, verbatim i andemening: hon hjälper
alla, får saker att blomstra så fort hon rör vid något jordligt, en
skönhet utan dess like, och tar hand om en liten kyrka där hon träffat
en kille hon fallit för. En ren support-arketyp — den tredje distinkta
stilen bredvid Dragons precisionsstick och Reapers AOE/comeback.
Blooming Touch buffar det just erövrade kortet permanent (en ny
`onWinBuffLoserPermanent`-krok, den positiva spegelbilden av redan
existerande `onWinDebuffLoserPermanent`), Grace of the Sanctuary är en
helt ny, ovillkorad `allyAuraFlat`-aura för alla ANDRA allierade kort
(ingen tröskel/tak, till skillnad från varje annan aura i filen — "hon
hjälper alla" utan undantag). Special Attack: Sanctuary's Blessing
buffar hela din sida +2 denna rond.

**Samtidigt: en viktig arkitekturändring.** ChatGPT började leverera
ramen redan monterad på HELA canvasen (inte separat), vilket löser
alla tidigare problem med fel proportion på ett slag. `exclusiveFrame`
och `exclusive-card`-glödet delades upp i två oberoende flaggor:
`exclusiveFrame:true` (separat overlay-bild ovanpå, det gamla sättet)
och `exclusiveGlow:true` (bara glöden, inget extra lager — för kort där
ramen redan sitter i konsten). Dragon och Reaper fick BÅDA sina
porträtt ersatta med nya, korrekt monterade versioner och bytte till
`exclusiveGlow`; deras thumbnails beskars om ("bred beskärning" istället
för djup inzoomning) så att ramens sidokanter syns även i den lilla
kortvyn.

**Fas 41. Fjärde pack-exklusiva kortet: Zidane, The Free-Spirited Blade
(Mystic).** Freyas egen kärlek, per användarens lore ("han vet inte vad
han vill för hans focus är ju att rädda världen, men han är ju
populär"). Dubbla svärd i konsten — en tydlig referens till Final
Fantasy IX:s Zidane (matchar rostrets redan existerande FF-referenser:
Omega Weapon, Chocobo King, Yojimbo), så hans Ultimate heter bokstavligen
Trance efter Zidane Tribals egen signaturförmåga. Ett momentum/combo-kit
som återanvänder TVÅ redan existerande fält (`onWinCappedBoost` --
Vaelira; `adjacentAlliesBoost` -- Bahamut) istället för att uppfinna
nytt. Special Attack: Trance är en ren permanent självbuff (+4), inget
mål att välja.

Fyra kort nu: Dragon (Rare) → Reaper (Epic) → Freya (Legendary) →
Zidane (Mystic), en tydlig tier-stege. Ett femte kort, Ruby (en
summoner som kan tillkalla gudar, och som Zidane själv är intresserad
av — en kärlekstriangel), väntar på sitt porträtt. Nya permanenta
regressionstest för Freya och Zidane täcker alla nya mekaniker och
tier-gatingen. Hela testsviten grön: **175/175**.

**Fas 42. Femte pack-exklusiva kortet: Ruby, The Astral Summoner
(Mystic).** Slutet på kärlekskvadraten: en summoner som kan tillkalla
gudar, och det är hon — inte Freya — som Zidane faktiskt är kär i, per
användarens egna ord. Ett vakt-/beskyddar-kit: Astral Ward (samma
`shield`-primitiv som resten av rostret), Divine Favor
(`vsStrongerTotalPowerBoost`, +3 mot ett starkare mål), och en helt ny
mekanik på användarens direkta specifikation ("om någon gud exempelvis
shiva eller bahamut... är på brädet blir hon superfarlig för dom är
hennes bästa vänner") — Godly Kinship (`allyGodBoost:{amount,max}`):
+2 Kraft för varje EGEN "gud" på brädet (rostrets egna `role`-taggar
"Mythic Card"/"Mystic Card", återanvända direkt via regex istället för
att hårdkoda en id-lista, så alla FRAMTIDA gudomliga kort automatiskt
räknas som hennes vänner också), upp till +6.

**Självfångad bugg innan leverans**: satte först `max:6` och trodde det
begränsade SLUTSUMMAN till +6 — men det här kodbasens etablerade
`{amount,max}`-mönster (bekräftat mot `auraPerPetrifiedEnemy`) begränsar
i själva verket ANTALET kvalificerande föremål, inte slutsumman. Med 4
gudar på brädet gav `max:6` faktiskt +8 (min(4,6)×2), inte +6. Fixat
till `max:3` (3 gudar × 2 = +6, matchar korttextens "upp till +6").
Special Attack: Godsfall är en GARANTERAD fångst (ingen
stat-jämförelse alls, till skillnad från varje annat
enmåls-Special i filen) — bara en Shield stoppar den, samma
"skölden skyddar ändå sin ägare"-regel som Gamblers Ultima. Nytt
permanent regressionstest låser fast både mekaniken och maxtaks-fixen.
Hela testsviten grön: **176/176**.

**Fas 43. Sjätte och sjunde pack-exklusiva korten: Kade (Epic) och
Selene (Legendary) — ett helt nytt kärlekspar, separat från
Freya/Zidane/Ruby-kvadraten.** Användarens egen beskrivning: "ghetto
killen som krigar för en ljus framtid" — en gatuprofet med en
spådomsboll (visar en framtida stad, ett kramande par) och en trogen
hund vid sin sida. Den andra bilden, bara textad "The couple", är den
enda konst vi har av Selene — ingen separat solo-bild ännu, så hennes
full-/thumbnail-konst är beskuren från den delade kramar-bilden (mitt
eget beslut, lätt att byta ut om en solo-bild dyker upp senare).
Bekräftat via `AskUserQuestion`: de två går in som 6:e/7:e
pack-exklusiva kort (inte Rival-exklusiva kort, som fortfarande är en
separat, opåbörjad idé), döpta Kade och Selene efter användarens eget
val mellan förslag.

Bindningsmekaniken återanvänder `pairPresence` rakt av (samma fält som
Darien/Elara, Twin Brothers/Twin Sisters) — "får bonus medan den andra
är någonstans på brädet" ÄR redan spelets egen "par"-mekanik, inget
nytt motorstöd behövdes. Kade (Epic) lutar mot "underdog som slåss för
en bättre morgondag" (återanvänder `boardUnderdogAttackBonus`) plus en
egen Special, Glimpse of Dawn — unik i filen genom att den lyckas på
OAVGJORT (`>=`) istället för att kräva strikt högre Kraft, eftersom
"han redan såg exakt detta ögonblick komma". Selene (Legendary) är den
lugna/skyddande kontrasten: `onWinCleanseAlly` (återanvänt från Elara)
och en Special som ger hela sidan en Shield istället för en
statbuff (Freya äger redan "buffa alla"-formen). Tiers delade isär med
flit (precis som Zidane/Ruby delar Mystic) så att dra det ena aldrig
garanterar det andra.

**Bugg hittad och fixad under eget testskrivande**: `onWinCleanseAlly`
väljer en SLUMPMÄSSIG allierad, och vid den tidpunkten har det nyss
erövrade kortet REDAN flippats till segrarens sida (se
`checkOnWinBonuses`s egen kommentar om detta) — så det finns alltid
minst två kandidater, och vilken som väljs är ett myntkast. Ett första
testförsök antog fel att bara Selene själv kunde väljas och floppade
slumpmässigt; fixat genom att verifiera BÅDA möjliga utfallen istället
för att gissa vilket som händer. Hela testsviten grön: **177/177**.

**Fas 44. Åttonde pack-exklusiva kortet: Vaseir, The Vaultbound
Devourer (Mystic).** Användarens egna ord: en orm som vaktar en skatt
som också heter Vaseir, och "alla som har försökt ta skatten har blivit
mat" — läst rakt av som kortets hela kit. Högsta stat-summan hittills
(40). Tre återanvända fält: `onWinDestroyLoserAlways` (redan beprövat
på Nexzoth — "blir mat" är en DESTROY, inte en vanlig fångst, rutan blir
tom istället för att flippa), `shield:true` (han lämnar aldrig sin
skatt — till skillnad från Nexzoth, som saknar Shield helt), och
`buffOnEnemyDestroyed` (Morvaths eget fält). Special Attack: Swallowed
Whole är en garanterad DESTROY (inte fångst) på ett valt mål, samma
skydds-kedja (`specialBlockedByShield`/`isDestroyImmune`/
`protectedByInfiniteSeraph`) som Rubys Godsfall och Shivas Void-kraft
redan använder.

**En riktig, tidigare dold motor-bugg hittades och fixades under
byggandet**: `onCaptureBonus` (mitt första val för tredje passiven)
tickade aldrig, eftersom det fältet bara appliceras via
flipp-vägen (kollar om rutan fortfarande tillhör segraren EFTER
striden) — men `destroyCard()` nollställer ju rutan, så kontrollen
misslyckas alltid för ett destroy-baserat kit. Bytte till
`buffOnEnemyDestroyed` istället, som är inbyggt direkt i
`destroyCard()` — men DEN hade i sin tur en egen, subtilare bugg:
`destroyCard`s gissning om vem som ska belönas (`beneficiaryOwner`)
baserades på den förstörda rutans `entry.owner`, men vid tiden
`checkOnWinBonuses` anropar den för `onWinDestroyLoserAlways` har den
rutan REDAN flippats till segrarens sida (se `battleNeighbors`) —
gissningen pekade alltså bakvänt, och bonusen gick aldrig till rätt
spelare. Detta har suttit dolt i Nexzoths REDAN LEVERERADE kort ända
sedan Fas 7 (samma kombination av `onWinDestroyLoserAlways` +
`buffOnEnemyDestroyed`), utan att något tidigare test fångade det
eftersom testerna alltid anropat `destroyCard()` direkt istället för
via en riktig vinst-flipp. Fixat genom att låta `destroyCard` acceptera
ett explicit `opts.beneficiaryOwner`, och `onWinDestroyLoserAlways`s
anropsplats skickar nu `winnerEntry.owner` rakt av istället för att
gissa. Nytt regressionstest på Nexzoth-testet (via den riktiga
`resolveFlips`-vägen, inte en bar `destroyCard()`-anrop) låser fast
fixen retroaktivt. Hela testsviten grön: **179/179**.

**Fas 45. Nionde pack-exklusiva kortet: Balalajka, The Coinsong
Trickster (Legendary) — Vaseirs "konstiga bror".** Samma
krönta-orm-på-en-skatthög-silhuett, men han spelar balalajka istället
för att sluka inkräktare — den avsiktligt komiska/charmiga motpolen
till sin brors rena förintelse. Delad isär från Vaseirs Mystic-nivå ner
till Legendary (samma "dra-det-ena-garanterar-inte-det-andra"-princip
som Kade/Selene), på min egen bedömning efter användarens uttryckliga
"Dessa kort finns inte bara i rare. Du bestämmer standaren." Kit:
`pairPresence` mot Vaseir (samma syskon-bindning som Kade/Selene, fast
för ett mycket annorlunda "par"), `onWinDebuffLoserPermanent` (Torns
eget fält — det erövrade kortets vilja bryts permanent av hans hånfulla
sång), och Special Attack: Thieving Serenade — samma
tröskel-+`SpecialVerbs.stealPower`-form som Twisted Gipsys House of
Shadows/Darons Shattered Crown redan använder. Nio pack-exklusiva kort
totalt nu, tre tydliga syskon-/kärlekspar (Freya↔Zidane↔Ruby-triangeln,
Kade↔Selene, Vaseir↔Balalajka). Hela testsviten grön: **179/179**.

**Fas 46. Tionde pack-exklusiva kortet: Faragon, The Falling Half-God
(Mystic) — Dragons FAKTISKA bror.** Användaren skickade en ChatGPT-
skriven lore-sammanfattning av alla karaktärer (se nya avsnitt 11,
"Lore-bibel") med en uttrycklig regel: alla dessa kort ska höra ihop i
EN sammanhängande värld, inte separata one-off-historier. Sammanfattningen
antydde att Dragons bror var densamma som redan levererade Reaper-kortet
— jag frågade direkt via `AskUserQuestion` om Reaper skulle döpas om till
Faragon, och fick svaret "Dom är helt olika personer". Faragon är alltså
ett HELT NYTT tionde kort, inte en omdöpning; Reapers eget kit/lore rörs
inte alls.

Halvgud, slåss från luften, störtar ner som ett gudomligt projektil med
ett enormt lie-liknande lansvapen ("Himlen öppnar sig — och Faragon
faller ner"). Inget porträtt ännu — `CARD_IMAGES`/`FULL_CARD_IMAGES`
lämnades medvetet tomma; `cardFace()`/`renderModal()` faller redan
tillbaka på ren hue-gradient + ikon för alla kort utan bild-entry, så
kortet är fullt spelbart/testbart redan nu och behöver bara bild kopplas
in senare.

Kit: Sundering Descent är en helt ny `ON_PLACE_HANDLERS`-post (en
engångs-nedslagschock på angränsande fiender vid placering, samma form
som Nyxara/Vaelira/Fenrirs egna on-place-effekter — INTE en generisk
`active.*`-aura, eftersom effekten bara triggas EN gång vid placering).
Divine Aegis (`shield`) och Zealous Ascension (`onWinDirectionalBoost`,
fyrar bara på FÖRSTA vinsten) återanvänds rakt av. Special Attack:
Heaven's Fall är en genuint ny form i filen: en PERMANENT (inte
"denna rond") hel-bräde-fiendedebuff, till skillnad från Reapers
Judgment Descent/Evil Twists Yin-Yang Resonance (båda temporära).

**Kodmässig payoff av "en sammanhängande värld"-regeln, inte bara
text**: Faragons `role`-sträng innehåller medvetet "Mystic Card"
(samma tagg rostrets egna gudar som Bahamut/Shiva redan bär), så Rubys
Godly Kinship-mekanik (som läser av exakt den taggen via regex)
räknar nu Faragon som en av hennes gudar automatiskt — precis den typ
av verklig, spelbar koppling mellan kort som "en värld"-regeln efterfrågar,
inte bara en delad bakgrundshistoria. Nytt permanent regressionstest
bekräftar både mekaniken och just den Ruby-kopplingen. Hela testsviten
grön: **180/180**.

**Fas 47/48. Elfte och tolfte pack-exklusiva korten: Bram, "The Last
Toast" (Legendary), och Brommi, "The Little Toast" (Epic) — bröder.**
Den här gången kom korten UTAN någon medföljande lore-text alls, bara
bilderna själva: en berusad kung fu-mästare (酔拳 = "Drunken Fist") som
står över en hel gränd fulla med besegrade fiender och sakekrukor,
med banderoller "飲めば強くなる" ("drick och bli starkare"). Mekaniken
är därför helt min egen tolkning direkt från konsten, inte en
kod-implementation av given text. Bram: Drunken Fortitude
(`onWinCappedBoost`, +1/vinst upp till 3) och Unreadable Technique
(`debuffImmune:true`, filens FÖRSTA användning av det fältet på ett
pack-exklusivt kort). Special Attack: The Last Toast är en ny kombo-form
i filen — vanlig tröskel-fångst (som Twin Brothers/Balalajka) PLUS en
ovillkorad självbuff på lyckad träff (som Zidanes Trance) i SAMMA
Special, ingen annan Special i filen kombinerar båda formerna.

Brommi dök upp strax efter, uttryckligen märkt "弟" (lillebror) på
kortet och med matchande titel/tema ("The Little Toast", "小酔拳" =
"LILLA Drunken Fist") — en bekräftad syskonrelation, inte en gissning.
Samma `pairPresence`-bindning som alla andra syskon-/kärlekspar i filen,
delad till en annan nivå (Epic, bredvid Reaper/Kade) enligt samma
"dra-det-ena-garanterar-inte-det-andra"-princip. Kit: reused
`boardUnderdogAttackBonus` (skiljer honom mekaniskt från Bram, ingen
reskin) och en billigare (cost 2 mot Brams 3) variant av tröskel-fångst
som stjäl Kraft (`stealPower`, Balalajkas egen form) istället för att
självbuffa — en busig lillebrors drag, inte ett avgörande finalslag.

Ingen påtvingad koppling till en befintlig lore-tråd (Dragon/Faragon,
Freya/Zidane/Ruby, Kade/Selene, Vaseir/Balalajka) eftersom inget i
konsten pekade dit — helt okej enligt avsnitt 11:s egen regel, så länge
jag inte hittar på en falsk koppling. Hela testsviten grön: **182/182**.

**Fas 49/50. Trettonde och fjortonde pack-exklusiva korten: Sakura, "The
Drunken Sister" (Rare), och Akari, "The Cruel Drunken Sister" (Mystic) —
Bram/Brommis systrar, alltså en HEL fyra-syskon-familj nu.** Sakura kom
utan text ("elegant, skönhet, sake-tema, samma miljö som bröderna");
jag frågade explicit via `AskUserQuestion` om släktskapet eftersom
kortet saknade Brommis tydliga "弟"-stämpel, och fick "Ja, hon är
Bram/Brommis syster" — bekräftat, inte gissat. Akari kom strax efter med
sin egen bekräftelse rakt i chatten ("Elaka systern") plus sin egen
"悪" (ond)-stämpel på kortet.

**Verklig motorbegränsning hittad och fixad**: `pairPresence` (den
mekanik Brommi ursprungligen använde mot Bram) stödjer bara EN namngiven
partner — otillräckligt för fyra syskon. Lösningen fanns redan i
motorn i en annan form: Vaelira/Seraphine/Nyxaras egen `sisterAura`
({partners:[...], bonusByCount:{1:X,2:Y}}) är EXAKT rätt form för en
skalande syskon-grupp — men själva avläsningen (`sistersPresentCount`)
var hårdkodad till just de tre systrarnas id:n, inte generisk trots att
varje korts egen `partners`-lista redan fanns i datan. Generaliserade
båda läsplatserna (`fullEffectiveValue` OCH dess `staticLiveBonusFor`-
spegelkopia för förhandsvisnings-badgen) till att läsa kortets EGEN
`partners`-lista direkt istället för att anropa den hårdkodade
funktionen — bevisat beteende-identiskt för Vaelira-trion (deras egna
`partners`-listor ÄR redan "de andra två systrarna", exakt vad
funktionen redan beräknade), så ingen regression, bara en riktig
generalisering. `sistersPresentCount`/`SISTER_IDS` självt rördes INTE
(används fortfarande av Vaelira-triones egen "Broken Focus"-svaghet och
`freeIfSistersPresent`, som förblir exklusiva för just de tre).

Bram och Brommi migrerades från Brommis gamla tvåvägs-`pairPresence`
till samma delade `sisterAura` (partners: de tre andra syskonen,
bonusByCount:{1:1,2:2,3:3}) — båda existerande korts test uppdaterades
för den nya skalan (+1 med en syster/bror närvarande, inte +2 som förut).

Sakura (Rare, lättaste nivån, matchar hennes mjukare stöd-arketyp):
Charming Stumble återanvänder `marginShieldThreshold` (Darien/Elara/Twin
Sisters eget fält). Special Sakura's Cup är en tröskel-fångst som ger
HENNE SJÄLV en Shield på lyckad träff, inte en buff eller stöld.

Akari (Mystic, familjens farligaste medlem): Cruel Strike återanvänder
`onWinDebuffLoserPermanent` men på 2 istället för Balalajkas 1. Special
Akari's Wrath är en GARANTERAD destroy (inte fångst) oavsett stats, samma
skydds-kedja som Vaseirs Swallowed Whole/Rubys Godsfall.

Fjorton pack-exklusiva kort totalt nu. Hela testsviten grön: **184/184**.

**54. Tiamat och Three Head Dragon — andra ombyggnaden av två redan
"rena" kort, på användarens egen begäran** ("jag hade velat göra om
tiamat och tree head dragon"), inte från audit-listan (båda var sedan
tidigare bekräftat 100% kod-kopplade). Användaren valde "bådadera" (ny
mekanik OCH ny konst) men bad mig föreslå riktningen ("föreslå åt mig"),
med explicit villkor att behålla grundidentiteten (namn/roll/element
oförändrat). Siffrorna i mitt förslag fick jag också fritt bestämma
("jag vet inte bestäm du snälla").

Båda korten gick igenom EN tidigare stor ombyggnad (se avsnittet om
"Tiamat, The Celestial Judgment, The Infinite Seraph, The Eclipse
Fenrir" ovan/nedan i avsnitt 5) som redan dokumenterade en medveten
kompromiss per kort. Den här omgången löser exakt de två
kompromisserna, med primitiver som inte fanns förra gången:

- **Tiamats Ultimate (The Fivefold Apocalypse)** — de fem "krafterna"
  (Fire/Ice/Storm/Void/Nature) var ren smak, alla fem löste ut
  identiskt (dokumenterad medveten förenkling: en "väntande
  riktningsbonus konsumeras vid nästa attack"-mekanik ansågs för
  riskabel i `fullEffectiveValue`, en känslig, ofta anropad funktion).
  Nu löser alla fem ut OMEDELBART vid aktivering istället för uppskjutet
  till en framtida attack, vilket helt kringgår den risken:
  - 🔥 **Fire** — oförändrad (+5 attack denna strid, +1 alla sidor
    permanent vid vinst).
  - ❄️ **Ice** — inget eget attack-tillägg, istället -3 på MÅLETS
    försvarssida under just den striden. Ingen permanent belöning —
    störst enskild swing, inget kvarstående.
  - ⛈️ **Storm** — +3 attack; vid vinst får varje ÖVRIGT fiendekort
    intill den erövrade rutan -1 Power denna runda (`debuffThisRound`,
    samma sido-räkning som 3HD:s egna Fire's Wrath/`onWinAreaDebuff`,
    men rond-begränsad istället för permanent och bara på detta valda
    kraft, inte varje vinst).
  - 🌀 **Void** — +2 attack; om målets totala Power är 10 eller lägre
    (samma tröskel som Shivas Diamond Storm redan etablerat för sin
    egen temporära "avrätta-svaga-fiender"-mekanik) förstörs det HELT
    (`destroyCard`) istället för att erövras — respekterar
    `isDestroyImmune`/`protectedByInfiniteSeraph` som alla andra
    förstör-vägar.
  - 🌿 **Nature** — +2 attack; vid vinst rensas negativa effekter
    (`captureBonus<0` nollställs, `tempEffects` töms) på HELA Tiamats
    egen sida — samma `onWinCleanseAlly`-mönster som Naline/Elara,
    fast sido-brett istället för en slumpad allierad.

  AI:t kan fortfarande inte klicka choice-popupen (samma begränsning som
  innan) och väljer nu hårdkodat 'fire' — den råaste/mest permanent
  skalande varianten, matchar dess giriga heuristik bäst.

- **Three Head Dragons Poison's Torment** — tidigare flavor-only
  ("motorrisk-kategori som undveks för Tiamats ombyggda ultimate").
  Byggd nu med exakt samma mönster som Ifrits/Seraphines/Tildas
  per-kort-flaggor (satta direkt i `battleNeighbors`, inte ett generellt
  `active`-fält): när 3HD förlorar en strid (som ANFALLARE nyplacerad,
  eller som FÖRSVARARE redan på brädet) taggas VINNAREN med
  `entry.poisonedTorment = true`. Konsumeras överst i nästa
  `battleNeighbors`-anrop för just det kortet: -2 på `placedVal` för
  VARJE granne i den placeringen (matchar "-2 alla sidor under nästa
  ATTACK" ordagrant — en hel placering räknas som en attack-händelse),
  sedan nollställs flaggan en gång, inte per granne. Respekterar
  `debuffImmune` (kollat manuellt vid tagg-sättningen, eftersom detta
  inte går via `SpecialVerbs.debuff`/`debuffThisRound` som annars har
  den kollen inbyggd).

Resten av båda korten (Tiamats tre andra passiv + Queen of Dragons,
3HD:s Three Souls/Ice's Breath/Fire's Wrath/Immortal Chaos) rördes INTE
— redan solida, ingen kompromiss där. Två nya tester (en per kort)
täcker alla fem Tiamat-krafter samt båda Poison's Torment-riktningarna
(anfallare/försvarare) + flagg-konsumtion + `debuffImmune`-respekt.
Fullständig testsvit grön (88 tester).

Ny konst väntar fortfarande — nästa steg är en bildbrief för båda
korten (samma identitet: Tiamat femhövdad drakdrottning/eld, Three Head
Dragon tre huvuden/mystiskt-eld, bara ny pose/kvalitet i poster-stilen
som Ferea/Evil Twist fick), men mekaniken kommer först så att den nya
konsten kan visa de riktiga skill-texterna.

**Uppdatering, samma session: ny konst mottagen för BÅDA korten.** En
helt ny "guldfolierad kortmall"-stil
introducerades den här sessionen (poster med allt inbakat: stats i en
kors-diamant, ability-rutor i 2×2-rutnät, Ultimate-ruta, faktion/
raritet/typ/alignment-fotrad, citat) — ett tydligt snyggare/mer
konsekvent format än den äldre poster-mallen (se Ifrit/Ferea/Evil Twist
ovan), avsett att bli standard för framtida kort. Two bildbrief-utkast
för Tiamat i det nya formatet visade sig ha en sakfelaktig Ultimate-text
(AOE mot alla fiender + flerrundors statuseffekter à la Burn/Freeze/
Stun/Weakness/Poison, som inte finns i motorn alls) — briefen skrevs om
med korrekt mekanik (ETT valt mål, en av fem krafter, alla omedelbara
effekter) innan den skickades vidare.

Three Head Dragons brief hade användaren redan skrivit helt korrekt
själv (all text verifierad ordagrant mot koden innan konsten
godkändes) — ny konst i den nya mallen matchade sedan exakt: stats
10/10/10/8, alla fyra skills (inklusive Giftets Plåga/Poison's Torment,
med EXAKT samma text som redan finns kodad från punkt 54 ovan), Apokalyps-
ultimaten, faktion/raritet/typ/alignment-fotraden. Inga kodändringar
behövdes. Flyttade den nya bilden direkt till standardnamnet
`card-threeheaddragon-full.jpg` (samma fil som redan pekades på, bara
innehållet bytt). Ny beskuren `cards/card-threeheaddragon.jpg` krävde en
helt ny beskärningsberäkning eftersom källbilden denna gång är
1024×1536 (bildgeneratorns egna nativa format, inte projektets
941×1672-standard) — `crop((167,100)-(856,550))`, skalad till 640×418,
vald för att visa alla tre huvuden utan att klippa in för mycket av
titel-texten ovanför eller stat-diamanten nedanför.

**Tiamats konst mottagen direkt efter, i samma session.** Matchade den
omskrivna briefen exakt — alla fyra skills, Ultimate-texten ord för ord
(inklusive alla fem krafternas korrekta mekanik, inget AOE/inga
statuseffekter kvar), "Five Worlds. One Will."-legenden med rätt
färgkodning (röd/blå/guld/lila/grön matchar Fire/Ice/Storm/Void/Nature),
stats 10/9/9/10, citatet, faktion/raritet/typ/alignment-fotraden. Den
begärda blågrå/gunmetal-kroppsfärgen (istället för tidigare svart/röd)
syns tydligt, huvudena behöll sina egna färger som bett. Samma källupplösning
(1024×1536) och samma beskärning (`crop((167,100)-(856,550))` → 640×418)
som Three Head Dragon fungerade rakt av. Inga kodändringar behövdes —
`FULL_CARD_IMAGES`/`CARD_IMAGES` pekade redan på rätt filnamn för båda
korten sedan tidigare sessioner.

Båda korten är nu helt klara: mekanik (punkt 54 ovan) OCH konst, i den
nya guldfolierade mallen som troligen blir standard framåt.

**Bahamut fick också ny konst i samma mall, samma session** — inte en
mekanisk ombyggnad (redan 3/3 skills + Megaflare wired sedan tidigare),
bara en ny bildbrief på användarens begäran ("Kan vi göra bahamut lik
som han är i ff8 men inte copyright"), skriven med generiska
arketyp-beskrivningar (gyllene pansarklädd drakriddare, samurai-
hjälmform, ljusstråle-attack) istället för direkta referenser till
källan. Ny konst matchade all data exakt: stats 10/10/9/9, alla tre
skills, Megaflare, samt de fritt föreslagna faction/rarity/type/
alignment-fälten (Astral Dragons/Legendary/Dragon/Lawful Neutral — dessa
fyra fanns inte i speldatan sedan innan, bara i bildbriefen). Flyttade
fullbilden från den gamla GitHub-UUID-filen
(`BFBF6036-F55F-4B42-BDE8-8715ED5BAAEB.jpg`, borttagen) till
standardnamnet `card-bahamut-full.jpg`. Samma källupplösning
(1024×1536) som Tiamat/Three Head Dragon, men Bahamuts stående
humanoida pose satt lägre i bilden — beskärning `crop((167,150)-(856,600))`
istället för `(167,100)-(856,550)`. Inga övriga kodändringar.

**Öppen tråd, inte påbörjad än:** användaren föreslog en egen
drak-tema campaign-etapp (Tiamat, Bahamut, Three Head Dragon, Ancient
Wyrmking, Ifrit, Tahabata är alla `isDragon`/drak-tema; Kaeldryx är
redan byggd som ren "Dragon Hunter" med `vsTagBonus:{tag:'isDragon'}`).
Medvetet uppskjutet till efter den här ombyggnaden är klar — kräver
egna beslut (var i `CAMPAIGN_STAGES`-listan, vilka fem drakar, vad den
låser upp).

**53. Evil Twist Yang/Yin — sista två korten från 16-korts audit-listan,
båda klara i samma pass.** Trettonde och fjortonde kortet, det sista
paret på listan. Hade redan `active.pairPresence` (Guardian of Balance,
+2 försvar/+1 attack när båda tvillingarna är på brädet) och en
fungerande, `requiresPartner`-skyddad Ultimate (Yang/Yin Resonance,
AOE -2 på alla fiender) wired (2/4 vardera). Stats oförändrade
(Yang 8/8/9/10, Yin 9/10/8/8 — spegelvända par, summa 35 båda). Finns i
både `HEROES` och `FOREST_FOES`, alla ändringar speglade på båda
ställena för båda korten.

- **Bugfix: Yang/Yin Resonance var permanent debuff, korttexten säger
  "-2 Power THIS ROUND".** `SPECIAL_HANDLERS.eviltwistyang`/`eviltwistyin`
  anropade `SpecialVerbs.debuff()` (permanent) istället för
  `SpecialVerbs.debuffThisRound()` (samma rond-begränsade verb Shiva/
  Leviathans egna bräd-breda "this round"-debuffar redan använder). Ingen
  kommentar motiverade det permanenta valet när det skrevs — till skillnad
  från de medvetna "this round → permanent"-förenklingarna som används på
  andra ställen i filens enkel-mål-Ultimate-familj, fanns ingen sådan här.
  Ren bugfix, en rad ändrad per kort.
- **Inner Harmony** — ny `active.neutralizeAttackerBonus:true`. Inkopplad
  direkt i `battleNeighbors`s strid-loop: precis innan utfallet jämförs,
  om försvararens kort har flaggan sätts `placedVal` (angriparens
  effektiva värde) tillbaka till `p.myVal` (angriparens råa bas-värde
  utan bonusar — samma distinktion `bonusFlash`-diffen längre ner redan
  bygger på). Nollställer alltså ALLA angriparens bonusar den striden,
  inte bara en specifik källa.
- **Mind's Balance** — ny `active.mindsBalanceSwap:true`. Samma
  strid-loop, direkt efter Inner Harmony-kollen (så en spegel-match mellan
  de två tvillingarna löser försvararens neutralisering FÖRST, sedan
  angriparens villkorliga swap reagerar på det redan justerade värdet):
  om Evil Twist anfaller och `targetVal > placedVal`, byts de två
  effektiva värdena rakt av.
- **Guardian of Balance/stats** — helt oförändrade, redan fungerande.

**Uppdatering, samma session: ny godkänd konst mottagen och inlagd för
båda korten.** Bildbrief skickades med exakta stats och all skill-text
ordagrant (se ovan) efter att koden blev klar. Ny konst matchade allt
exakt — inga avvikelser den här gången (jfr Ferea/Darien-lärdomen: alltid
specificera exakta stat-siffror i briefen). Ny poster-stil med all
skill-text synlig på kortet (som Ifrit/Ferea/Darien redan har), ersätter
den äldre enkla stilen (bara namn/stats/tagline) som korten hade sedan
tidigare. Flyttade fullbilderna från de gamla GitHub-UUID-filnamnen
(`3978FBE9-47C9-4E71-9348-6D2F4B1E0EDC.jpg` / `6F6FDF5D-77C4-4C60-A6C9-
C3AA29906068.jpg`, borttagna) till standardnamnen `card-eviltwistyang-
full.jpg`/`card-eviltwistyin-full.jpg`. Nya beskurna `cards/card-
eviltwistyang.jpg`/`cards/card-eviltwistyin.jpg` använder samma
crop-bredd/höjd som standardbeskärningen (660×431 → 640×418) men med
y-start flyttad till 100 istället för standardens 300 (kompositionen har
ansiktet högre upp i bilden än de flesta andra korten) för att få med
ansikte + yin-yang-symbolen istället för att klippa av vid axlarna.
Inga kodändringar utöver bildbytet — stats/skill-text i koden matchade
redan konsten exakt.

Inga nya generella primitives — `neutralizeAttackerBonus`/
`mindsBalanceSwap` är nya DATA-nycklar, men själva teknikerna (justera
`placedVal`/`targetVal` direkt i strid-loopen innan utfallet räknas) är
samma mönster som Volcanic Armor (punkt 52 nedan) och Seraphines/Tildas
märkningar redan etablerat. Två nya permanenta tester (en Yang, en Yin)
täcker bugfixen (debuff expires efter rond-klockan) och båda de nya
skillsen. Fullständig testsvit grön (86 tester).

**52. Ifrit — 2 av 4 saknade skills tillagda, 2 medvetet lämnade
olösta** — tolfte kortet från audit-listan. Hade redan
`active.onCaptureBonus:1` (Eternal Inferno) och en fungerande Ultimate
(`SPECIAL_HANDLERS.ifrit`, Hellfire, samma total-power-tröskel-familj
som Sarah/Vayra/Tilda/Tahabata) wired (2/6). Finns i både `HEROES` och
`FOREST_FOES` (som Tahabata, AI-spelbar) — alla ändringar speglade på
båda ställena. Stats 9/10/8/10 = 37, oförändrade.

- **Hellfire Claw** — helt befintligt fält
  `active.oncePerMatchAttackBoost:{amount:2}` (samma som Yojimbo/
  Vorathos/Tahabata), PLUS en ny `active.attackBoostResetsEachRound:true`
  som återställer `oncePerMatchAttackBoostUsed` varje runda i
  `sweepExpiredRoundEffects()` — exakt samma mekanism som Omega Weapons
  `shieldResetsEachRound` redan använder för sin sköld, bara applicerad
  på attack-boost-flaggan istället. Skillnaden mot alla andra
  `oncePerMatchAttackBoost`-kort: Ifrits är "en gång per RUNDA", inte
  "en gång per MATCH".
- **Burning Dominion** — ny `active.adjacentDefeatedByMeBoost:
  {minCount:2, amount:1}`, samma icke-attack-gated adjacency-count-form
  som Medusas `adjacentAlliesBoost`, men filtrerad på en ny
  `entry.defeatedByIfrit`-runtime-flagga istället för bara ägarskap.
  Flaggan sätts hårdkodat (`if(placed.id === 'ifrit') target.
  defeatedByIfrit = true;`) direkt i `battleNeighbors`s per-flip-loop —
  samma plats/anledning som Seraphines `seraphineMarked`/Tildas
  `tildaMarked` (den enda platsen med den levande precis-erövrade
  entryn). Flaggan är en permanent historisk markering (rensas aldrig),
  men aurans andra villkor (`n.owner === owner`) gör att bonusen
  naturligt försvinner om kortet erövras tillbaka. **Medvetet begränsat
  till riktiga strider** — Same/Plus-erövringar (en annan
  fångstmekanism helt, ingen styrke-jämförelse) sätter INTE flaggan,
  matchar "han HAR BESEGRAT" bättre än en bredare tolkning skulle.
- **Rage of the Beast** — ❌ lämnad oimplementerad. Har en olöst
  formuleringsfråga (drabbar det Ifrit SJÄLV blir erövrad, eller när en
  ANNAN erövrad av honom tas tillbaka?) — lämnad olöst tills vidare,
  ingen kod skriven för den.

**Uppdatering, samma session: Volcanic Armor också inkopplad.**
Användaren delegerade beslutet ("kör det på ifrit om du tycker det blir
bra"). Den ursprungliga bedömningen (skulle kräva en helt ny
"försvarare-debuffar-angripare-live"-primitive, samma lucka som
avvisades för Vorathos's Standstill) visade sig vara fel vid närmare
efterforskning: `active.freezeDefenderPenalty` (Three Head Dragon's
Ice's Breath, redan i motorn) är EXAKT den primitiven, fast i motsatt
riktning (anfallare debuffar försvarare). Volcanic Armors behov
(försvarare debuffar anfallare) gick INTE att koppla in på samma ställe
i `fullEffectiveValue` som Ice's Breath, dock — det stället har bara
anfallarens egen `cellIndex`, ingen åtkomst till försvararens levande
entry för att kolla en `Used`-flagga (samma begränsning som redan
dokumenterad för Seraphines/Tildas märkningar). Löst genom att lägga
kollen direkt i `battleNeighbors`, samma ställe/anledning som de
märkningarna: `placedVal` justeras direkt (-1) precis innan
`effOutcome` beräknas, om `target.card.active.volcanicArmorPenalty`
finns, `!target.volcanicArmorUsed`, och en `totalPower`-jämförelse
(samma förenkling `oncePerMatchVsStrongerBoost` redan använder för sitt
eget villkorliga triggervärde) indikerar att Ifrit annars skulle
förlora. Ett riktigt PRIMITIVE-fynd, inte bara en data-nyckel — men
återanvänder `freezeDefenderPenalty`s princip och `oncePerMatchVsStrongerBoost`s
förenkling, bygger inget nytt grundläggande mönster.

Inga nya generella primitives utöver ovanstående — `oncePerMatchAttackBoost`,
`shieldResetsEachRound`-mönstret och adjacency-count-formen fanns alla
redan; `attackBoostResetsEachRound`/`adjacentDefeatedByMeBoost` är bara
nya DATA-nycklar som återanvänder samma befintliga kod-teknik. Nytt
test täcker båda nya skills inklusive rundan-reset-beteendet och att
flagg-sättningen faktiskt sker vid en riktig strid. Fullständig testsvit
grön.

**Uppdatering, samma session: ny godkänd konst mottagen och inlagd.**
Matchade allt exakt — stats 9/10/8/10 (i ett annorlunda 2×2-
diamant-layout runt namnplattan istället för det vanliga kors-mönstret,
men siffrorna stämmer), namn/roll, och alla sex skill-texter (inklusive
de nytillagda Hellfire Claw/Burning Dominion OCH de fortfarande
obyggda Volcanic Armor/Rage of the Beast, som medvetet står kvar på
kortet som flavor). Inga kodändringar. Behöll hans etablerade
demon-identitet (lavaådrad kropp, horn, guldringar) precis som
bildbriefen bad om. Flyttade full-bilden från det gamla
GitHub-UUID-filnamnet (`74768DE6-1C73-4629-935D-6EA018ACBCCD.jpg`,
borttaget) till standardnamnet `card-ifrit-full.jpg`. Ny beskuren
`cards/card-ifrit.jpg` använder samma förhöjda beskärning som de
senaste kortens ((10,60)-(930,660)) för att få med ansikte och horn.

**28. Voidqueen ombyggd och omdöpt till "The Hungering Void"** —
ursprungligen bedömd 🟠 REWORK i auditen enbart för namnkollisionen
("The Void Empress" delades ordagrant med Nyxara — enda konkreta
lore-motsägelsen i hela rostret), men samtidigt felaktigt kallad "100%
wired". Vid närmare granskning: bara Hunger of the Void
(`underdogBonus:3`) och Ultimate Oblivion's Call hade faktisk backing —
Vacuum's Grip, Veil of Emptiness, Dominance och Soul Fuel saknade allt,
trots att de (ovanligt) inte var märkta "(Flavor only)" i koden. Samma
missbedömning som Graff, rättad nu.

Namnbyte (PROPOSAL): **"The Hungering Void"**, härlett direkt från
hennes egen redan existerande skill "Hunger of the Void" — löser
namnkollisionen med Nyxara utan att röra Nyxaras etablerade identitet
alls. Role-undertexten ("Hunger of the Void") oförändrad.

- **Hunger of the Void (Passiv)** — HELT oförändrad (`active.
  underdogBonus:3`, redan fungerande). Text förenklad, samma betydelse.
- **Insatiable (Passiv)** — PROPOSAL, helt befintligt fält: `active.
  onCaptureBonus:1`, samma fält Ifrit/Bahamut/Graff/Vayra redan
  använder.
- **Special Attack: Oblivion's Call** — HELT oförändrad kod (permanent
  `SpecialVerbs.debuff`, inte rond-begränsad). Text rättad från
  "until your next round" till "permanently" för att matcha vad koden
  faktiskt alltid gjort — samma sorts textfix som Little Jesps Guardian's
  Aura fick.

Bort: Vacuum's Grip, Veil of Emptiness, Dominance, Soul Fuel — alla
utan backing.

Ett nytt permanent test i `tests/game.test.mjs` (61 totalt, alla gröna,
grönt på första körningen) verifierar: namnet är ändrat och skiljer sig
nu från Nyxaras, Hunger of the Void och Oblivion's Call oförändrade,
Insatiable ger permanent +1 vid erövring.

**27. Graff ombyggd (The Darkrunner)** — ursprungligen bedömd 🟡 POLISH
i 68-korts-auditen ("bra kit, bara ett namnfel"), men en närmare
läsning av den faktiska korttexten visade att 4 av 5 skills var ren
flavor utan mekanik — samma mönster som de andra REWORK-korten. Kört
som REWORK på användarens begäran, min ursprungliga POLISH-bedömning
var för snäll.

- **Shadowplay (Passiv)** — HELT oförändrad (`active.onCaptureBonus:1`,
  redan fungerande).
- **Behind Enemy Lines (Passiv)** — PROPOSAL, helt befintligt fält:
  `active.adjacentEnemiesBoost:{minCount:2, amount:2}`, samma fält
  Tiamats Five Heads, One Will redan använder.
- **Special Attack: Whirlwind Assault** — namnet rättat (`special.name`
  sa "Shadow Assault", skill-texten sa redan "Whirlwind Assault").
  Mekaniken slogs samman efter en riktig bildkonst-avvikelse: den
  godkända bilden visade en AOE-variant (-2 alla fiender, obstoppbar)
  istället för den ursprungliga singel-målsvarianten (gripa+flippa,
  permanent +3). Användaren valde att **kombinera båda** istället för
  att välja ett: en garanterad AOE-splash (`debuffThisRound`, samma verb
  Shiva/Leviathan/Torn redan använder) träffar alla ÖVRIGA fiender
  ovillkorligt, medan det valda målet behåller den ursprungliga
  gripa-vid-vinst-mekaniken helt orörd (tröskelkoll, sköldkoll, flip,
  permanent +3 via `attackBoost`). Det valda målet exkluderas från
  splashen (det får fångst-eller-inget istället).

Ett nytt permanent test i `tests/game.test.mjs` (60 totalt, alla gröna,
grönt på första körningen) verifierar: Behind Enemy Lines kräver
verkligen 2+ angränsande fiender (inte bara 1), Shadowplay orörd,
splashen träffar övriga fiender även när det valda målet är för starkt
för att gripas, det valda målet dubbel-träffas inte, och den ursprungliga
gripa/permanent-buff-mekaniken fungerar fortfarande mot ett svagare mål.

**26. Torn ombyggd (The Shadowhuntress)** — 🟠 REWORK: 5 skills ren
poesi, bara Ultimate (Lethal Volley) fungerade. Saknade dessutom
`element` helt — ett riktigt datahål, inte bara flavor-only (fixat med
**Earth**, PROPOSAL, fyller tomt fält snarare än ändrar befintlig data).

Medvetet differentierad från Deathblade/Graff/Vayra (redan tre
melee-fokuserade "skugg"-kort med olika mekaniker) genom att luta sig
mot det hon redan hade: Lethal Volley är redan ranged AOE, inte
melee-singel — den enda av de fyra skugg-korten som aldrig går in i
närstrid. Fraktion (PROPOSAL): **The Wild Hunt**, förstärker en redan
etablerad tråd från Pallispell/Sylvarion istället för en fjärde ny
fraktion.

- **Predator's Mark (Passiv)** — PROPOSAL, helt befintligt fält:
  `active.underdogSideBonus:2`, samma fält Umbrael redan använder.
- **Poisoned Edge (Passiv)** — PROPOSAL, helt befintligt fält:
  `active.onWinDebuffLoserPermanent:1`, samma fält Yojimbo redan
  använder.
- **Special Attack: Lethal Volley** — HELT oförändrad kod, bara
  textstädad (borttagen "invented numbers"-not).

Bort: Shadow Blink, Windstep, Silent Arrow — alla flavor-only, och
Windstep/Silent Arrow upprepade idéer Graff/Zaevir redan äger bättre.

Ett nytt permanent test i `tests/game.test.mjs` (59 totalt, alla gröna,
grönt på första körningen) verifierar: nytt element satt, Predator's
Mark bara mot starkare motstående sida, Poisoned Edge permanent -1 efter
en riktig vinst (via `resolveFlips`, inte bara direkt handler-anrop),
och Lethal Volley fortfarande obstoppbar (träffar även sköldade fiender).

**25. Ysara ombyggd (The Timeweaver)** — 🟠 REWORK: tredje "tid"-kortet
i rostret (utöver Vayra/Vorathos) utan egen fraktion, svagast
underbyggd av alla tre — 6 skills, ren poesi, ingen mekanik utöver
Ultimate. Ultimate Eternal Eclipse fungerade redan (samma dolda mönster
som Vayras Eclipse — påhittade siffror, aldrig påhittad funktion) och
lämnades helt orörd, bara textstädad (borttagen "invented numbers"-not).

Medvetet differentierad från BÅDA de andra tidskorten samtidigt:
Vorathos äger redan taktisk tidsmanipulation, Vayra äger redan ordens
blad. Ysara fick INTE en tredje fraktion — hon fick INGEN fraktion
alls, medvetet: **"The Unwoven"**, en siare som inte tillhör någon
orden, vilket är poängen snarare än en brist. Kuriosum upptäckt under
arbetet: hennes gamla skill "Starborn Core" krockade i namn med Astraels
redan existerande riktiga "Starborn"-skill — ännu ett skäl att ta bort
den.

- **Future Sight (Passiv)** — PROPOSAL, men bara ett existerande fält:
  `active.vsStrongerTotalPowerBoost:{amount:3}`, samma fält Yojimbos
  Price of Death redan använder.
- **Paradox Veil (Passiv)** — PROPOSAL, helt befintligt fält:
  `active.debuffImmune:true`, samma fält Omega Weapon/Nexzoth/Fenrir/
  Umbrael redan använder.
- **Special Attack: Eternal Eclipse** — HELT oförändrad kod.

Bort: Time Stop, Temporal Shift, Void Crush, Starborn Core — alla ren
flavor utan substans.

Ett nytt permanent test i `tests/game.test.mjs` (58 totalt, alla gröna
efter en liten egen testbugg — glömde sätta `playerHand`/`enemyHand`
för att undvika att `lastStandBonus()` förorenade jämförelserna, samma
kända fallgrop som flaggats flera gånger tidigare i det här dokumentet,
upptäckt och rättad direkt) verifierar: stats/element orörda, gamla
skölden borta, Future Sight bara mot starkare mål, Paradox Veil
blockerar både `debuff()` och `debuffThisRound()`, och Eternal Eclipse
fortfarande erövrar/buffar exakt som förut.

**24. Vorlix ombyggd (The Horizon Blade)** — 🟠 REWORK, spegelbilden av
Aurelian (punkt 23): samma "Celestial Siblings"-problem (en rad
flavor-prosa, ingen riktig parmekanik), samma lösning i speglad form.

- **Horizon's Reach (Passiv)** — PROPOSAL, samma `active.axisBonus`-fält
  Aurelian fick, bara `dirs:['left','right']` istället för
  `['top','bottom']`. Ingen ny kod — fältet fanns redan från Aurelians
  ombyggnad.
- **Celestial Bond (Passiv)** — PROPOSAL, helt befintligt fält:
  `active.pairPresence:{partner:'aurelian', amount:2}`. Gör relationen
  ömsesidig — nu har BÅDA syskonen bonden (Aurelian fick sin, en-sidig,
  i punkt 23).
- **Special Attack: WorldCleaver** — **HELT oförändrad**, varken text
  eller kod rörd. Viktig medveten asymmetri: när Aurelians Skybreaker
  gjordes generisk (se punkt 23-ändringen samma dag) valde användaren
  uttryckligen att INTE göra samma ändring på WorldCleaver — Vorlix nya
  kortkonst visar fortfarande den ursprungliga axel-specifika texten
  ("+4 Power on Left and Right this attack only... +1 Power on Left and
  Right permanently"), och koden matchade redan den exakt utan någon
  ändring alls. Syskonen har nu olika Ultimate-format (generisk vs
  axel-specifik) — ett medvetet val ("få in båda"), inte en olöst
  inkonsekvens.

Ett nytt permanent test i `tests/game.test.mjs` (57 totalt, alla gröna,
grönt på första körningen) verifierar: stats/element orörda, Horizon's
Reach bara på attack och bara Left/Right, Celestial Bond ger +2 när
Aurelian finns på brädet och 0 annars, och WorldCleaver fortfarande bara
boostar Left/Right (inte alla sidor) permanent vid vinst — till skillnad
från Aurelians nu generiska Skybreaker.

**23. Aurelian ombyggd (The Skyward Spear)** — 🟠 REWORK: tunnaste
kittet av alla "riktiga" legendarer — bara en rad flavor-prosa
("The Celestial Siblings") och en redan fungerande Ultimate (Skybreaker).
Auditen flaggade explicit att "Celestial Siblings" antydde en
parmekanik mot **Vorlix** som aldrig byggdes — jämfört med Twin
Brothers/Sisters som redan har en riktig `pairPresence`.

- **Skyward Reach (Passiv)** — PROPOSAL, en liten ny primitiv:
  `active.axisBonus:{dirs:['top','bottom'], amount:1}`. Naturlig
  generalisering av det äldre `active.bonus:{dir,amount}`-fältet (som
  bara stödjer EN riktning, används av Ragnar/Zaevir/Harpy) till en
  lista av riktningar — samma sorts motiverade lilla utökning som Little
  Jesps `boardLeadBonus.tieOnly`. Ny läsning i `fullEffectiveValue()`,
  attack-only, gated på `edgeKey`.
- **Celestial Bond (Passiv)** — PROPOSAL, helt befintligt fält:
  `active.pairPresence:{partner:'vorlix', amount:2}`, samma fält Twin
  Brothers/Sisters och nu Darien/Elara redan använder. En-sidig i denna
  ändring (Vorlix rörs inte) — kan speglas tillbaka när han får sin egen
  REWORK.
- **Special Attack: Skybreaker** — den godkända kortkonsten visade en
  generisk beskrivning ("+3 denna attack, +1 alla sidor permanent")
  som inte matchade den ursprungliga axel-specifika koden ("+4 Up/Down
  denna attack, +1 Up/Down permanent"). Användaren valde uttryckligen
  att ändra KODEN till bildens version snarare än tvärtom. Ombyggd till
  exakt samma form som Vayras Eclipse/Ysaras Eternal Eclipse
  (total-power-tröskel + `SpecialVerbs.attackBoost` för permanent
  +1 alla sidor) istället för `directionalBoost` — återanvänder ett
  redan tre gånger etablerat mönster snarare än att uppfinna ett fjärde.
  Hans axel-identitet lever kvar i Skyward Reach ovan, orörd.

Ett nytt permanent test i `tests/game.test.mjs` (56 totalt, alla gröna)
verifierar: stats/element orörda, Skyward Reach bara på attack och bara
Up/Down, Celestial Bond ger +2 när Vorlix finns på brädet och 0 annars,
och Skybreaker nu ger ett generiskt +1 på alla sidor (inte bara Up/Down)
och misslyckas mot mål vars totalstyrka överstiger +3-tröskeln.

**22. Vayra ombyggd (The Shadowblade)** — 🟠 REWORK: bär spelets
viktigaste fraktionsnamn (**The Wardens of Time**, redan CANON) men var
mekaniskt tunnast beskriven av alla "riktiga" legendarer — 4 skills var
ren poesi utan mekanik. Ultimate Eclipse fungerade redan (bara påhittade
tal, ingen påhittad FUNKTION) och lämnades därför helt orörd —
REWORK betyder laga glappet, inte bygga om det som redan funkar.

Medvetet differentierad från två håll: **Vorathos** (Order of the
Timekeepers) äger redan "manipulera tid mekaniskt"-nischen fullt
utbyggd, så Vayra fick INTE en till tidsmekanik — hon är ordens blad,
inte dess teoretiker. **Deathblade/Graff/Torn** äger redan "skugg-
lönnmördare"-arketypen mekaniskt, så differentieringen sker främst
visuellt i den godkända kortkonsten (frusna tidssprickor, ekon av sig
själv, klockverks-filigran) snarare än genom en ny mekanisk nisch.

- **Shadow Step (Passiv)** — PROPOSAL, men bara ett existerande fält:
  `active.marginShieldThreshold:2`, samma fält Medusa/Darien/Elara redan
  använder (fjärde kortet nu). Ersätter hennes gamla ovillkorliga
  `active.shield` helt.
- **Silent Strike (Passiv)** — PROPOSAL: `active.onCaptureBonus:1`,
  samma fält Ifrit/Bahamut/Graff/Yojimbo redan använder. Permanent +1
  Power varje gång hon tar ett fiendekort.
- **Special Attack: Eclipse** — HELT oförändrad kod (`SPECIAL_HANDLERS.
  vayra`), bara städad text (borttagen "invented numbers"-dev-not som
  inte längre behövs).

Bort: "Shadow Shell" och "Dagger Dance" — båda upprepade samma
flavor-idé som Shadow Step redan täcker, ingen egen substans.

Ett nytt permanent test i `tests/game.test.mjs` (55 totalt, alla gröna,
grönt på första körningen) verifierar: stats/element orörda, gamla
skölden borta, Shadow Step blockerar margin-2 och debuffar angriparen,
Silent Strike ger permanent +1 vid erövring, och Eclipse fortfarande
erövrar/buffar exakt som förut.

**21. Elara ombyggd (Healer of the Frozen Light)** — 🟠 REWORK: kallades
"Healer" men hade noll läkningsmekanik (starkast identitets-glapp i
rostret), och saknade dessutom Ultimate helt. Speglar Dariens ombyggnad
(punkt 19) rakt av — de är redan CANON-kopplade via `RIVALRY_PAIRS`
("The Shadowarden & the Light's Grace") och får nu en riktig, ömsesidig
`pairPresence`-relation ovanpå den befintliga rivalitetsbonusen.
Medvetet skild från Naline/Zlaizers död-och-återfödelse-nisch: Elara rör
aldrig Graveyard, hennes identitet är skydd/renande för de som redan
står på brädet.

- **Frostbloom (Passiv)** — PROPOSAL, men bara ett existerande fält:
  `active.onWinCleanseAlly:true`, exakt samma som Nalines Healing
  Radiance redan använder. Ersätter hennes gamla vaga `active.shield`
  helt (inte en extra sköld ovanpå — hennes enda kvarvarande försvar är
  Crystal Sanctuary nedan).
- **Crystal Sanctuary (Passiv)** — PROPOSAL: `active.
  marginShieldThreshold:2`, samma fält Medusa och Darien redan använder
  (tredje kortet nu). Fungerar helt oberoende av `active.shield` (verifierat
  i `battleNeighbors()` — `marginBlocked` är en egen OR-gren, kräver inte
  skölden), så ingen sköld behövdes kvar alls.
- **Darien's Grace (Passiv)** — PROPOSAL: `active.pairPresence:
  {partner:'darien', amount:2}`, spegelbilden av Dariens "Elara's Bond"
  från punkt 19. Samma fält, ingen ny kod.
- **Special Attack: Requiem of Light** (2 wins, hennes FÖRSTA Ultimate
  någonsin) — ny `SPECIAL_HANDLERS.elara`. Återanvänder exakt samma
  rensnings-logik som `onWinCleanseAlly` (nolla negativ captureBonus +
  töm tempEffects), applicerad på hela egna sidan istället för ett
  slumpat kort — men bara kort som faktiskt HADE något att rensa får
  +1 Power (skiljer sig medvetet från Frostblooms ovillkorliga +1, för
  att matcha kortets egen text "each one that had negative effects
  cleared").

Ett nytt permanent test i `tests/game.test.mjs` (54 totalt, alla gröna
efter en liten testbugg — jag skrev själv fel förväntat värde, -1
istället för +1, i "cleansed to 0 then +1"-scenariot, upptäckt och
rättat direkt) verifierar: stats/element orörda, gamla skölden borta,
Frostbloom rensar+buffar vid vinst, Crystal Sanctuary blockerar margin-2
och debuffar angriparen, Darien's Grace staplar med rivalitetsbonusen,
och Requiem of Light bara belönar allierade som faktiskt hade något att
läka (fiender och redan friska allierade orörda).

**20. Ferea fullständigt ombyggd (Grand Queen & Enchantress of the North)**
— 🔴 REPLACE: enda kortet i spelet vars Ultimate var 100% flavor-only
("Memory of Her Stolen Scepter" — deckmanipulation finns inte i motorn),
plus en flavor-only Frostmark-stapling i passiverna. Stat-sidorna (kod
hade 10/10/9/9, den godkända bildkonsten visade 10/9/9/10 — mitt eget
missat att specificera exakta siffror i bildbriefen) löstes genom att
låta koden matcha den redan godkända, färdiga bildkonsten snarare än
tvärtom (totalen 38 oförändrad, ingen balanspåverkan — bara en
höger/vänster-omkastning).

- **Frostmark (Passiv)** — PROPOSAL, ny permanent boolean-status
  `entry.frostmarked` (till skillnad från Medusas tidsbegränsade
  `petrifiedUntilTurnCount`), satt i `checkOnWinBonuses()` via ett nytt
  `active.onWinFrostmark`-fält — direkt modellerad på Medusas redan
  existerande Stone Gaze/`onWinPetrify`-mönster.
- **Queen's Blessing (Passiv)** — PROPOSAL, ny `active.
  auraPerFrostmarkedEnemy:{amount:1,max:3}`, exakt samma beräkningsform
  som Medusas redan existerande `auraPerPetrifiedEnemy`, bara kopplad
  till den nya statusen ovan istället.
- **Glacial Barrier (Passiv)** — `active.shield:true`, helt befintligt,
  ingen ny kod.
- **Special Attack: The Frozen Crown** (3 wins, ersätter "Memory of Her
  Stolen Scepter") — ny `SPECIAL_HANDLERS.ferea`. Frostmärker varje
  fiendekort + `debuffThisRound(e,2)` (samma verb som Shiva/Leviathan),
  plus ett permanent self-buff via `attackBoost` som motsvarar antalet
  märkta fiender (cappat +3), låst vid aktivering som alla tidigare
  Ultimates i den här serien.

Ett verkligt städfynd under arbetet, inte relaterat till Ferea: den
GAMLA `SPECIAL_HANDLERS.sylvarion`-funktionen (Tempest Volley) hade
aldrig tagits bort när Sylvarion byggdes om förra punkten — död kod,
harmlös eftersom JS-objektlitteraler låter senare nycklar vinna (den nya
Herald's Gale-funktionen stod redan sist och körde korrekt), men
förvirrande att ha kvar. Borttagen i samma commit.

Ett nytt permanent test i `tests/game.test.mjs` (53 totalt, alla gröna,
grönt på första körningen) verifierar: stats matchar den godkända
bildkonsten, Frostmark sätts permanent vid vinst, Queen's Blessing
skalar per märkt fiende och cappar vid +3, samt The Frozen Crown märker/
debuffar alla fiender och ger korrekt self-buff utan att röra allierade.

**19. Darien ombyggd (The Shadowward)** — ett 🟠 REWORK, inte REPLACE:
grundidentiteten (vakt, skölden, den redan fungerande Ultimaten Shadow
Breaker) behölls, bara de fyra flavor-only-skillsen (Shadow Counter, Void
Step, Last Stand, Legendary Bond) byttes ut. Last Stand var dessutom
redan redundant med den globala `lastStandBonus()`-mekaniken som gäller
alla kort automatiskt. Ny kortkonst godkänd, matchade specen exakt (inga
avvikelser den här gången — lärdom från Ferea-bildbriefen: alltid
specificera exakta stat-siffror i bildbriefen).

- **Dark Aegis** — oförändrad (`active.shield`), bara textfixad till att
  matcha vad koden faktiskt gör.
- **Umbral Ward** — PROPOSAL, men bara ett nytt fält, ingen ny kod:
  `active.marginShieldThreshold:2`, exakt samma fält Medusas Curse of
  the Gorgon redan använder (även attackerar-debuffen vid block ärvs
  gratis, eftersom den logiken redan är generisk sedan Weight of Ages-
  arbetet).
- **Elara's Bond** — PROPOSAL, samma mönster: `active.pairPresence:
  {partner:'elara', amount:2}`, exakt samma fält Little Jesp/Pallispell
  och Twin Brothers/Sisters redan använder. Lägger sig OVANPÅ den redan
  existerande `RIVALRY_PAIRS`-bonusen (+1 vid angränsning, global regel,
  gällde redan innan denna ändring) — två lager av samma relation.
- **Special Attack: Shadow Breaker** — HELT oförändrad kod, bara städad
  text (borttagna dev-kommentarer som redan var inaktuella).

Ett nytt permanent test i `tests/game.test.mjs` (52 totalt, alla gröna,
grönt på första körningen) verifierar: stats/element orörda, Umbral Ward
blockerar margin-2-förluster och debuffar angriparen, margin 3+ flippar
fortfarande normalt, Elara's Bond ger +2 på egen hand och +3 tillsammans
med den befintliga rivalitetsbonusen vid angränsning, samt att Shadow
Breaker fortfarande avrättar/försvagar exakt som förut.

**18. Sylvarion fullständigt ombyggd (Herald of the Wild Hunt)** —
nästa kort ur 68-korts-auditen (🔴 REPLACE): 8 av 9 skills var 100%
flavor-only (energi-resurs, card-draw, osynlighet — inget existerar i
motorn), flest flavor-only-flaggor av alla 68 kort. Ny kortkonst godkänd
(samma Mythic/Legendary-serie). Fraktion **PROPOSAL**: "The Wild Hunt",
byggt på Pallispells redan existerande CANON-roll "Wardens of the Wild
Hunt" — Sylvarion blir härolden/spanaren snarare än ännu en bågskytt
(rostret hade redan gott om ranger-arketyper enligt auditen).

Stats/element oförändrade (10/8/10/9, Wind) — auditen flaggade aldrig
siffrorna som problemet. Ultimate-kostnaden sänkt från 5 wins (högst i
hela rostret, onåbar i praktiken) till 2.

- **Windrush** — `active.flatAttackBonus:2`, samma befintliga fält Shiva/
  Chocobo King/Odin redan använder. Inget nytt.
- **Vanguard of the Hunt** — `active.boardUnderdogAttackBonus:2`, samma
  befintliga fält Fenrir redan använder. Inget nytt.
- **Special Attack: Herald's Gale** (2 wins, ersätter "Tempest Volley") —
  ny `SPECIAL_HANDLERS.sylvarion`-funktion. AOE -2 Power på alla
  fiendekort (`debuffThisRound`, samma verb som Shiva/Leviathan) plus ett
  permanent self-buff via `attackBoost` som motsvarar hur många kort
  färre hans sida kontrollerar just vid aktivering (cappat +3, låst som
  Conquests Witnessed/Scales of Judgment). Ingen ny data-primitiv på
  kortet — bara en handler-funktion som återanvänder samma
  `mine`/`theirs`-avläsning som Vanguard of the Hunt-passiven redan gör.

Tre nya permanenta tester i `tests/game.test.mjs` (51 totalt, alla gröna):
Windrush/Vanguard endast på attack (inte försvar), Vanguard kräver
underläge, Herald's Gale debuffar alla fiender oavsett brädeläge,
self-buff skalar exakt med underskottet, cap vid +3, och låsning vid
aktivering (ombräknas inte live om brädeläget ändras efteråt).

**17. Little Jesp fullständigt ombyggd (Order of the Balance)** — resultatet
av en fullständig 68-korts Tier-audit (🟢 KEEP / 🟡 POLISH / 🟠 REWORK /
🔴 REPLACE, ren PROPOSAL-övning, aldrig sparad i detta dokument) där Little
Jesp landade på 🔴 REPLACE: högst totalstat i hela rostret (44, 10/11/12/11)
men bara 1 av 5 skills faktiskt motorbärd — resten (Balance Mastery, Twin
Dominance, Champion's Command) var ren flavor-text, och statlinjen var
dessutom den MINST jämna i rostret trots att kortet bär namnet "Champion
of Balance". Ny kortkonst godkänd av användaren (samma Mythic/Legendary-
serie som Ancient Wyrmking) väglede den slutliga specen.

Ny design — stats sänkta till **9/9/9/9 = 36** (en bokstavlig, symmetrisk
representation av "Balance" istället för den gamla skeva linjen; en sänkning
från 44, inte en höjning, per explicit instruktion om att inte bara göra
honom starkare):
- **Guardian's Aura** och **Divine Bond** (Pallispell-relationen,
  `pairPresence`) — HELT oförändrade i mekanik. Guardian's Aura-texten
  rättades från "each round" till "once per match" för att matcha vad
  `active.shield` (utan `shieldResetsEachRound`) faktiskt alltid gjort —
  ren textfix, ingen beteendeändring.
- **Even Ground (Passive)** — NY. +2 Power på alla sidor så länge du och
  motståndaren kontrollerar exakt lika många kort på brädet. Implementerad
  som en enda ny valfri flagga (`tieOnly`) på det redan existerande
  `active.boardLeadBonus`-fältet (samma fält Tiamat och The Celestial
  Judgment redan läser i `fullEffectiveValue()`) — inte en ny primitiv,
  bara en tredje jämförelse-gren (`mine === theirs`) bredvid de befintliga
  `>` och `>=`-grenarna. Påverkar inga andra kort (deras objekt saknar
  `tieOnly`).
- **Special Attack: Scales of Judgment** (ersätter "Divine Arrow", kostar
  2 wins) — NY `SPECIAL_HANDLERS.littlejesp`-funktion. Jämför
  `state.wins.blue`/`state.wins.red` (samma delade resurs som redan
  gate:ar varje Ultimate, ingen ny räknare): `gap = |blue-red|`,
  permanent `+max(0, 3-gap)` Power via `SpecialVerbs.attackBoost` (gap 0 →
  +3, gap 3+ → +0), låst vid aktivering som Conquests Witnessed. Sedan får
  VARJE kort på sidan som just nu leder i Wins -1 Power denna runda via
  `SpecialVerbs.debuffThisRound` — medvetet INTE fiende-bara som alla
  andra AOE-debuffar i rostret; om Little Jesps egen sida leder träffas
  hans egen sida, honom själv inräknad (ingen undantags-logik för
  källkortet). Vid exakt oavgjort körs ingen debuff alls.
- Borttagna helt: Balance Mastery, Twin Dominance, Champion's Command
  (100% flavor-only, gav ingen identitet).

En verklig konsekvens upptäckt under testandet, inte en bugg: eftersom
debuff-loopen inte undantar källkortet, äter Little Jesp SJÄLV både
self-buffen och leading-side-debuffen när hans egen sida leder (netto
+1 istället för +2 vid gap 1) — exakt vad kortets egen text säger
("Not even his own side is exempt from his judgment"). Två nya permanenta
tester i `tests/game.test.mjs` (49 totalt, alla gröna) verifierar Even
Ground (tie-only, inte lead-or-tie) och Scales of Judgment (skalning,
cap, låsning vid aktivering, självdebuff vid egen ledning, fiendedebuff
vid fiendens ledning, ingen debuff vid oavgjort).

**16. Ancient Wyrmkings "Ancient Shield" ersatt av "Weight of Ages"** — en
lore-driven omgörning av hans enda passiv (`active.shield` var den mest
generiska mekaniken i hela rostret, delad av ett dussintal kort; hans
egen kortkonst, upptäckt/läst för första gången i den här sessionen,
innehåller redan texten "Time may crumble empires, but I was the mountain
before time began." samt Faction-badge "Dragonkin" och Type-badge
"Warden" — all redan existerande CANON som aldrig lästs in i motorn
förut). Weight of Ages: för varje 2 hela turer (rondklocke-ticks) han
står obruten på SAMMA ruta under SAMMA ägare, +1 till den Power-marginal
en angripare behöver för att flippa honom, cappat vid +2 (kräver 4
ticks). Nollställs omedelbart om ägaren ELLER rutan ändras sedan senaste
kollen (erövring, en positionsbytes-effekt som Deathblades, eller en
färsk placering efter att ha förstörts).

Teknisk lösning, efter en fullständig feasibility-check mot befintlig
kod (inget implementerat förrän användaren godkänt lösningen):
- `battleNeighbors()`s befintliga `marginShieldThreshold`-koll (Medusas
  Curse of the Gorgon) generaliserades till att kombinera ett STATISKT
  hot (Medusas egen konstant) med ett nytt DYNAMISKT tillägg
  (`active.weightOfAges` + `entry.turnsStanding`, cappat +2) — två
  oberoende fält som samexisterar utan att påverka varandra. Medusas
  attackerar-debuff (`SpecialVerbs.debuffThisRound(placedEntry,1)`) hölls
  medvetet kvar SCOPAD till bara hennes egen `marginShieldThreshold`-fält
  — Weight of Ages höjer bara muren, gör inget annat, exakt som
  kortets egen text säger.
- Räkningen sker i `sweepExpiredRoundEffects()` (kör redan över hela
  brädet vid varenda tursväxling) — jämför en liten sparad ögonblicksbild
  (`entry.turnsStandingOwner`/`turnsStandingCell`) mot nuvarande
  ägare/rutindex; matchar de → +1, annars nollställs räkningen. Undviker
  helt det mycket bredare mönstret `checkSisterFlip` behövde (en
  explicit hake vid ~20 olika `entry.owner = owner`-rader i hela motorn)
  — bara EN plats att underhålla istället.
- En verklig off-by-one hittades under testandet: utan initiering vid
  placering skulle den FÖRSTA tick alltid tolkas som en "mismatch" (från
  `undefined`) och konsumeras på en no-op-reset istället för att räknas
  som "1 hel tur överlevd". Fixat genom att `placeCard()` nu sätter
  `turnsStanding:0, turnsStandingOwner:owner, turnsStandingCell:cellIndex`
  på VARJE ny bricka (harmlöst extra fält för alla andra kort, exakt
  samma mönster som `shieldUsed`/`grantedShield` redan är universella).
- `Conquests Witnessed` (punkt 15) är HELT oförändrad — separat commit,
  separat funktion, ingen delad kod mellan de två.

Nio nya permanenta tester (7 i den nya Weight of Ages-testen + 2
uppdaterade i den befintliga Conquests Witnessed-testen för att spegla
att `active.shield` är borta) i `tests/game.test.mjs`, 47 totalt, alla
gröna. Verifierat: färsk placering har ingen mur (flippas normalt), +1
vid 2 ticks (marginal-1-förlust blockeras, marginal-2 flippar
fortfarande), +2 vid 4 ticks (cap), caps håller vid 6 ticks, ingen
attackerar-debuff läcker in, nollställning vid både erövring och
ren rutförflyttning under samma ägare. Även verifierat manuellt via
riktiga `placeCard()`/`advanceTurn()`-anrop (inte bara direkt
state-injicering) att räknaren ökar korrekt genom det verkliga
spelflödet, inga `pageerror`.

**15. Ancient Wyrmkings första ultimate, "Conquests Witnessed"** — den enda
kvarvarande kortet i hela rostret som saknade en special attack (avsnitt 8
har flaggat det som väntande sedan flera sessioner tillbaka). Byggd efter
tre föreslagna koncept diskuterades i chatt (inga sparade i det här
dokumentet — rena PROPOSAL-diskussioner, aldrig canon förrän kod skrevs);
användaren valde och finjusterade konceptet "räkna befintlig Wins-resurs"
över "räkna kort på brädet"/"räkna Graveyard" som mer träffsäkert för ett
uråldrigt, tålmodigt kort. Mekanik: `state.wins.blue + state.wins.red`
(ingen ny räknare — samma resurs som redan gate:ar varje ultimate i
spelet) ger Ancient Wyrmking +1 Power permanent per 2 sammanlagda Wins,
cappat vid +3, applicerat EN gång vid aktivering (`SpecialVerbs.attackBoost`
— en låst ögonblicksbild, inte en levande formel, så bonusen växer aldrig
efter aktiveringen även om fler Wins ackumuleras senare i matchen). Alla
fiendekort får dessutom -1 Power denna runda (`debuffThisRound`, samma
milda AOE-kontrollnivå som redan finns på flera 37–38-poängskort).
Grundstats (10/8/9/10, `element:'earth'`, `isDragon:true`), den befintliga
engångsskölden och alla andra kort/regler är HELT oförändrade — ren
tillägg av `special`+en ny `SPECIAL_HANDLERS.dragon`-funktion+en ny
`skills`-rad, i båda `HEROES`- och `FOREST_FOES`-kopiorna. Ett nytt
permanent test i `tests/game.test.mjs` (46 totalt, alla gröna) verifierar
0-Wins-fallet (ingen bonus, debuffen appliceras ändå), +2 vid 4 totala
Wins, cap vid +3 även med 20 totala Wins, att bonusen inte räknas om live
efter aktivering, och att endast fiender (inte allierade) debuffas.

**1. En liten motor/kvalitet-lista**, vald av användaren efter att ha bett
om förbättringsförslag:
- ✅ **Rond-räkningssystem** (`state.turnCount`/`sweepExpiredRoundEffects`/
  `SpecialVerbs.debuffThisRound`) — se avsnitt 6. Byggdes mot Tiamats då
  gamla Weakening-effekt, men Tiamat gjordes om totalt strax därefter (se
  punkt 2 nedan) och tappade sin koppling till den — **Three Head Dragons
  Apokalyps-ultimate (tillagd i samma punkt 2) blev den nya, nu levande
  användaren**, så primitiven har alltid haft minst ett skarpt kort som
  faktiskt övar den, aldrig helt orörd i praktiken.
- ✅ **AOE-specialer triggar nu "ERÖVRAD"-bannern** — se avsnitt 6.
- ✅ **Automatiserad testsvit** — `package.json` + `tests/`, se avsnitt 9.

**2. Fem kort fick ny konst OCH en fullständig ombyggnad, från nya
poster-bilder användaren laddade upp DIREKT EFTER motor-listan (inte
begärt i förväg, i två omgångar samma session)** — Tiamat (befintlig, hel
ombyggnad av en redan levande ultimate), samt fyra kort som avsnitt 8 länge
listat som "medvetet hoppade över, inget källtext fanns": **The Celestial
Judgment**, **The Infinite Seraph**, **The Eclipse Fenrir** och **Three
Head Dragon** fick nu sina första riktiga ultimates. Se avsnitt 5 för alla
detaljer (nya delade motor-primitiver: `active.boardLeadBonus`,
`active.debuffImmune`, `active.destroyImmune`, `active.onWinDirectionalBoost`/
`onWinDebuffOnce`/`onWinAreaDebuff`, `active.freezeDefenderPenalty`, samt en
delad `enemiesInDirection()`-helper). **Three Head Dragons Apokalyps är det
första skarpa kortet som faktiskt använder rond-klockan** sedan Tiamats
ombyggnad tog bort dess enda tidigare användare (se punkt 1 ovan) — så
primitiven har nu en levande användare igen. Endast `dragon` återstår nu
från den gamla "inget källtext"-listan.

**3. Fem mindre fixar, direkt från användarens egen speltestning av
Campaign** (mergade):
- ✅ **Campaign-retry behåller nu de fem senast valda korten ikryssade**
  istället för att tvinga ett omval varje försök — se avsnitt 5b.
- ✅ **Stat-siffran `10` visas som `10`, inte `A`** — den gamla
  `num()`-hjälparen (klassisk Triple Triad-konvention) är helt borttagen.
- ✅ **Triple Triad Sisters (Vaelira/Seraphine/Nyxara) är nu spelbara** —
  dupplicerade in i `HEROES`, och etapp 17:s `unlockIds` delar nu ut dem
  som belöning istället för en tom array. Se avsnitt 5:s
  Etapp 17-underrubrik.
- ✅ **"Unlocked so far"-galleriet på etapp 2+ var ihopfällt bakom en
  knapp** — sen HELT BORTTAGET i punkt 4 nedan (blev överflödigt när
  poolen slutade vara begränsad). Om du läser detta i git-historiken:
  funktionen fanns bara i en enda commit innan den togs bort igen.
- ✅ **`Begin Stage N`-knappen flyttad ovanför kortgallret** så den syns
  utan att scrolla — se avsnitt 5b.

**4. Fortsatt speltestning av Campaign gav två till ändringar** (en balans,
en bugg — committade på feature-branchen):
- ✅ **Etapp 2+ spärrar inte längre kortval efter progression** — hela
  `HEROES`-rostret går att välja från etapp 2 och framåt, på användarens
  uttryckliga begäran (`AskUserQuestion` med fyra alternativ, användaren
  valde "ge alla kort direkt"). Se den nya "UPPDATERING"-underrubriken i
  avsnitt 5b för vad som ändrades och (viktigast) vad som INTE ändrades
  (`campaignProgress.unlocked`/etapp-`unlockIds` finns kvar, bara som
  narrativ smak nu, inte en spärr).
- ✅ **Triple Triad Sisters saknade en `CARD_IMAGES`-tumnagel** (bara
  `FULL_CARD_IMAGES` för modalen) sedan de gjordes spelbara — syntes som
  ikon+hue-gradient i hand/bräde/draftrutnät. Beskurna tumnaglar
  genererade från redan sparad konst, se samma underrubrik.

**5. Ett femte, helt NYTT kort** (inte en ombyggnad): **Triune Desire**,
de tre systrarna smälta ihop till en boss, från en ny poster användaren
skickade mitt i speltestningen. Tillfrågad om placering
(`AskUserQuestion`) — valde "spelbart kort också", lät Claude bestämma
resten (ingen ny etapp byggd). Se avsnitt 5:s sista underrubrik, direkt
före avsnitt 5b, för alla detaljer — flest genuint NYA motor-mekanismer
av något enskilt kort hittills (en aura som påverkar ANDRA kort på
brädet, en lag-omfattande vinst-bonus, en förmågespärr via rond-klockan,
en generaliserad `freeIfSistersPresent`-tröskel).

**6. En ny valfri regel: Graveyard**, från användarens eget förslag
("Vi kanske skulle lägga till en graveyard.") följt av ett konkret
kortdesign ("Graveyard Rune") som beskrev exakt beteendet. Byggd som en
femte togglebar regel bredvid Same/Plus/Combo/Elemental — se avsnitt 5:s
sista underrubrik för fullständiga detaljer (ny delad `destroyCard()`-helper,
`state.graveyard`, en 💀-badge + modal i battle-vyn). Vid det här laget bara
ett synligt register — se punkt 7 nedan för när det fick sina första
faktiska läsare.

**7. Fem helt nya bosskort i en enda batch**: Kaeldryx, Nexzoth, Morvath,
Vorgrath, Zalazar — från fem poster-bilder användaren skickade rakt av
("Lite nya kort kommer fler"), inga omgjorda kort den här gången.
FOREST_FOES-only (samma bedömning som Three Head Dragon), delar flera helt
nya generiska motor-primitiver (`vsTagBonus`, `scaleBreaker`,
`weakVsElement`, `buffLockedUntilTurnCount`, `onWinPowerThresholdDestroy`,
`onWinLineDestroy`, `buffOnEnemyDestroyed`, `onWinAllEnemiesDebuffThisRound`,
`onWinReviveFromGraveyard` + delad `reviveFromGraveyard()`,
`debuffImmuneFirstRound`) — och Morvath/Zalazar's återupplivningsförmågor
är **Graveyard-regelns första riktiga läsare**. Hittade och fixade även en
tyst, sedan tidigare befintlig AI-lucka på köpet: fiende-AI:t använde
ALDRIG `targets:'direction'`-ultimates (Naline/Judgment/Seraph/Fenrir) innan
den här sessionen. Se avsnitt 5:s sista underrubrik för fullständiga
detaljer.

**8. Naline ombyggd en andra gång, plus ett nytt kort Umbrael**, skickade
mitt i punkt 7:s test-arbete. Naline (samma id, HEROES-only, kvar som
tidigare) bytte tema helt — nu **det första Light-element-kortet i
rostret** — vilket gjorde alla fem bossarnas tidigare vilande
Light-svagheter (punkt 7) levande på samma gång. Umbrael (nytt,
FOREST_FOES-only, `element:'dark'`) delar nästan samma kit-form som
Nexzoth. Nya delade primitiver: `active.onWinCleanseAlly`,
`SpecialVerbs.buffThisRound` (den positiva motsvarigheten till
`debuffThisRound`), `reviveFromOwnGraveyardAtFixedPower()` (återupplivning
från EGEN graveyard till ett absolut Power-värde, till skillnad från förra
batchens opponent-graveyard-med-avdrag-version), en generaliserad
`isDestroyImmune(entry)` (ersatte alla nio kvarvarande råa
`destroyImmune`-kollar i hela motorn), `protectedBySanctuary` (skriven men
medvetet okopplad — se avsnitt 5), och `active.underdogSideBonus`. Se
avsnitt 5:s allra sista underrubrik för fullständiga detaljer.

**9. Zlaizer, The Redeemer** — nytt kort, skickat direkt efter en fråga om
mobilkompatibilitet (svaret var ja, verifierat med en riktig mobil-
viewport-körning, ingen regression). Gjord spelbar (HEROES+FOREST_FOES,
en egen tolkning eftersom temat är hjälte- inte skurk-kodat, till skillnad
från punkt 7:s bossar). Hans Light of Forgiveness-passiv gör Graveyard-
systemet delvis aktivt även när den globala regeln är AV — första kortet
som gör det. En tredje återupplivningsvariant (`reviveFromOwnGraveyard`,
egen graveyard + Power-avdrag) tillkom. Hittade och fixade också en redan
existerande flaky test i Nalines Healing Radiance-test (inte en ny bugg).
Se avsnitt 5:s allra sista underrubrik.

**10. Balanspass + polering**, svar på "Hur ska vi göra spelet bättre" —
användaren valde balans (1) och polering (3), sköt upp nytt innehåll (2).
En numerisk (inte simulerings-baserad — självspels-simuleringen visade sig
ha en stor, omätbar strukturell bias, se avsnitt 5) genomgång av alla 62
kort hittade ett verkligt mönster: 6 av de 8 senaste bossarna har en
okapad on-win-effekt, tre av dem (Nexzoth/Morvath/Umbrael) kombinerar det
med permanent `debuffImmune` — en snöbolls-risk utan motspel som inte
fanns i rostret innan den här sessionen. Fixat: `onWinLineDestroy`
(Nexzoth/Morvath) spärrad till en gång per match, en MEDVETEN avvikelse
från källtexten (dokumenterat tydligt, går att backa). Polering del 1
(klar): rollnamnet döljs på brädets in-play-kort (för långt för de nyaste
kortens roller, hamnade utanför konstens mörkläggnings-gradient). Polering
del 2 (klar, byggd efter "Kör på det"): en ny delad `flashStatChange()`
inkopplad direkt i `SpecialVerbs`s stat-ändrande metoder ger HELA rostret
(inte bara nya kort) en `+`/`-N Power`-popup per drabbat kort, och nya
`state.destroyGhosts` låter ett förstört kort tona bort synligt istället
för att bara försvinna — båda återanvänder befintliga
1300ms-städnings-timers, ingen ny tajming-mekanik behövdes. Se avsnitt 5:s
allra sista underrubrik för fullständiga detaljer.

**11. Medusa ombyggd till en fullständig ombyggnad** (samma mönster som
Tiamat/Naline: samma `id`/namn, allt annat utbytt), från en ny poster
("Medusa, The Petrified Queen") användaren skickade direkt efter
kortroster-exporten (punkt 10 var redan mergad). **Petrify blir här den
första riktiga mekaniken i spelet** — tidigare bara smak-text på gamla
kort. Ny motor-primitiv: `petrifiedUntilTurnCount` (samma rond-klocka-
konvention som `specialLockedUntilTurnCount`, men ett separat fält
eftersom det är ett läsbart statuskonditions snarare än en påtvingad
förmågespärr — Serpent Queen nedan behöver kunna RÄKNA petrifierade
fiender, inte bara blockera dem), som spärrar `specialUsable()` precis
som de befintliga låsen. Stone Gaze: varje vinst petrifierar förloraren en
rond (ny `onWinPetrify`-gren i `checkOnWinBonuses`, MEDVETET inte
"en gång per match"-cappad som Nexzoth/Morvaths `onWinLineDestroy` —
Petrify saknar deras permanenta `debuffImmune`-kombo som gjorde den
cappningen nödvändig, en ren balansbedömning). Curse of the Gorgon: en ny
marginalbaserad sköld parallellt med den befintliga `isShielded()` —
tillagd direkt i `battleNeighbors` (inte i `isShielded()` själv, som
saknar tillgång till de faktiska stridsvärdena en marginal-jämförelse
kräver) via nya `marginShieldThreshold`/`shieldGrantsBonus`-fält; blockerar
en förlust med liten marginal (≤2) OCH debuffar angriparen, utan att
konsumera Living Statues separata engångssköld. Serpent Queen: ny
`auraPerPetrifiedEnemy`, cappad. Throne of Stone: ny `adjacentAlliesBoost`
(spegelbild av Tiamats `adjacentEnemiesBoost`, men egna allierade och inte
rollspärrad). Gorgon's Dominion (ultimate): petrifierar alla fiender,
debuffar dem, buffar Medusa själv. Element ändrat vatten→sten/jord
(`element:'earth'`) — passar temat bättre, inget i konsten tvingar ett
specifikt val. Faction/Rarity/Type/Alignment-hörnbadges på den nya
posterkonsten är MEDVETET flavor-only, inte inbyggda i motorn — inget
formellt typ/faktion-system finns än (samma gap som diskuterades när
användaren delade sin 8-stegs "balans-plan"-idé, se nedan). Ny
petrifierad-badge (🗿) på brädet. Sex nya permanenta tester i
`tests/game.test.mjs`, alla 39 testerna gröna. Se avsnitt 5:s allra sista
underrubrik för fullständiga detaljer.

**12. Sex helt nya kort i en enda batch**: Shiva, Leviathan, Omega Weapon,
Yojimbo, Chocobo King, Odin — från sex poster-bilder användaren skickade
rakt av (fem i ett meddelande, Odin i ett uppföljande meddelande mitt i
implementationsarbetet), inga omgjorda kort. Alla sex spelbara i BÅDE
`HEROES` och `FOREST_FOES`, samma konvention som varje tidigare batch.
Största nya generiska motor-tillskottet den här sessionen: en delad
`adjacentEntries(cellIndex)`-hjälpfunktion (de faktiska grann-ENTRIES, inte
bara en räkning som `adjacentEnemiesBoost`/`adjacentAlliesBoost` redan
gjorde) samt tio nya `active.*`-primitiver (`flatAttackBonus`,
`adjacentEnemyAuraThisRound`, `vsStrongerTotalPowerBoost`,
`oncePerMatchVsStrongerBoost`, `oncePerMatchAttackBoost`,
`onWinDebuffLoserThisRound`, `onWinDebuffLoserPermanent`,
`onWinRandomAdjacentEnemyDebuffThisRound`, `onCaptureBuffSelfThisRound`/
`onCaptureBuffAdjacentAlliesThisRound`/`onCaptureBuffAllAlliesThisRound`,
`buffOnEnemyDestroyedCapped`, `shieldResetsEachRound`) plus ett nytt
`isBeast`-tagg-mönster (samma form som `isDragon`). Hittade och fixade
även en tyst, sedan tidigare befintlig bugg på köpet: `ELEMENT_ICONS`
saknade `light`/`dark`/`shadow`/`magic` (kort med de elementen visade
bokstavligen texten "undefined" i sin element-badge sedan Naline/Umbrael/
Nexzoth/Morvath fick de elementen tilldelade) — fixat i samma veva som
Shiva fick sitt nya `ice`-element. Se avsnitt 5:s allra sista underrubrik
för fullständiga detaljer per kort. Sex nya permanenta tester i
`tests/game.test.mjs` (ett per kort), 45 tester totalt, alla gröna.

**13. Info-modalens layout** — användaren påpekade att man var tvungen att
scrolla NER FÖRBI kortkonsten för att läsa skillsen efter att ha tryckt på
info-ikonen. Löst med en ren CSS-ändring (ingen HTML/JS-ändring —
`renderModal()`s markup är orörd): på skärmar med tillräckligt om bredd
(`min-width:700px`) blir `.modal-poster` en flex-rad istället för en
vertikal stapel — konsten till vänster (fast bredd 320px), skills-panelen
till höger med sin egen `overflow-y:auto`, så de scrollar oberoende av
varandra. Smala skärmar (mobil) behåller den gamla staplade layouten
oförändrad, eftersom det inte finns plats för två kolumner där. Se
avsnitt 6 för CSS-detaljer.

**14. Rond-klockan breddad från 2 till 4 ticks** — en riktig bugg-rapport,
inte bara en "gör om"-begäran. Användaren visade en skärmdump: Shivas
Diamond Storm hade debuffat fiender -3, men en efterföljande attack
flippade ändå inte de försvagade korten. Grundorsaken: EVERY "denna
runda"-effekt i spelet (`debuffThisRound`/`buffThisRound` samt alla
`...UntilTurnCount = state.turnCount + 2`-beviljanden: Petrify,
specialLocked, buffLocked, destroyImmune, Shivas egna ultimate-flaggor
osv.) varade bara "+2 ticks" — vilket i praktiken betydde "överlever
motståndarens NÄSTA svarsdrag, men är redan borta igen precis när det blir
casterns egen tur igen". För en on-place-passiv (Naline, Tiamat) är detta
sällan ett problem eftersom kortet oftast attackerar direkt. Men för en
board-wide-AOE-ULTIMATE (Shiva, och i praktiken alla sex nya kort från
punkt 12) som INTE alltid kan följas upp med en attack SAMMA tur, betydde
det att man kunde betala 3 Wins för en effekt som sedan aldrig gick att
faktiskt utnyttja. Ursprungligen tillfrågad om detta skulle fixas bara för
Shiva (`AskUserQuestion`, valde till en början "bara Shiva") — men
användaren ändrade sig direkt efteråt ("Men gör så på alla kort som har
den funktionen") till en GLOBAL breddning. Implementerat genom att byta
alla nio hårdkodade `+ 2` till `+ 4` (sed-ersättning, ett enda mönster:
`UntilTurnCount = state.turnCount + 2` → `+ 4`), plus ett nytt valfritt
`roundTicks`-argument (default 4) på `SpecialVerbs.debuffThisRound`/
`buffThisRound` för framtida per-kort-finjustering om det någonsin behövs.
En genuin, avsiktlig BALANSÄNDRING (inte en text-trohets-förenkling) som
påverkar praktiskt taget varje kort i rostret som har någon "denna
runda"-effekt — dokumenterat tydligt i `sweepExpiredRoundEffects()`s
kodkommentar. Sex befintliga tester hade hårdkodade `+2`-antaganden
(två dedikerade "round clock"-enhetstester, Three Head Dragons Apokalyps,
Triune Desires Crimson Allure, Medusas Stone Gaze/ultimate, Shivas eget
Diamond Storm-test, Nalines Divine Touch/Rise Again) — alla uppdaterade
till att verifiera HELA det nya 4-tick-fönstret (inte bara start/slut) och
gröna igen. 45 tester totalt.

Parallellt, öppen tråd men INTE påbörjad: användaren delade en 8-stegs
"balans-plan" (från ChatGPT) för att formalisera Triad Arenas regler
(korttyper, Graveyard/Wins/Ultimate-system, factions, Arena-effekter,
kortbalans) och frågade sedan efter en full kortroster-export (levererad,
se `tests/`-katalogens scratch-skript-mönster) för att skicka till ChatGPT
för bättre kortdesign. Väntar på att användaren återkommer med explicit
riktning innan något av detta påbörjas.

Parallellt, INTE en del av något av ovanstående: användaren nämnde också
att de håller på att göra om 5 andra befintliga kort till bossar
(bekräftat att varken Ferea eller Twisted Gipsy är bland dem). Inget av
det arbetet är påbörjat härifrån — vänta på att användaren skickar
design/bilder för de 5 korten innan något kodas.

Allt ANNAT i det här dokumentet (Campaign, NG+, Triple Triad Sisters, hela
grundmotorn) är sedan tidigare committat OCH mergat till `main`.

Tre spellägen finns sida vid sida (`state.draftMode`): **Random Draft**
(ursprungligt läge, slumpad hand), **Choose Your Five** (välj fritt ur
hela `HEROES`), och **Campaign** (nytt denna session — se avsnitt 5b).
Grundmotorn (placering/flip/Same/Plus/Combo/Elemental, avsnitt 6) är
ORÖRD genom hela sessionen — allt nytt är additiva lager.

**Vad som byggdes den här sessionen, i ordning:**
1. Sylvarion fick sin första ultimate (avsnitt 8, sent i historiken).
2. **Campaign-läge** (avsnitt 5b) — helt nytt tredje spelläge, användarens
   idé: börja med 5 startkort, klättra genom 16 kuraterade etapper, lås
   upp fler kort vid varje vinst, progress sparas i `localStorage`
   (`campaignProgress`, medvetet UTANFÖR `state`).
3. **New Game+** (avsnitt 5b) — kör om samma 16 etapper med `+2 Power`/cykel
   på fiendehänderna (cappat vid 3 cykler), en stopgap tills fler etapper
   byggs.
4. **Etapp 17: The Triple Triad Sisters** (avsnitt 5b) — en dedikerad
   boss-etapp byggd från tre kortdesigner användaren laddade upp
   (Vaelira/Seraphine/Nyxara). Fyra nya, generella motor-tillägg
   (`active.sisterAura`, `checkSisterFlip`/Weakness, `ON_PLACE_HANDLERS`,
   `special.freeIfSistersPresent`) — se avsnitt 5b för fullständiga
   detaljer, det är den mest arkitekturellt intressanta delen av sessionen.
5. En grupp-banner (`sisters-of-fate-banner.jpg`) och en ihopfällbar
   bakgrundshistoria (`SISTER_LORE`, "📖 Read Their Story"-knapp) på
   etapp 17-skärmen, båda från material användaren skickade.
6. En liten UX-fix: `#concede-btn`s text är nu kontextmedveten ("Retreat
   to Camp" i Campaign, annars oförändrat "Forfeit & Redraft").

**Medvetet uppskjutet, diskuterat men inte påbörjat:** multiplayer (se
avsnitt 5b, egen underrubrik) — användaren vill bygga ut spelet mer
(innehåll/balans) innan nätverkskomplexitet läggs till. Ingen kod skriven.

**Ovaliderat, värt att fråga om näst:** NG+-svårighetsgraden (+2/cykel) är
en gissning, aldrig speltestad av en människa — fråga användaren hur det
kändes om de nämner att ha spelat det. Detsamma gäller balansen på The
Triple Triad Sisters (10/9-10/10-tier stats + flera ultimates i en enda
fiendehand är den svåraste etappen i spelet, medvetet, men okänt om det
känns rättvist eller övermäktigt i praktiken).

## 2. Mål och scope

- Bygga vidare på ett befintligt spel: fler legendariska/mystiska kort med
  egen konst, och en riktig **ultimate/specialattack-mekanik** ovanpå den
  ursprungliga grundmotorn.
- **Grundmotorn (placering/flip/Same/Plus/Combo/Elemental) ska förbli orörd.**
  Nya mekaniker byggs som ett additivt lager som aldrig kallas *av*
  grundmotorn, bara kallar *in i* den (t.ex. en specialattack kan flippa en
  bricka, men via sin egen kodväg — inte genom att modifiera `resolveFlips`).
- Snabba, iterativa leveranser. Just nu: direkt merge till `main` efter varje
  färdig funktion (ingen PR-process, användaren vill se ändringar live snabbt).

## 3. Filstruktur

```
index.html          Hela spelet (HTML+CSS+JS). Se avsnitt 5 för arkitektur.
cards/               45 beskurna JPG-thumbnails, "card-<id>.jpg", 640×418.
                     Används i handkort/bräde.
*.jpg (repo-root)    ~50 st. Helbildskonst för korten (941×1672), oftast med
                     GitHub-genererade UUID-filnamn. Mappas i FULL_CARD_IMAGES
                     (visas i kortmodalen när man klickar (i)). Sparas som JPEG
                     (kvalitet 90) — allt är ogenomskinlig konst, ingen alfa
                     behövs, och det sparar ~110MB jämfört med PNG.
card-back-purple.jpg Kortrygg (draghög). card-back.jpg är en äldre röd
                     variant som fortfarande används för motståndarens dolda
                     handkort (.card-back-mini, hårdkodad i CSS).
arena-bg.jpg         Bakgrundsdekor för arenan.
flame-*.png          Blå/röd flamikon vid poängtavlan (score-flame) — PNG
                     eftersom den faktiskt behöver alfa-transparens.
special-badge.png    Ultimate-märket (.special-diamond) — PNG, samma skäl.
conquered-badge.png,  "ERÖVRAD"-bannern (.conquest-banner) som blinkar till
conquered-badge-red.png över brädet vid en erövring — blå version för spelaren,
                     röd för AI:t (state.conquestPopup håller vilken sida,
                     'blue'/'red', och väljer rätt fil). PNG, samma skäl som
                     ovan (verklig alfa-transparens runt konstverket).
rulebook-cover.jpg,   Regelbokens sidor (📖-knapp i mastheaden). En bild per
rulebook-page-*.jpg  sida, listade i JS-arrayen RULEBOOK_PAGES i den ordning
                     de bläddras. Lägg till en ny sida genom att generera en
                     matchande bild och lägga till filnamnet i den arrayen.
ancient-mysteries.mp3 Bakgrundsmusik (loopar), spelas via <audio id="bgm">.
README.md            Minimal, oanvänd för kontext — använd det här dokumentet.
```

## 4. Kortdata — hur ett kort ser ut

Varje kort är ett objekt i arrayen `HEROES` (44 kort — spelarens dragbara pool)
eller `FOREST_FOES` (34 kort — fiendens pool, en delmängd av HEROES + monster).
**Signaturkort med `special` finns identiskt duplicerade i båda arrayerna** —
glöm inte att uppdatera på båda ställena.

```js
{ id:'graff', name:'Graff', role:'The Darkrunner — Legendary Card',
  element:'wind', top:9, right:9, bottom:6, left:8,
  hue:'linear-gradient(...)', accent:'#e0c02f', icon:'🥷',
  active:{ onCaptureBonus:1 },                 // gammalt, enkelt passivt system
  special:{ name:'Shadow Assault', cost:2, once:true, targets:'single' },
  skills:[ {name:'...', desc:'...'}, ... ]     // ren flavor-text i modalen
}
```

- `active` = det **ursprungliga** enkla passiv-systemet (finns bara på vissa
  äldre kort): `shield`, `bonus:{dir,amount}`, `underdogBonus`, `onCaptureBonus`,
  `pairPresence:{partner,...}`. Läses av `fullEffectiveValue`/`isShielded`.
- `special` = **ultimate-metadata** (se avsnitt 5). `targets` är `'single'`
  (välj ett fiendekort), `'aoe'` (löser ut direkt, inget mål), `'element'`
  (öppnar ett elementväljar-popup istället för ett brädmål — se Pallis) eller
  `'direction'` (öppnar en riktningsväljar-popup upp/höger/ner/vänster
  istället för ett brädmål — se Naline).
- `skills` = ren text som visas i kortmodalen. De flesta korten har EN rad som
  börjar med `"Special Attack: <Namn>"` — det är källtexten för `special`.
  Många passiv-/skill-rader är märkta "(Flavor only — not currently wired
  into the battle engine.)" — det betyder exakt vad det står.

## 5. Specialattack-arkitekturen (viktigast att förstå)

**38 av 48 HEROES-kort har en fungerande ultimate just nu** (44
ursprungliga + Vaelira/Seraphine/Nyxara/Triune Desire, alla fyra tillagda i
senare sessioner — se nedan):
Graff, Lyrith, Aurelia, Medusa, Maximus, Twisted Gipsy, Darum, Daron, Ifrit,
Bahamut, Aurelian, Vorlix, Voidqueen, Tahabata, Twin Brothers, Twin Sisters,
Evil Twist Yang, Evil Twist Yin, Pallis, Tiamat, Astrael, Naline, Deathblade,
Vorathos, Vayra, Ysara, Torn, Little Jesp, Pallis & Pell, Darien, Sylvarion,
The Celestial Judgment, The Infinite Seraph, The Eclipse Fenrir (de sista
tre tillkom i samma senare session som gjorde om Tiamat — se avsnitt 5:s
sista underrubrik, direkt före avsnitt 5b), samt **Vaelira, Seraphine,
Nyxara** (gjorda spelbara i en session efter det) och **Triune Desire**
(helt nytt kort, samma session som gjorde dem spelbara). **Three Head
Dragon** fick sin FÖRSTA ultimate i samma batch som Judgment/Seraph/Fenrir
men räknas inte i "38 av 48" ovan — den finns bara i `FOREST_FOES` (ett
rent monster, ingen `HEROES`-dubblett), samma mönster som `dragon`/`ogre`/
`wendigo` m.fl.

**VIKTIGT — den gamla `dariensv`-dubbletten är BORTTAGEN** (kortobjekt,
`CARD_IMAGES`/`FULL_CARD_IMAGES`-rader och bildfilerna själva). Fanns bara i
`HEROES`, refererades ingen annanstans (bekräftat med grep innan borttagning)
— se avsnitt 5 nedan för Dariens uppdatering samma session.

**Little Jesp** (befintligt placeholder-kort, `id:'littlejesp'`) — samma
mönster igen: ny konst + korrigerade stats (`top:10, right:11, bottom:12,
left:11`, "Ultra Legendary"-nivå — gamla 10/10/9/9 var för lågt för den nya
konsten) + ny ultimate "Divine Arrow" (`targets:'single'`, EXPLICIT
oblockerbar — INGEN `specialBlockedByShield`-koll, till skillnad från
nästan alla andra enkelmåls-specials).

Källkortet är det MEST komplexa hittills: en hel "Synergi: Pallis & Pell"-
bonus-mekanik (adjacency-baserade buffar, kedjeattacker, extra
skill-aktiveringar per runda). Viktig upptäckt: **"Pallis & Pell" är EN
BEFINTLIG kort-identitet** (`id:'pallispell'`, redan i `HEROES`), inte två
separata brickor — så alla "är Pallis & Pell placerade..."-villkor är i
praktiken "finns kortet `pallispell` på brädet".

Motorn har redan en passiv-mekanik som nästan matchar: `active.pairPresence`
(se Twin Brothers/Evil Twist) — kollar "finns partner-kortet NÅGONSTANS på
DITT bräde" (inte adjacency) i `fullEffectiveValue` (grundmotor-funktion,
anropas för VARJE styrkejämförelse). Snarare än att lära grundmotorn ett
nytt adjacency-medvetet kodspår (risk mot en känslig, ofta anropad
funktion), återanvändes `pairPresence` rakt av för "Divine Bond" —
**medveten förenkling: "adjacent" → "någonstans på ditt bräde"**. Samma
förenklade regel återanvänds i `SPECIAL_HANDLERS.littlejesp` för
ultimatens permanenta bonus-villkor, så hela kortet är internt konsekvent
(en regel, inte två olika adjacency-tolkningar).

Bortlämnat (flavor-only, dokumenterat i kortets egen text):
`Balance Mastery` (villkorad bonus vid exakt 1-poängs marginal — kräver
jämförelse av den EXAKTA marginalen efter alla bonusar, inget sånt hakas
finns), `Twin Dominance` (kedjeattack efter vinst — samma
"extra-attack-som-utlöser-en-ny-strid"-system som redan saknas för andra
kort), `Champion's Command` (buff-en-annan-allierad-vid-erövring), och
"skills aktiveras en extra gång per runda" (ingen rond-räkning finns,
samma kända begränsning som i avsnitt 7). `Guardian's Aura`s "+3 Power
istället"-bonus vid blockerad förlust bortlämnades likaså (samma
förenkling som Pallis's "Loyal Heart" gör redan — bara själva
sköld-ignoreringen via `active.shield` behölls).

**Ny AI-observation (dokumenterad, inte fixad):** AI:ts generiska
`targets:'single'`-loop filtrerar bort sköldade mål (`if(isShielded(...))
return`) för att inte slösa en engångs-special på ett mål den inte kan
flippa — men Little Jesps ultimate ignorerar sköldar helt, så filtret är
FÖR FÖRSIKTIGT för just henne (kan hoppa över ett giltigt mål). Samma
kategori av "suboptimalt, inte trasigt"-begränsning som den redan kända
temp-bonus-blinda fläcken i avsnitt 5 — ingen egen AI-gren skriven för
detta.

**Samma "gör om befintligt placeholder-kort"-mönster fortsatte med fem till
kort i en efterföljande batch (5 uppladdade bilder samtidigt: 2× Vayra
[samma karaktär, två alternativa exportformat], Ysara, Torn, Darien):**

- **Vayra** (befintlig) — stats råkade redan matcha den nya konsten EXAKT
  (`top:10, right:8, bottom:8, left:9`), ingen ändring behövdes där. Ny
  ultimate "Eclipse", `targets:'single'`, standardmönstret (temp +3 vid
  jämförelse, permanent +1 alla riktningar om attacken vinner — samma form
  som Astrael, men UTAN någon riktningsval-picker eftersom källtexten inte
  nämner en specifik riktning). Källtexten ("She sees every future... writes
  the only ending that remains") ger INGA konkreta siffror alls — +3/+1 är
  påhittat och dokumenterat både i kortets egen skill-text och här.
- **Ysara** (befintlig) — käll-bilden är ett rent "lore poster"-format
  (inga Upp/Höger/Ner/Vänster-diamanter, ingen Faktion/Raritet/Typ/
  Alignment-footer alls, till skillnad från Naline/Deathblade/Vorathos/
  Vayra) — DÄRFÖR behölls hennes BEFINTLIGA stats oförändrade
  (`top:9, right:7, bottom:10, left:8`), ingen ny siffra fanns att hämta.
  Ny ultimate "Eternal Eclipse", exakt samma påhittade temp+3/perm+1-mönster
  som Vayra (källtexten är lika sifferlös).
- **Torn** — HELT NYTT kort, inget existerande placeholder-id matchade.
  Käll-bilden saknar ÄVEN stat-diamanter/element-ikon/faktion-footer (samma
  "lore poster"-format som Ysara) — så `top:9, right:8, bottom:7, left:9`
  är en påhittad Legendary-nivå-uppskattning, inte en avskrift, dokumenterat
  i kortets kommentar. Ultimate "Lethal Volley" är `targets:'aoe'` (samma
  arkitektur som `eviltwistyin`s Yin Resonance, inget nytt behövdes) eftersom
  källtexten explicit säger "devastating against groups" — permanent -2 på
  ALLA fiendekort, siffran påhittad (källan ger ingen).
- **Darien** (befintlig `darien`, INTE `dariensv` — se nedan) — käll-bilden
  är också ett rent lore-poster (RPG-attributstaplar för Strength/Speed/
  Defense/Magic/Willpower/Loyalty, INTE Triad Arena-diamanterna) med EN
  Abilities-lista som nästan exakt matchar hans befintliga skills redan
  (Shadow Slash≈Shadow Counter, Void Step, Dark Aegis, Soul Reaver=ny,
  Final Stand). INGEN Special/Ultimate-sektion finns alls i källan — så
  INGEN ultimate lades till (samma typ av medvetet-hoppat-över som
  celestialjudgment/infiniteseraph/dragon i avsnitt 8 — det är ett
  designbeslut att hitta på en effekt från grunden, inte gjort). Bara
  konst + lätt textrefresh av de 5 befintliga skills.
- **VIKTIGT: det finns TVÅ "Darien"-kort i `HEROES`** — `darien` (water,
  10/10/9/9, refererad av `RIVALRY_PAIRS`) och `dariensv` (fire, 10/8/8/9,
  INTE refererad någon annanstans). Den nya konsten uppdaterades bara på
  `darien` (den som andra system faktiskt pekar på). `dariensv` är
  oanvänd/trolig kvarleva från en tidigare session — rör inte den utan att
  fråga användaren om den ska tas bort eller slås ihop.

**UPPDATERING, senare session — båda öppna Darien-frågorna ovan är lösta:**
Användaren laddade upp EN TREDJE Darien-bild, den här gången i fullt Triad
Arena-diamantformat (till skillnad från RPG-attributstapel-versionen ovan)
OCH med en riktig "Special Attack: Shadow Breaker"-sektion med konkreta
siffror — så till skillnad från förra gången fanns det nu faktiskt en
ultimate att koppla in. `darien` (den riktiga, `RIVALRY_PAIRS`-refererade)
fick ny konst igen (`card-darien-full.jpg` skrevs över, ny beskärning av
`cards/card-darien.jpg`), rollen uppdaterad till "The Shadowwarden" (dubbel-w,
käll-bildens stavning) och alla 4 skills bytta till den nya källans namn/text
(Shadow Counter, Void Step, Dark Aegis, Last Stand — alla flavor-only utom
Dark Aegis vars "ignorera förlusten"-halva redan var kopplad via
`active.shield`, oförändrad). Ett femte skills-block, "Legendary Bond
(Passive)" (+3 alla sidor, extra skill-aktivering per runda, kan-inte-förlora-
mot-lägre-kraft, staplande vinstrid-bonus — allt villkorat på ett obundet
"legendary partner" som aldrig namnges i källan), är ALLTSAMMANS flavor-only
förutom EN detalj: "Specialattack Kan inte Blockeras" — den klausulen
behöver ingen partner, så den kopplades in direkt i Shadow Breaker (ingen
`specialBlockedByShield`-koll).

Ny ultimate **"Shadow Breaker"** (`targets:'single'`, cost 2, standard
enkel-klick-flow, inget nytt UI-lager behövdes): källtexten delar upp i två
grenar baserat på "målets POWER" — "7 eller lägre" → förstör kortet helt,
"8 eller högre" → -3 permanent och förhindra Kortskills nästa runda. **Viktig
upptäckt:** hela kort-rosterns `totalPower` (summan av alla 4 sidor) ligger
mellan 24 och 44 (kollat med ett engångs-skript över hela `HEROES`+
`FOREST_FOES`) — "7 eller lägre" skulle ALDRIG triggas om man läser POWER
som `totalPower` rakt av, vilket gör hela lågkrafts-grenen dödkod och
kortet i praktiken bara en ren -3-debuff. **Medveten omtolkning**: "POWER"
läses istället som målets GENOMSNITTLIGA sida (`totalPower/4`, avrundat) —
det ger ett realistiskt spann på ~6 till ~11 över hela rostret, så båda
grenarna faktiskt kan triggas (svagare kort med totalPower ≤~29 förstörs,
resten får -3). Detta är samma kategori "källans siffror matchar inte
motorns skala"-problem som redan dokumenterats för andra kort, bara med en
tydligare motivering här eftersom det annars hade gjort halva kortet
obrukbart. Höga grenen är en REN debuff (`SpecialVerbs.debuff`, ingen
erövring — källtexten nämner aldrig att Darien tar kontroll över målet).
"Kan inte använda Kortskills nästa runda"-klausulen är bortlämnad (ingen
rond-räkning finns, samma kända begränsning som resten av avsnitt 7).
Testat manuellt (Playwright): svagt mål (avg 1) → kortet försvinner helt
från brädet; starkt mål (avg 10) → stannar fiende-ägt med -3, korrekt i
båda fallen.

`dariensv` (fire, 10/8/8/9, den oanvända dubbletten) är BORTTAGEN helt på
användarens explicita begäran — kortobjektet i `HEROES`, dess rader i
`CARD_IMAGES`/`FULL_CARD_IMAGES`, och båda bildfilerna (helbild + thumbnail)
är alla raderade. Bekräftat med grep innan borttagning att inget annat
system pekade på `dariensv` (den var, som misstänkt, en ren kvarleva).

**Pallis & Pell** (befintligt kort, `id:'pallispell'` — se avsnitt 1150-talet
om varför den redan hade en `pairPresence`-koppling från Little Jesp) fick ny
konst (`card-pallispell-full.jpg` + beskuren `cards/card-pallispell.jpg`,
ersatte en gammal GitHub-UUID-fil) och sin FÖRSTA ultimate, "Hunter's Wrath"
(cost 2, `targets:'aoe'`). Stats (9/9/10/8) råkade redan matcha den nya
konsten exakt (som Vayra), ingen ändring behövdes. Källtexten ("Välj upp
till 2 angränsande fiendekort... Om båda fiendekorten besegras, får Pallis
och Pell +1 Power på alla sidor resten av rundan") kräver ett spelarval av
UPP TILL 2 specifika brädmål — motorn har ingen multi-select-brädklick-flow
(bara `targets:'single'` en klick, `targets:'aoe'`/`'element'`/`'direction'`
inget brädklick alls), så att bygga en riktig 2-väljs-UI hade krävt ett helt
nytt UI-lager. **Medveten förenkling**: återanvänder `targets:'aoe'` (löser
ut direkt, inget brädklick) — `SPECIAL_HANDLERS.pallispell` hittar SJÄLV upp
till 2 angränsande fiendekort automatiskt (fast ordning upp→höger→ner→
vänster, samma rad/kol-grannskaps-mönster som redan finns i
`SPECIAL_HANDLERS.voidqueen`), ingen spelarvalsmöjlighet. Varje hittat mål
prövas som en vanlig styrkejämförelse (`totalPower` rakt av, INGEN
tillfällig attack-bonus uppfunnen den här gången — källtexten antyder ingen,
till skillnad från Vayra/Astrael) + normal sköld-koll
(`specialBlockedByShield`, inget "pierce" nämns i källan). Om BÅDA hittade
målen flippas: permanent +1 alla sidor (`SpecialVerbs.attackBoost`, samma
"denna runda" → "resten av matchen"-förenkling som resten av avsnitt 7).
Kortet finns bara i `HEROES` (inte `FOREST_FOES`) sen tidigare, så AI:t
spelar aldrig detta kort och ingen egen AI-special-gren behövdes.
Testat manuellt (Playwright, direkt state-manipulation): 2/2 flip → bonus,
1/2 flip → ingen bonus, 0 grannar → "no one nearby"-meddelande, allt korrekt.

**Deathblade** och **Vorathos** var redan befintliga placeholder-kort (fanns
i `HEROES` sen tidigare, utan ultimate) — den här sessionen fick båda ny
konst (helbild + beskuren thumbnail, samma namngivningskonvention som
Naline/Astrael: `card-<id>-full.jpg` + `cards/card-<id>.jpg`) och en
fungerande ultimate för första gången, plus (Vorathos) korrigerade stats
för att matcha den nya konsten (gamla `bottom:12` var uppenbarligen ett
datafel — ingen befintlig stjärnformel tillåter så höga tal rimligt).

**Deathblade** — `targets:'single'`, men ENDA kortet hittills med en
positionsbytes-effekt: `SPECIAL_HANDLERS.deathblade` byter plats på
angripare/mål i `state.board` direkt (`state.board[sourceIndex] =
targetEntry; state.board[targetIndex] = srcEntry;`) och ger målet
permanent -2 (`SpecialVerbs.debuff`), oblockerbart, ovillkorligt (ingen
styrkejämförelse — det är inte ett erövringsförsök). Källtextens "win
against 3 cards with 27+ power"-olåsvillkor kräver ny historik-tracking
per kort och är bortlämnat (samma typ av förenkling som Naline).

Ny geometrisk begränsning: Shadow Assault kräver att målet delar rad eller
kolumn med Deathblade ("i en rak linje"). Ny delad helper `sharesLine(a,b)`
(två brädindex, `0-8`) används på TVÅ ställen: `resolveSpecialTarget`
(en ogiltig klick ignoreras tyst — `specialMode` förblir aktivt för ett
nytt försök, avbryter INTE som vid fel ägare) och `boardCellHtml`s
`specialTargetable`-beräkning (så ogiltiga rutor inte ens highlightas).

**VIKTIG BUGG hittad och fixad SAMTIDIGT (inte bara ett Naline-problem):**
`enemyTryUseSpecial`s generiska fallback-loop antog ett enkelt brädmål utan
extra val — för `targets:'element'` (Pallis) och `targets:'direction'`
(Naline) KRASCHADE den (löste ut med `element`/`direction` = `undefined`).
Detta fanns redan för Pallis sedan tidigare i sessionen, exponerades bara
nu. Fixat med en guard: `if(c.special.targets === 'element' ||
c.special.targets === 'direction') continue;` — AI:t använder alltså INTE
Pallis eller Naline ultimates, men kraschar inte längre.

**Vorathos** — `targets:'single'`, standardmönstret (temp +4 vid jämförelse,
permanent +1 på VALD riktning om attacken vinner — se Astrael), men med ett
EXTRA tvåstegs-val precis som Tiamat: efter brädmålet öppnas
`DIRECTION_CHOICES`-choice-pickern (samma lista som Naline) för att välja
VILKEN riktning som får den permanenta bonusen. `resolveSpecialTarget`
special-casar `card.id==='vorathos'` (håller `targetIndex`, byter till
choice-läge) precis som för Tiamat — se den funktionen om ett tredje kort
någonsin behöver samma tvåstegsflöde. AI:t bypassar choice-pickern och
väljer alltid riktning `'up'` (godtyckligt, matchar Tiamats fasta
`'dominance'`-val).

**Deathblade och Vorathos AI-status:** Deathblade har en EGEN dedikerad
AI-gren (linje-begränsad måls sökning, ingen styrkejämförelse eftersom
effekten är ovillkorlig) — fungerar. Vorathos har också en egen gren
(bypassar choice-pickern som Tiamat) — fungerar. Båda floden är alltså
FULLT AI-användbara, till skillnad från Pallis/Naline.

**Astrael** (`astrael`) är ett helt nytt kort, inte en tidigare oanvänd
signatur — lagt till komplett: full-art (`card-astrael-full.jpg`, beskuren
thumbnail `cards/card-astrael.jpg`), 8/8/8/8-stats (ger automatiskt 4
stjärnor via `cardLevel`s summeringsformel, ingen manuell inställning),
inget element, i BÅDA `HEROES` och `FOREST_FOES`. Passiv "Starborn" är en
ny `active`-nyckel, `onPlaceBoost:N` — kollas direkt i `placeCard` (inte via
`fullEffectiveValue` som de äldre passiv-typerna) och ger +N permanent på en
slumpad sida i samma ögonblick kortet läggs, INNAN den placeringens egna
flip-jämförelser räknas ut. Ultimate "Falling Stars" är standardmönstret
(se nedan) med en tillfällig +5 som bara räknas med i just den attackens
jämförelse (aldrig sparad på kortet om den missar).

**Naline** (`naline`) är EN OMGJORD signatur — hela kortet (konst, roll,
stats, skills, ultimate) byttes ut på användarens begäran samma session som
Astrael lades till. Gamla helbildsfilen (en GitHub-UUID-fil) togs bort helt
(grep bekräftade att inget annat kort refererade den) och ersattes av
`card-naline-full.jpg` + beskuren `cards/card-naline.jpg`. Stats gick från
10/9/8/8 (oförändrat) men rollen fick tillägget "— Order of the Radiance"
och `skills` skrevs om helt på engelska för att matcha det nya kortets
egen text (Lightning Blades/Blink/Ambush/Radiant Strike). `active`
(`bonus:{dir:'top',amount:1}`) och `element:'wind'` behölls oförändrade —
båda stämmer fortfarande med både gamla och nya korttexten.

Ny ultimate **"Thunderstorm Assault"** introducerar `targets:'direction'`:
en fjärde variant av choice-picker-mönstret (se Kärnbegrepp nedan), separat
från Pallis element-väljare. Källtexten hade ett "LIGHT-affinitet"-tröskel-
villkor och en klausul om att kedja in en uppföljande Ambush-attack — inget
av det går att koppla in utan att hitta på nya system, så det är medvetet
bortlämnat (dokumenterat i kortets egen skill-text också). Implementationen:
välj en riktning (upp/höger/ner/vänster) → alla fiendekort i den riktningens
rad/kolumn räknat från Naline (INTE hela raden/kolumnen — bara cellerna
strikt i den valda riktningen) får permanent -3 (`SpecialVerbs.debuff`),
oblockerbart (samma stil som `eviltwistyin`s Yin Resonance — ingen
sköld-koll för rena debuffs, bara för erövringsförsök).

**Bugg hittad och fixad under samma jobb:** `enemyTryUseSpecial`s generiska
fallback-loop (`targets` annat än `'aoe'` och ingen egen `if(c.entry.card.id
=== ...)`-gren) antog implicit ett enkelt brädmål utan extra val — den
anropade `executeSpecial` + `resolveSpecialTarget` rakt av, vilket för
`targets:'element'`/`'direction'`-kort öppnar en choice-picker men sedan
löser ut med `element`/`direction` = `undefined`, vilket KRASCHAR
(`SPECIAL_HANDLERS.pallis`/`.naline` läser `element[0]`/`direction[0]` på
`undefined`). Detta var redan trasigt för **Pallis** (fanns sedan tidigare
i sessionen, ingen tidigare AI-branch), inte bara ett nytt Naline-problem —
upptäcktes bara nu eftersom Naline introducerade `'direction'` och triggade
ett test som råkade hitta ett vinnbart mål. Fixat med en enkel guard i
loopen: `if(c.special.targets === 'element' || c.special.targets ===
'direction') continue;` — AI:t använder alltså (fortfarande, som tidigare)
INTE Pallis eller Naline ultimates alls, men kraschar inte längre. Om AI:t
ska kunna använda dem krävs en egen dedikerad gren per kort (som
Voidqueen/Tiamat) som också väljer rätt element/riktning — inte gjort än.

**Kärnbegrepp:**

- **Wins** (`state.wins.blue/red`) — en resurs som ackumuleras (+1 per erövrad
  ruta, hela matchen) och spenderas för att aktivera en ultimate (kostar 2–3
  wins, en gång per kort och match).
- **Tur-modell**: en tur = EN kortplacering + valfritt antal specialattacker,
  i **valfri ordning** (placera-sen-blasta ELLER blasta-sen-placera, båda
  funkar samma tur). Turen avslutas automatiskt när sidan inte har fler
  möjliga drag (`hasFurtherAction` → `maybeEndTurn` → ev. `advanceTurn`).
  En "End Turn"-knapp låter spelaren avstå frivilligt (`endPlayerTurn`).
- **Diamant-indikator**: varje kort med en outnyttjad ultimate visar en
  diamant (`.special-diamond`) nere till höger — dov/långsam blink när låst
  (inte råd), skarp/kraftig blink när redo. Hela kortet är klickytan när
  redo (inte bara diamanten — den har `pointer-events:none`).

**Kod-flöde för en specialattack:**
`executeSpecial(sourceIndex)` → (om `targets:'single'`) väntar på klick på en
fiendruta → `resolveSpecialTarget(targetIndex)` → `runSpecialResolution(...)`
→ slår upp `SPECIAL_HANDLERS[card.id]`, drar wins, markerar `specialUsed`,
kör handlern, anropar `maybeEndTurn`.

Kort som behöver EN EXTRA fråga utöver (eller istället för) ett brädmål —
Pallis (`targets:'element'`, inget brädmål alls) och Tiamat (brädmål OCH ett
av fem "powers") — går via `state.specialMode.choices` (en lista
`{value,icon,label}`) som `renderChoicePicker()` ritar upp som en popup, och
`resolveSpecialChoice(value)` som slutför anropet till
`runSpecialResolution(sourceIndex, targetIndex, extra)` (tredje argumentet
sprids in i handler-objektet, t.ex. `{element}` eller `{power}`). Tiamat är
specialfallet: `resolveSpecialTarget` kollar `card.id==='tiamat'` och byter
till choice-läge istället för att lösa ut direkt efter ett brädmål — se den
funktionen om ett till kort någonsin behöver samma tvåstegsflöde. AI:t kan
inte rita/klicka en popup, så `enemyTryUseSpecial` special-casar Tiamat och
anropar `runSpecialResolution` direkt med `{power:'dominance'}`.

**Delat verb-bibliotek** (`SpecialVerbs`) — de flesta korten byggs av dessa:
- `attackBoost(entry, amount)` — +N på alla fyra sidor, permanent.
- `directionalBoost(entry, sides, amount)` — +N bara på angivna sidor (t.ex.
  `['top','bottom']`), lagras i `entry.sideBonus` (separat fält från
  `captureBonus`, båda läses av `fullEffectiveValue`/`totalPower`).
- `stealPower(source, target, amount)` — flyttar kraft från mål till attacker.
- `debuff(entry, amount)` — ren försvagning, inget till attackeraren.
- `grantShield(entry)` — engångssköld (delar mekanik med `active.shield`).
- `extraTurn(owner)` — nästa `advanceTurn` ger samma sida en ny tur (och en
  ny placering — `placedThisTurn` nollställs).

**Standardmönster för enkelmåls-attacker** (kopiera detta för nya kort):
```
basePower = totalPower(attacker)          // se totalPower(): summa av 4 sidor
                                            // + captureBonus*4 + sideBonus
targetPower = totalPower(target)
if basePower + TEMP_BOOST <= targetPower → "repelled"-meddelande, inget mer
else om specialBlockedByShield(target) → sköld håller (konsumeras)
  ("pierce"-kort som Lyrith/Bahamut/Twins hoppar över detta — deras
   flavor-text säger explicit att de ignorerar försvar)
else → target.owner = attacker; target.justFlipped = true;
       SpecialVerbs.xxx(...) för permanent belöning
```

**`requiresPartner`** i `special`-metadata (Evil Twist Yang ↔ Yin, kräver
varandra på brädet) gör kortet olåsbart förrän partnern finns på brädet —
kollas centralt av `specialUsable(card, owner)`, som är EN funktion som styr
allt: diamant-läge, `executeSpecial`, AI:t, `hasFurtherAction`. Ändra bara här
om reglerna för "kan aktiveras" ska ändras.

**AI:t** (`enemyTryUseSpecial`, anropas från `enemyTurn`) använder som grund
en generisk girig heuristik: leta upp ett vinnbart mål (styrkejämförelse)
eller aktivera AOE alltid om en fiende finns. Kort vars mekanik inte passar
den heuristiken (den bryr sig bara om styrkejämförelse) får sin egen
`if(c.entry.card.id === '<id>')`-gren FÖRE den generiska loopen: Voidqueen
(målar den blå-ägda rutan med flest blå grannar, inte den "vinnbaraste"),
Tiamat (bypassar choice-pickern helt — se nedan, hennes fem "krafter" är
numera bara smak, så AI:t skickar in ett godtyckligt värde). Lägg nya
undantag här om ett framtida kort inte är en ren "vinn styrkejämförelsen,
flippa"-attack.

**Känd — inte ny — svaghet i samma heuristik:** förfiltreringen jämför
`totalPower(attacker)` RÅTT, utan att räkna in kortets egen tillfälliga
attack-bonus (Ifrit/Bahamut/Twins +3, Darum/Daron/Maximus +4,
Aurelian/Vorlix/**Astrael** +4/+4/+5). AI:t missar därför mål där bonusen
hade avgjort matchen (t.ex. Astrael mot ett mål med råstyrka 33-36 — hon
klarar det med sin +5 men filtreringen ser bara hennes 32 och hoppar över
det). Fungerar fint mot allt den redan slår utan bonusen. Detta fanns redan
innan Astrael — hon exponerar det bara igen. Skulle behöva en
per-kort-bonustabell i förfiltreringen om det ska fixas ordentligt.

### Tiamat, The Celestial Judgment, The Infinite Seraph, The Eclipse Fenrir — en ombyggnads-batch från fyra nya poster-bilder

Användaren laddade upp fyra nya, kompletta kortdesigner (samma "poster med
allt inbakat"-format som Triple Triad Sisters/Vayra/Ysara/Darien) direkt
efter motor/kvalitet-listan (avsnitt 1b) — inte efterfrågat, bara skickat.
Tre av dem (**The Celestial Judgment**, **The Infinite Seraph**, **The
Eclipse Fenrir**) var sedan tidigare explicit dokumenterade i avsnitt 8 som
"medvetet hoppade över — inget källtext fanns, kräver ett designbeslut".
Nu fanns källtext, så alla tre fick sin FÖRSTA riktiga ultimate. Den
fjärde, **Tiamat**, hade redan en fungerande ultimate (byggd tidigt i
projektet, senast utökad SAMMA session med rond-klockan) — den nya bilden
ersätter den HELT, konst och mekanik, på samma "senaste källan är
auktoritativ"-princip som redan etablerats för Darien (tre uppladdningar
över tid, senaste vinner).

**Konst**: alla fyra är 941×1672 (standardformat). Fullbilder sparade som
`card-<id>-full.jpg` (bytte namnkonvention bort från de gamla GitHub-UUID-
filnamnen, bekräftat med grep innan borttagning att ingen annat pekade på
dem, samma process som `dariensv`-städningen). Thumbnails krävde en högre
`y`-startpunkt än standardbeskärningen (`crop(140,300)-(800,731)`) för tre
av de fyra — ansiktena satt högre upp i kompositionen än på tidigare kort:
Infinite Seraph/Fenrir landade bra på `y=90`, Celestial Judgment på `y=60`.
Tiamat (fem drakhuvuden i en klunga längre ner i bilden) fungerade med
standardbeskärningen oförändrad.

**Nya delade motor-primitiver** (inga grundmotor-funktioner ändrade, bara
nya valfria `active`-nycklar lästa av `fullEffectiveValue`/`battleNeighbors`/
`SpecialVerbs`, samma additiva mönster som `pairPresence`/`sisterAura`):

- **`active.boardLeadBonus:{amount, orEqual}`** — live i `fullEffectiveValue`,
  jämför antal rutor på brädet (`state.board.filter(...).length`), ingen
  sparad state. `orEqual:false` = "fler än", `orEqual:true` = "lika många
  eller fler". Används av Tiamats Apocalyptic Retribution (strikt) och The
  Celestial Judgments Balance (orEqual).
- **`active.boardUnderdogAttackBonus:N`** — samma bräd-räkning men omvänt
  villkor (ägaren har FÄRRE rutor än motståndaren) och bara när
  `role==='attack'`. Används av Fenrirs Nordic Wrath.
- **`active.adjacentEnemiesBoost:{minCount, amount}`** — live i
  `fullEffectiveValue`, bara `role==='attack'`: räknar fiendekort
  ortogonalt intill kortets EGEN cell (samma räkne-mönster som redan fanns
  i `isShielded`s `conditionalShield`). Används av Tiamats Five Heads, One
  Will — källtextens "+1 på riktningen i HENNES NÄSTA ATTACK" är medvetet
  omtolkat till "+1 varje gång villkoret gäller under en attack" (ingen
  sparad "väntande bonus"-flagga), enklare och funktionellt likvärdigt så
  länge Tiamat inte gör flera attacker mellan att villkoret blir sant och
  falskt.
- **`active.onWinDirectionalBoost:N`** / **`active.onWinDebuffOnce:N`** — ny
  funktion `checkOnWinBonuses(winnerEntry, myEdge, loserEntry)`, anropad
  direkt efter `checkSisterFlip(target)` i `battleNeighbors` (samma
  infogningspunkt, samma "additiv sopning in i grundmotorn"-princip).
  `onWinDirectionalBoost` ger permanent +N på den vinnande sidan, en gång
  per match (`entry.onWinDirectionalBoostUsed`-flagga) — Tiamats Queen of
  Dragons och Fenrirs Moon's Shadow. `onWinDebuffOnce` ger permanent -N till
  FÖRLORAREN istället, en gång per match (första vinsten, oavsett sida) —
  The Celestial Judgments Judgment Strike. Gäller bara riktiga strider
  (`battleNeighbors`), INTE Same/Plus-erövringar (de går aldrig via en
  faktisk styrkejämförelse mot det placerade kortet).
- **`active.debuffImmune:true`** — kollas överst i BÅDA
  `SpecialVerbs.debuff`/`debuffThisRound` (en guard, inte per anropsställe,
  eftersom båda verben per konvention ALDRIG anropas på kastarens eget
  kort). Fenrirs Eternal Loyalty — han är nu bokstavligen immun mot varje
  debuff-baserad special i spelet, inklusive framtida.
- **`enemiesInDirection(index, direction, owner)`** — Nalines
  linjesöknings-logik (upp/höger/ner/vänster, strikt bortom `index`, inte
  hela raden/kolumnen) bröts ut till en delad funktion (Naline själv
  omfaktoriserad till att använda den) eftersom fyra till specialer nu
  behöver exakt samma sak. Returnerar `{index, entry}`-par (inte bara
  entries) eftersom Judgments erövringsgren behöver index för att kunna
  `state.board[i] = null`.
- **`protectedByInfiniteSeraph(owner)`** — kollar om `owner` har
  `infiniteseraph` på sin sida av brädet. Anropas direkt i de tre handlers
  som faktiskt förstör/byter kort (`vaelira`, `nyxara`, `deathblade`) — inte
  en generell spärr i grundmotorn, bara ett tidigt-return i just de
  handlarna. Se Infinite Seraph nedan.

**Tiamat** (`top:10, right:9, bottom:10, left:9`, oförändrat) — helt ny
`skills`-text och ultimate. De fyra passiva/skill-effekterna:
- Fivefold Catastrophe (placeras → +2 på en riktning resten av matchen) —
  återanvänder BEFINTLIGA `active.onPlaceBoost` (samma mekanik som
  Astraels Starborn) rakt av, bara `2` istället för Astraels amount.
  Källtexten låter spelaren VÄLJA riktning; ingen sådan UI finns vid
  kortplacering, så precis som Astrael blir det slumpad riktning istället.
- Queen of Dragons → `active.onWinDirectionalBoost:1` (ny primitiv, se ovan).
- Apocalyptic Retribution → `active.boardLeadBonus:{amount:1,orEqual:false}`.
- Five Heads, One Will → `active.adjacentEnemiesBoost:{minCount:2,amount:1}`.

Ultimaten **"The Fivefold Apocalypse"** i den nya källan är en HELT annan
struktur än den gamla (som hade fem MEKANISKT OLIKA val: Attack/Defense/
Breakthrough/Weakening/Dominance — se den gamla texten i git-historiken om
den behövs). Nya texten: "Choose one of the five powers: Fire, Ice, Storm,
Void, Nature. Next attack gets +5 Power on the chosen direction; if Tiamat
wins, +1 all sides permanently" — ger INGEN mekanisk skillnad mellan de
fem krafterna den här gången (bara namn/smak), och "nästa attack på VALD
RIKTNING" hade krävt en helt ny "väntande riktningsbonus konsumeras vid
nästa träff på den sidan"-mekanik i `fullEffectiveValue` (en känslig,
extremt ofta anropad funktion — risk att bygga en mutation in i en
funktion som annars är ren/side-effect-fri, som även anropas av
förhandsgranskning/highlight-kod, inte bara riktiga strider). **Medveten
förenkling**: `SPECIAL_HANDLERS.tiamat` byggdes om till motorns
STANDARDMÖNSTER för enkelmålsattacker (temp +5 vid jämförelsen, permanent
+1 alla sidor vid vinst — se Astrael/Vayra), samma tvåstegs mål-sen-val-
flöde behålls (`TIAMAT_POWER_CHOICES` bytt till Fire/Ice/Storm/Void/Nature-
etiketter) men alla fem val löser ut IDENTISKT. AI:t bypassar fortfarande
choice-pickern (kan inte klicka en popup) och skickar in ett godtyckligt
`power:'fire'` — värdet läses inte längre av handlern alls.

**VIKTIGT — rond-klocka-kopplingen försvann:** Tiamats Weakening (byggd
med `SpecialVerbs.debuffThisRound` tidigare SAMMA session, se avsnitt 6)
fanns bara i den GAMLA ultimate-strukturen och är borta i den nya. Rond-
klockans motorkod (`state.turnCount`/`sweepExpiredRoundEffects`) rördes
INTE och fungerar fortfarande identiskt (verifierat med samma tester, nu
kopplade direkt mot `SpecialVerbs.debuffThisRound` istället för via ett
kort) — men har just nu inget skarpt kort som använder den. Nästa kort med
en riktig "denna runda"-effekt i sin källtext kan återanvända den direkt.

**The Celestial Judgment** (`role` fick tillägget "— Voice of the Eternal
Order", stats `top:9, right:10, bottom:9, left:10`, ändrat från de gamla
placeholder-siffrorna `10/10/8/9`) — första ultimate. Fyra av fem
skills/passiv kopplades in:
- Judgment Strike → `active.onWinDebuffOnce:1`.
- Balance → `active.boardLeadBonus:{amount:1,orEqual:true}`.
- Divine Judgment (placerings-riktning + villkorad debuff-vid-vinst på just
  den riktningen) — **flavor only**, medvetet hoppad över: hade krävt en
  sparad per-kort "vald riktning vid placering"-flagga PLUS en till
  variant av `checkOnWinBonuses` som bara triggar på en specifik sida
  istället för "vinnarens använda sida" — mer maskineri än det här kortets
  fjärde effekt motiverar, särskilt när Judgment Strike + Ultimate redan
  täcker kortets kärnidentitet.
- Heavenly Aegis (förlust med marginal ≤3 blir oavgjort istället) —
  **flavor only**, samma skäl som alltid: motorn har bara vinst/förlust per
  ruta, inget oavgjort-utfall existerar där.

Ultimate **"Eternal Verdict"** (`targets:'direction'`, kostnad 2): väljer
en riktning, alla fiendekort i linjen (via `enemiesInDirection`) får
permanent -1 alla sidor — ELLER förstörs helt om deras stat-värde på just
den valda riktningen (`top`/`right`/`bottom`/`left`, samma bokstavliga
tolkning som Vorathos redan använder för sin riktningsväljare) är 3 eller
lägre. "Power på riktningen" läses som MÅLETS EGNA stat-siffra i den
riktningen (inte kanten som pekar mot Judgment) — en tolkning, dokumenterad
i koden. Ovillkorlig, ingen sköld-koll (samma stil som Naline/eviltwistyin).

**The Infinite Seraph** (`role` fick "— The Keeper of All Possibilities",
stats `top:9, right:10, bottom:9, left:10`, ändrat från `10/9/10/8`) —
första ultimate. Eternal Presence-passivet (global "inga kort kan tas bort/
förstöras/bytas av motståndarens effekter") implementerades GENOM att lägga
en tidig-return-koll (`protectedByInfiniteSeraph`, se ovan) direkt i de
enda tre handlers som faktiskt förstör eller byter kort:
`SPECIAL_HANDLERS.vaelira`/`.nyxara` (båda förstör HELA fiendesidan —
blockeras helt, inget förstörs, eget meddelande) och `.deathblade`
(positionsbyte — blockeras om MÅLETS ägare har en Seraph, inget byte sker).
Tolkat som "skyddar HELA sidan hon står på", inte bara henne själv — matchar
källtextens "no cardS can be removed" (plural). De tre återstående
skills (Cosmic Insight, Infinite Paths, Omniscient Aegis) är alla **flavor
only** (hand-peek/kort-lås, fri omplacering-utanför-Special-flow,
oavgjort-vid-förlust — samma redan etablerade kategorier av saknade system:
inget fog-of-war, ingen fristående reposition-trigger, inget oavgjort-per-
ruta-utfall).

Ultimate **"All Possibilities"** (`targets:'direction'`, kostnad 2): rakt av
samma mönster som Naline (permanent -1 alla sidor till hela linjen,
ovillkorligt) — källtextens avslutande "dra ett kort" är bortlämnat (inget
däck/dragnings-system finns, samma standardförenkling som överallt annars).

**The Eclipse Fenrir** (stats `top:9, right:10, bottom:9, left:10`, bara
`right` ändrad från `9`) — första ultimate. Gamla `active:{onCaptureBonus:1}`
("Hunt of the Eclipse: +1 Power vid erövring") togs BORT helt — den nya
källan listar inte den förmågan alls bland sina fyra skills, så den är inte
längre en del av kortet (samma "ny källa är auktoritativ, inte additiv"-
princip som resten av batchen). Fyra effekter:
- Nordic Wrath → `active.boardUnderdogAttackBonus:2` (den GAMLA flavor-
  texten råkade redan beskriva exakt samma mekanik ordagrant — enda skillet
  i hela batchen där gammal och ny text redan stämde överens innan kodning).
- Moon's Shadow → `active.onWinDirectionalBoost:1` (delad primitiv med
  Tiamats Queen of Dragons).
- Eternal Loyalty → `active.debuffImmune:true`.
- Fenrir's Curse (motståndaren får ingen bonus-effekt av att vinna mot
  Fenrir) — **flavor only**: hade krävt att VARJE nuvarande och framtida
  on-win-bonus (onWinDirectionalBoost, onWinDebuffOnce, onCaptureBonus,
  Sister-mekaniker, m.fl.) kollade "var motståndaren Fenrir" — för skört
  att underhålla generiskt för en enda korts räkning.
- **Hunt of the Eclipse döptes om till en on-place-passiv** (namnet
  återanvänt från den gamla förmågan, men helt ny effekt): placeras Fenrir
  → slumpad riktning (samma "ingen platserings-val-UI finns"-förenkling som
  Tiamats Fivefold Catastrophe) → alla fiendekort i linjen (via
  `enemiesInDirection`) får permanent -1 alla sidor. Ny
  `ON_PLACE_HANDLERS.fenrir`-gren; `ON_PLACE_HANDLERS`-anropet i
  `placeCard` utökades med ett tredje `cellIndex`-argument (tidigare bara
  `entry, owner`) eftersom det här är första on-place-handlern som behöver
  veta VAR kortet lades för att kunna räkna en riktningslinje.

Ultimate **"Ragnarök"** (`targets:'direction'`, kostnad 2): samma
raka linje-debuff-mönster som Judgment/Seraph men -2 istället för -1.
Källtextens extra klausul ("Fenrir +2 alla sidor under DENNA attack, +1
till om han vinner") är bortlämnad — en AOE-riktningsspecial utan brädmål
har ingen enskild vinst/förlust-jämförelse att haka en sådan bonus på,
samma kategori av drop som Nalines LIGHT-tröskel.

**AI-status**: alla tre nya `targets:'direction'`-ultimates (Judgment,
Seraph, Fenrir) omfattas av samma BEFINTLIGA guard i `enemyTryUseSpecial`
som redan blockerar Naline (`if(c.special.targets === 'element' ||
c.special.targets === 'direction') continue;`) — AI:t använder alltså
ALDRIG dessa tre ultimates, kraschar inte heller. Samma kända, redan
dokumenterade begränsning, inget nytt att fixa.

**Testat**: en fristående Playwright-svit (state-injicering, kastad efter
sessionen — själva täckningen flyttades in i `tests/game.test.mjs`, se
avsnitt 9) verifierade varje ny primitiv isolerat (boardLeadBonus strikt
vs. orEqual, adjacentEnemiesBoost roll-spärrat till attack, debuffImmune
mot både `debuff`/`debuffThisRound`, Judgments förstör-vs-debuff-gren med
en påhittad svag/stark testkort, Seraphs blockering med/utan henne
närvarande) PLUS en fullständig AI-mot-spelare-match med alla fyra nya kort
tvingade in i båda händerna samtidigt (`state.playerHand`/`enemyHand`
manuellt satta före start) — inga `pageerror`, alla fyra korts nya `active`-
hakar syntes trigga i `captureBonus`-värdena på slutbrädet. `npm test`
(den permanenta sviten) uppdaterades med sex nya tester och två omskrivna
(rond-klockans tester pekade om till att anropa `SpecialVerbs.debuffThisRound`
direkt istället för via Tiamat, se avsnitt 9) — alla 12 tester gröna.

### Three Head Dragon — samma batch, skickad direkt efter (femte kortet)

Bekräftar samma mönster: bara i `FOREST_FOES` (rent monster, ingen
`HEROES`-dubblett). Gammal `role` ("Legendary Cosmic Card — The Trinity of
Oblivion") och gammal `active:{shield:true}` (Trinity Bastion) TOGS BORT —
den nya källan kallar kortet bara "Mystiskt Kort" och listar ingen
"överlev första förlusten"-passiv alls bland sina fyra skills, så precis
som Fenrirs borttagna Hunt of the Eclipse-bonus är det inte längre en del
av kortet (ny källa = auktoritativ, inte additiv till den gamla).
Stats `top:10, right:10, bottom:8, left:10` (bytte `right`/`bottom` från
`8`/`9`). Konst: samma 941×1672-standardformat, denna gång fungerade
STANDARDBESKÄRNINGEN direkt (dragontrion sitter längre ner i bilden,
som Tiamats fem huvuden) — inget `y`-justeringsbehov den här gången.

**Tre NYA delade primitiver** (utöver de från Tiamat/Judgment/Seraph/Fenrir
ovan, samma additiva mönster):

- **`active.freezeDefenderPenalty:N`** — läst i `fullEffectiveValue`, men
  bara på DEFENDER-anropet (`role==='defense'`) och av `opponentCard.active`
  (INTE kortets eget `active`) — första gången ett korts egen förmåga
  påverkar HUR MOTSTÅNDAREN räknas, inte kortet självt. Respekterar
  försvararens egen `debuffImmune` (samma regel som alla andra debuffs).
  Isens Andtag: -2 på fiendens sida under just den attacken.
- **`active.onWinAreaDebuff:N`** — tredje grenen i `checkOnWinBonuses`
  (utökad med ett fjärde argument, `loserIndex`, så den kan hitta
  FÖRLORARENS grannar) — permanent -1 alla sidor till varje FIENDE
  ortogonalt intill den precis erövrade rutan. Till skillnad från
  `onWinDirectionalBoost`/`onWinDebuffOnce` har den INGEN "en gång per
  match"-spärr (källtexten nämner ingen), så den triggar vid varje vinst.
  Eldens Vrede.
- **`active.destroyImmune:true`** — kollas direkt i de tre
  förstör-handlarna (`vaelira`/`nyxara`: hoppar över just det kortet i sin
  `forEach`-loop, förstör resten som vanligt; `celestialjudgment`: faller
  tillbaka till debuff-grenen istället för att förstöra). Skiljer sig
  medvetet från Infinite Seraphs `protectedByInfiniteSeraph` (som skyddar
  HELA sidan) — detta skyddar bara KORTET SJÄLVT, matchar källtextens
  "Three Head Dragon can never be destroyed" (inte hans lagkamrater).
  Odödlig Kaos.
- **`SpecialVerbs.directionalBoost` respekterar nu också `debuffImmune`**
  när `amount < 0` — behövdes för Three Souls, One Fury (se nedan) som är
  första stället någon debuff appliceras via `directionalBoost` istället
  för `debuff`/`debuffThisRound`. Alla tidigare anrop använde bara
  positiva belopp på kastarens eget kort, så det här är bakåtkompatibelt.

**Fyra skills, tre kopplade:**
- Three Souls, One Fury (placerings-passiv) → ny `ON_PLACE_HANDLERS.threeheaddragon`:
  ALLA fiendekort på HELA brädet (inte bara angränsande — källtexten säger
  bara "alla fiendekort", ingen räckvidds-begränsning som Nalines/Fenrirs
  riktningslinjer) får permanent -1 på sin EGEN svagaste sida (räknat på
  kortets råa tryckta sifra, samma förenkling som Judgments
  facing-side-koll använder).
- Isens Andtag → `active.freezeDefenderPenalty:2`.
- Eldens Vrede → `active.onWinAreaDebuff:1`.
- Giftets Plåga ("vinnaren mot Three Head Dragon får -2 alla sidor under
  sin NÄSTA attack") — **flavor only**, samma riskkategori som blev
  anledningen till att Tiamats gamla ultimate byggdes om: en "väntande
  bonus som konsumeras vid nästa attack" hade krävt en mutation inuti
  `fullEffectiveValue`, en känslig och ofta anropad ren läsfunktion (även
  använd av förhandsgranskningskod, inte bara riktiga strider) — samma
  motivering som redan dokumenterad för Tiamat ovan.
- Odödlig Kaos → `active.destroyImmune:true`.

Ultimate **"Apokalyps"** (`targets:'aoe'`, kostnad 2): källtexten har två
klausuler — "alla fiendekort -3 alla sidor DENNA RUNDA" (kopplad rakt av
via `SpecialVerbs.debuffThisRound`, samma `enemies.forEach`-mönster som
Torn/Sylvarion/Seraphine) och "Three Head Dragon +3 Power på en vald
riktning UNDER DENNA ATTACK" (bortlämnad — en oriktad AOE utan brädmål har
ingen enskild attack att fästa en riktad självbuff på, samma kategori av
drop som Fenrirs Ragnarök-klausul ovan). **Detta är kortet som gör att
rond-klockan (avsnitt 6) äntligen har en skarp användare igen** efter att
Tiamats ombyggnad tog bort dess första.

**AI-status**: `targets:'aoe'` hanteras redan helt generiskt (`executeSpecial`
löser ut direkt, `enemyTryUseSpecial`s AOE-gren aktiverar den automatiskt
om en fiende finns) — inget nytt AI-specialfall behövdes, till skillnad
från de tre `targets:'direction'`-korten ovan.

**Testat**: samma metodik som föregående fyra kort — en fristående
Playwright-svit verifierade varje ny primitiv isolerat (svagaste-sida-
träff med en påhittad asymmetrisk testkort, frysnings-straff med/utan
Fenrirs immunitet, områdesdebuff träffar bara FIENDENS grannar inte
kastarens egna, `destroyImmune` överlever Vaelira men blir debuffad av
Judgment istället för förstörd, ultimatens rond-utgång i två steg) PLUS en
full slumpad match med kortet tvingat in i fiendehanden — inga `pageerror`.
Fem nya tester lades till i `tests/game.test.mjs` (totalt 17, alla gröna).

### Triune Desire — ett femte, senare uppladdat kort: de tre systrarna smälta ihop till en boss

Efter att ha bett om förbättringar och fått campaign-svårighetsfixen (se
avsnitt 5b) skickade användaren ett HELT NYTT kort (inte en ombyggnad av
något befintligt) — "Triune Desire, The Forbidden Union", numrerat "IV" och
märkt "BOSS — TRIPLE TRIAD SISTERS", en fusion av Vaelira/Nyxara/Seraphine
till ett enda ultra-kort. En `AskUserQuestion` ställdes om VAR kortet skulle
höra hemma (ny etapp 18 som sann slutboss / bara ett bonus-superkort i
`FOREST_FOES` / spelbart precis som systrarna) — användaren valde
"Spelbart kort också", och lät sedan Claude bestämma resten (ingen etapp 18
byggd den här gången — bara kortet själv, i båda arrayerna, samma mönster
som systrarna).

**Konst**: samma 941×1672-standardformat, standardbeskärningen
(`y=300`) fungerade direkt (alla tre ansikten synliga, som Tiamat/Three
Head Dragon innan den).

**Stats**: `top:10, right:10, bottom:10, left:10` — det starkaste kortet i
hela rostret rent statistiskt (jämsides med Tiamat/Judgment/Seraph/Fenrir
som alla har minst en 8:a eller 9:a någonstans; Triune Desire har inga
svaga sidor alls). Inget klassiskt element (som systrarna individuellt
har fire/wind/water, har fusionen ingen — matchar att käll-bilden bara
visar de tre systrarnas ikoner tillsammans, ingen egen).

**En genuint ny sorts mekanik krävdes för nästan VARJE förmåga** — mer
nybygge per kort än något tidigare kort i projektet:

- **`entry.specialLockedUntilTurnCount`** (Crimson Allure) — första gången
  rond-klockan (avsnitt 6) används för att LÅSA en förmåga istället för
  att tidsbegränsa en debuff. `specialUsable(card, owner, entry)` fick ett
  NYTT tredje argument (`entry`, tidigare bara `card, owner`) — alla FEM
  anropsställen uppdaterade för att skicka med det. Om låst, kan kortet
  inte använda sin Special Attack förrän låset (`turnCount + 2`, samma
  "genom motståndarens svarsdrag"-fönster som `debuffThisRound`) har gått
  ut. Källtexten låter spelaren VÄLJA vilken fiende som låses;
  förenklat till slumpmässig, samma "ingen platserings-val-UI
  finns"-motivering som Vaelira/Nyxaras egna placerings-effekter.
- **`checkTriuneTeamBoost(owner)`** (Void Embrace) — en HELT NY sorts hook,
  skild från `checkOnWinBonuses`: den senare buffar bara KORTET SOM VANN,
  men Void Embrace ska buffa HELA LAGET närhelst NÅGOT av lagets kort
  vinner en strid. Letar upp en `active.onAnyWinTeamBoost`-bärare
  någonstans på den vinnande sidans bräde (inte nödvändigtvis det kort som
  just vann) och ger +1 alla sidor till VARJE eget kort på brädet, capat
  vid 3 staplingar totalt (räknat på Triune Desires egen `entry.teamBoostStacks`,
  matchar källtextens "(Max +3 Power)"). Anropas i `battleNeighbors` direkt
  efter `checkOnWinBonuses`. "Dra 1 kort" är flavor only som vanligt (inget
  däck-system finns).
- **Divine Temptation (Passive)** — en AURA som påverkar ANDRA kort på
  brädet, inte bara kortet självt (till skillnad från VARJE annan passiv i
  hela spelet hittills, som bara någonsin modifierar sitt eget kort).
  Hårdkodad direkt i `fullEffectiveValue` (samma `card.id`-hårdkodningsstil
  som `protectedByInfiniteSeraph`, inte en generisk `active`-flagga eftersom
  inget annat kort behöver samma form än): om ägaren har en Triune Desire
  på brädet, +1 till alla andra egna kort; om MOTSTÅNDAREN har en, -1 till
  alla fiendekort (respekterar `debuffImmune`, samma regel som alla andra
  debuffar).
- **Sister's Will** — samma `freeIfSistersPresent`-mekanik som Nyxaras
  Sister's Command, men med tröskel 1 istället för 2 (Triune Desire behöver
  bara EN av de tre systrarna, inte båda). `special.freeIfSistersPresent`
  GENERALISERADES från en boolean till ett tröskeltal (`2` för Nyxara, `1`
  för Triune Desire) på båda de ställen som läser den
  (`specialUsable`/`runSpecialResolution`) — Nyxaras befintliga beteende
  verifierat oförändrat med ett eget test. Källtexten säger bokstavligen
  att kortet kan "placeras" utan Wins-krav, vilket skulle betyda en helt ny
  "kostar Wins att PLACERA (inte bara att aktivera ultimaten)"-mekanik utan
  motsvarighet någon annanstans i spelet — **medveten omtolkning**: läst
  som att det är ULTIMATENS Wins-kostnad som efterskänks (samma
  bricka-position som alla andra korts ultimate-kostnad visas i, källtextens
  ordval "placeras" tolkat som en översättnings-/ordvalsglipa snarare än en
  bokstavlig ny mekanik).
- **Weakness — Broken Focus** — flavor only (sealing/purification/tvångs-
  förflyttning finns inte, och ingen state sparas mellan matcher).

Ultimate **"Forbidden Harmony"** (`targets:'aoe'`, kostnad 4, `freeIfSistersPresent:1`):
"förstör 1 kort i varje riktning" läst som VARJE ANGRÄNSANDE fiendekort
(samma upp-till-4-grannar-mönster som Pallis & Pells Hunter's Wrath redan
använder), inte en hel linje-scan som Naline/Judgment/Fenrirs
riktningsval-ultimates — den här har ingen riktning att välja, den träffar
bara alla som redan står intill. Respekterar BÅDE
`protectedByInfiniteSeraph` (hel-sidas immunitet) och `active.destroyImmune`
(enskilt korts immunitet, t.ex. Three Head Dragon) — om Seraph blockerar
förstörelsen tystas fiendens förmågor ändå (samma `entry.specialLockedUntilTurnCount`
som Crimson Allure, fast på ALLA fiendekort samtidigt, inte bara ett
slumpat).

**Testat**: fem nya tester (state-injicering) — Crimson Allures lås
respekterar rond-klockan i båda riktningarna, Void Embrace capar vid +3
trots 4 vinster i en och samma placering, Divine Temptation buffar/debuffar
korrekt (och Fenrir är fortfarande immun), Sister's Will fungerar med bara
1 syster medan Nyxaras egen tröskel-2 förblir oförändrad, Forbidden Harmony
förstör en vanlig granne men inte en `destroyImmune`-granne (som ändå blir
tystad) — PLUS en full slumpad match med kortet i båda händerna samtidigt.
Inga `pageerror`. `tests/game.test.mjs`: 26 tester totalt, alla gröna.

### Graveyard — ny valfri regel, från ett kort användaren skickade ("Graveyard Rune")

Användaren föreslog fritt ("Vi kanske skulle lägga till en graveyard.") och
skickade sedan ett konkret kortdesign, "Graveyard Rune", som beskriver
regeln: när ett kort tas bort från spelplanen (av en Special/Ultimate, INTE
en vanlig flip) hamnar det i en Graveyard istället för att bara försvinna;
Graveyard-kort kan inte användas/påverkas/flyttas; Graveyard töms vid
matchens slut. Byggd som en **femte valfri regel** (`state.rules.graveyard`),
bredvid Same/Plus/Combo/Elemental i "Optional rules"-panelen (Random
Draft/Choose Your Five, inte Campaign) — konsekvent med hur de andra
regel-togglarna redan fungerar, snarare än ett alltid-på beteende.

**Ny delad state:**
- `state.rules.graveyard` (boolean, default `false`) — själva togglen.
- `state.graveyard = { blue: [...], red: [...] }` — arrayer av rå kortobjekt
  (inte board-entries), en per sida. Återställs till tomma arrayer i
  `resetGame()` så en ny match aldrig ärver föregående matchs Graveyard.
- `state.showGraveyard` (boolean) — om Graveyard-modalen (se nedan) är öppen.

**Ny delad funktion, `destroyCard(index)`** (bredvid `protectedByInfiniteSeraph`):
enda stället i motorn som faktiskt tar bort ett kort från `state.board`.
Om regeln är på och rutan hade ett kort pushas kortobjektet till
`state.graveyard[ägare]` INNAN rutan töms; annars beter den sig identiskt
med den gamla `state.board[i] = null`. Alla sex ställen i motorn som
tidigare skrev `state.board[i] = null` direkt konverterades till att anropa
`destroyCard(i)` istället: Lyriths (`lyrith`) kritiska träff, The Celestial
Judgments Eternal Verdict, Triune Desires Forbidden Harmony, Dariens Shadow
Breaker, samt Vaeliras och Nyxaras respektive ultimate. Ingen av dessa
korts EGEN logik ändrades — bara var raderingen av `state.board[i]` sker.

**UI**: en 💀-badge (`#graveyard-toggle`, visar totalt antal döda kort på
båda sidor) dyker upp i `wins-row` mitt emellan de två wins-chippen, men
BARA när `state.rules.graveyard` är på. Klick öppnar en modal
(`renderGraveyardModal()`, samma `modal-overlay`/`modal-poster`-mönster som
Rulebook-modalen) med två kolumner (Forest/Your Banner) som listar varje
dött korts tumnagel (`CARD_IMAGES[id]`) + namn, eller "No cards here yet."
om sidan är tom.

**Medveten begränsning, som checkboxens egen text säger rakt ut**: det här
är just nu bara ett SYNLIGT REGISTER — inget kort läser från Graveyard än.
Reglerna "kan inte användas/påverkas/flyttas" är trivialt sanna eftersom
kortet inte längre finns på `state.board` alls (samma sätt som ett vanligt
borttaget kort redan var oåtkomligt) — ingen ny spärrlogik behövdes för
det. Framtida kort som ska INTERAGERA med Graveyard (återuppliva, räkna
döda kort för en bonus, etc.) är fortfarande obyggt och väntar på att
användaren definierar ett sådant kort.

**Testat**: två nya tester (state-injicering) i `tests/game.test.mjs` —
`destroyCard()` registrerar bara när regeln är på (och är en säker no-op på
en redan tom ruta), samt en fullständig pipeline-test som verifierar att
Vaeliras, Nyxaras och Triune Desires respektive destroy-ultimates alla
faktiskt hamnar i `state.graveyard` via sina riktiga Special-handlers (inte
bara `destroyCard()` isolerat), plus att `resetGame()` tömmer Graveyard.
En separat ad-hoc Playwright-körning verifierade UI:t manuellt (badge-text,
öppna/stänga modal, korrekt antal kort per sida). Inga `pageerror`.
`tests/game.test.mjs`: 28 tester totalt, alla gröna.

### Fem nya bossar i en enda batch: Kaeldryx, Nexzoth, Morvath, Vorgrath, Zalazar

Användaren skickade fem helt nya poster-bilder på en gång ("Lite nya kort
kommer fler") — inga omgjorda befintliga kort den här gången, fem
splitternya Legendary/Mythic/Boss-kort. **FOREST_FOES-only** (INTE
duplicerade in i HEROES) — samma bedömning som Three Head Dragon fick
tidigare: 9-10-i-alla-riktningar-stats och ren skurk-/slutboss-framing
("The Last Dragon Hunter", "The World Eater", "The Abyssal King", "The
Sister's Bane", "The Ashen Tyrant") läst som fiende-endgame-innehåll,
till skillnad från Triple Triad Sisters/Triune Desire (uttryckligen gjorda
spelbara på begäran). Trivialt att duplicera in i HEROES senare om
användaren vill göra dem spelbara.

Alla fem har `special.cost:3` (kortens egen "Wins 3"-bricka, till skillnad
från de flesta andra ultimates 2-kostnad) och delar flera HELT NYA,
generiska motor-primitiver (skrivna generiskt från början eftersom flera
kort delar samma mekanik-form):

- **`active.vsTagBonus:{tag, amount}`** (Kaeldryx's Dragon Hunter) — +N
  Power mot vilket kort som helst med `card[tag]` satt till sant. Krävde
  att `dragon` (Ancient Wyrmking) och `threeheaddragon` (Three Head Dragon,
  båda kopior där de finns) fick en ny `isDragon:true`-tagg, så Kaeldryx
  faktiskt har mål att träffa.
- **`active.scaleBreaker`** (Kaeldryx's Scalebreaker) — +1 Power närhelst
  motståndarens FACING-sida (motsatt kant av den som jämförs) är 8 eller
  högre.
- **`active.weakVsElement:{element, amount}`** (alla fem korts
  Weakness-förmågor) — en ren, tryckt elementsvaghet, INTE spärrad av
  `debuffImmune`/`debuffImmuneFirstRound` (till skillnad från alla andra
  debuff-anrop i motorn) eftersom det är kortets EGEN svaghet, inte en
  fiendeförmåga som ska kunna blockeras. Just nu HELT VILANDE — inget
  `'light'`- eller `'magic'`-element finns på något kort ännu, så det här
  utlöses aldrig förrän ett sådant kort läggs till (samma
  "byggd-men-sovande"-mönster som Graveyard-regeln hade innan den här
  batchen gav den en läsare).
- **`entry.buffLockedUntilTurnCount`** (Kaeldryx's Hunter's Focus) — första
  effekten som blockerar POSITIVA bonusar istället för att lägga på en
  negativ. Spärren sitter i själva `SpecialVerbs.attackBoost`/
  `directionalBoost` (skippar anropet om `amount > 0` och spärren är
  aktiv) snarare än utspridd över varje bonuskälla, eftersom ALLA bonusar
  redan går genom just dessa två verb.
- **`active.onWinPowerThresholdDestroy:N`** (Kaeldryx's Execution) — ny
  hook i `checkOnWinBonuses`: vinner kortet en runda med `winnerVal >= N`,
  förstörs förloraren rakt av (respekterar `destroyImmune`). Krävde att
  `checkOnWinBonuses` fick två nya, valfria parametrar (`winnerIndex`,
  `winnerVal`) — `battleNeighbors`s enda anropsplats uppdaterad att skicka
  med dem (den redan uträknade `placedVal`, ingen omräkning).
- **`active.onWinLineDestroy`** (Nexzoth's World Shatter, Morvath's Abyssal
  Grasp) — samma nya `winnerIndex`/`winnerVal`-hook: räknar ut riktningen
  från den vinnande kanten (`myEdge:'top'` → riktning `'up'`, etc.) och
  återanvänder `enemiesInDirection()` för att förstöra ALLA fiendekort
  längre bort i just den linjen. Ingen "en gång per match"-spärr, precis
  som Three Head Dragons `onWinAreaDebuff` sedan tidigare.
- **`active.buffOnEnemyDestroyed`** (Morvath's King of the Depths) — ny
  hook direkt i den delade `destroyCard()`-funktionen (byggd för
  Graveyard-regeln förra sessionen): varje gång NÅGOT förstör ett
  fiendekort, hittar den en Morvath på motståndarsidan och ger +1 Power
  permanent. Triggas alltså även av Morvaths EGNA
  Abyssal Grasp/Ultimate, vilket är avsiktligt (tematiskt "föder sig på
  förstörelse").
- **`active.onWinAllEnemiesDebuffThisRound:N`** (Vorgrath's Crushing
  Weight) — ny hook i `checkOnWinBonuses`: vinner kortet EN runda, får
  VARJE fiendekort på hela brädet -N Power denna runda (inte bara
  grannar). Källtextens "nästa runda" (fördröjd start) förenklad till en
  omedelbar engångs-runda-effekt — samma `debuffThisRound`-primitiv som
  allt annat rond-begränsat i motorn — eftersom en genuint fördröjd
  fönster-övergång skulle kräva ett tredje tidstillstånd utöver den
  befintliga aktiv→utgången-modellen.
- **`active.onWinReviveFromGraveyard:{count, powerPenalty, minWinValue?}`**
  (Morvath's Drowned Souls/Ultimate, Zalazar's World In Flames) — ny hook i
  `checkOnWinBonuses` plus en ny delad funktion **`reviveFromGraveyard(owner,
  count, powerPenalty)`**: drar upp till `count` slumpade kort ur
  MOTSTÅNDARENS `state.graveyard`, placerar dem direkt på tomma
  brädrutor under `owner` med ett permanent `captureBonus:-powerPenalty`.
  Går INTE genom `placeCard`/`resolveFlips` — ett återupplivat kort
  dyker bara upp, det anfaller inte sina nya grannar direkt (medveten
  förenkling, för att undvika att rekursivt trigga hela
  placerings/flip-pipelinen för en engångseffekt). **Detta är Graveyard-
  regelns FÖRSTA verkliga läsare** — innan den här batchen var den bara ett
  synligt register (se föregående underrubrik); hittar naturligtvis
  ingenting om regeln är avstängd (graveyard alltid tom då).
- **`active.debuffImmuneFirstRound`** (Vorgrath's Unchained Hatred) —
  generaliserar det befintliga permanenta `active.debuffImmune`
  (Fenrir/Nexzoth/Morvath) till ett tidsbegränsat fönster ("state.turnCount
  < 2") istället för en engångs-id-koll. Ny delad hjälpfunktion
  `isDebuffImmuneNow(card)` ersatte de fyra tidigare råa
  `card.active.debuffImmune`-kollarna i `SpecialVerbs.debuff`/
  `directionalBoost`/`debuffThisRound` samt `fullEffectiveValue`s
  `freezeDefenderPenalty`-koll.

**Enskilda kort, kort sammanfattat** (fullständig text i kortens `skills`
i `index.html`):
- **Kaeldryx** (Legendary, 10/10/9/9): Dragon Hunter, Hunter's Focus,
  Scalebreaker, Execution. Ultimate **Dragonslayer** (3 wins) — förstör
  ALLA Dragon-kort på brädet, ALLIERADE ELLER FIENDE (medvetet inte
  fiende-only, till skillnad från varje annan förstör-allt-ultimate i
  spelet — källtexten har inget "fiende"-villkor och Kaeldryx är tematiskt
  en jägare som dödar varje drake han hittar), sen -3 Power denna runda på
  alla kvarvarande fiender.
- **Nexzoth** (Mythic, 10/10/10/10): Reality Consume, World Shatter,
  Endless Void (permanent debuffImmune; "kan inte flyttas" är flavor only
  — inget kort kan någonsin flytta ett annat korts position i motorn),
  Omnivore (**flavor only** — "kopiera vilken förmåga som helst" skulle
  kräva antingen ett fullt förmåge-reflektionslager eller hårdkodning av
  varje tänkbart mål, orimligt för en enda skill-rad på ett kort — samma
  kategori som Shadow Rend/Cosmic Insight tidigare). Ultimate **The
  Ending** (3 wins) — förstör ALLT ANNAT på brädet, båda sidor, UTOM
  Nexzoth själv (källtextens "alla kort" läst som "utom kastaren" — att
  spendera 3 wins på att radera sitt eget nyss vunna kort vore en konstig,
  glädjedödande tolkning).
- **Morvath** (Mythic, 9/9/10/10, water): Tidal Crush, Abyssal Grasp, King
  of the Depths (permanent debuffImmune + `buffOnEnemyDestroyed`), Drowned
  Souls (villkorad återupplivning vid 10+ Power-vinst). Ultimate **The
  Endless Tide** (3 wins) — förstör alla fiendekort, drar sen upp till 2 av
  DEM (de precis förstörda hamnar direkt i graveyarden och kan omedelbart
  dras tillbaka) till egen sida med -3 Power.
- **Vorgrath** (Boss/Voidborn, "The Sister's Bane", 10/9/8/9, fire):
  Ashfall + World Denial (BÅDA slås ihop till EN placerings-hook —
  källtexten ramar World Denial som en separat aktiverbar
  en-gång-per-match-förmåga, men inget sådant aktiverings-system finns
  utöver kortets egen Ultimate, så den triggas automatiskt tillsammans med
  Ashfall istället; ett kort placeras ändå bara en gång per match).
  Crushing Weight, Unchained Hatred (tidsbegränsad debuffImmune). Ultimate
  **The Falling World** (3 wins, `targets:'direction'`) — förstör hela den
  valda linjen. **Vorgraths namn syftar tydligt på Triple Triad Sisters**
  men ingen ny koppling byggdes utöver flavor-texten — ingen kod refererar
  systrarna specifikt.
- **Zalazar** (Legendary, 9/9/10/10, fire): Infernal Reach + Tyrant Aura
  (samma "två hooks i en placering"-mönster som Vorgrath). Ashen
  Resurrection återanvänder EXAKT samma `active.shield`-mekanik som Ancient
  Wyrmking (källtextens "överlever med 1 Power" är flavor only — skölden
  blockerar hela flippen istället för att sänka hans stats, eftersom
  motorns Power-värden är additiva, inte ett stat-golv). World In Flames
  (ovillkorad återupplivning, till skillnad från Morvaths tröskelvärde).
  Ultimate **Apocalypse** (3 wins) — förstör alla fiendekort (skonar
  allierade, till skillnad från Nexzoths/Kaeldryx's ultimates).

**Sidofynd, fixat i samma veva**: AI:t (`enemyTryUseSpecial`) hade EN
generisk gren för `targets:'direction'`-specialer som bara gjorde
`continue` (hoppade över) om inget kort hade en skräddarsydd AI-gren — vilket
betydde att Naline, The Celestial Judgment, The Infinite Seraph och The
Eclipse Fenrir ALDRIG användes av fiende-AI:t innan den här sessionen,
tyst, utan att någon märkt det. Eftersom Vorgraths hela identitet hänger på
sin riktnings-ultimatela jag till en generisk fallback (väljer riktningen
med flest fiendekort i sig, samma "störst utdelning"-heuristik som resten
av AI:t) — fixar alla fem korten på en gång, kostar inget för de fyra
gamla.

**Bildhantering**: samma beskärningskonvention som tidigare
(`crop((140,y,800,y+431)).resize((640,418))`, `y` justerad per bild för att
träffa ansiktet/motivet), sparade som `cards/card-<id>.jpg` (tumnagel,
hand/bräde) + `card-<id>-full.jpg` (helposter, info-modalen).

**Testat**: sex nya tester (state-injicering) i `tests/game.test.mjs`, en
per kort plus en för AI-fixen — passiva bonusar, on-place-hooks isolerade
från battle-resolution (annars triggar Kaeldryx's egen Execution
oavsiktligt eftersom hans grundstats redan är 10 på två sidor), villkorad
kontra ovillkorad återupplivning, `destroyImmune`-respekt genomgående, samt
en full Playwright-skärmdump som bekräftar att alla fem tumnaglar/helposters
renderar korrekt i både bräde och info-modal. Två testbuggar hittades och
fixades UNDER vägen (fel förväntat värde pga Scalebreaker som också
triggade i Dragon Hunter-testet; fel invariant för Vorgraths två
oberoende slumpmål som kan träffa samma kort) — inga motorbuggar, bara
dåliga testantaganden. Inga `pageerror`. `tests/game.test.mjs`: 34 tester
totalt, alla gröna.

### Naline — fullständig ombyggnad #2 (samma session, direkt efter de fem bossarna) — plus ett nytt kort: Umbrael

Användaren skickade två poster-bilder till, mitt i test-arbetet för de fem
bossarna ovan: en HELT ny "Naline, The Soul Healer" (samma
fullständig-ombyggnad-behandling som Tiamat fick tidigare — id/namn
oförändrat, allt annat bytt ut) och ett nytt kort "Umbrael, The Void
Sovereign" ("Nya"). Svarade genom att först färdigställa och committa de
fem bossarna, sen ta itu med de här två direkt efter — dokumenterat separat
här eftersom det är en tydlig egen batch.

**Naline** (`id:'naline'`, oförändrat — alla `unlockIds`/etapp-referenser
fungerar fortfarande): gick från "The Storm's Shadow — Order of the
Radiance" (vind, riktningsbaserad debuff-ultimate) till "Legendary Card —
The Soul Healer" (**första Light-element-kortet i hela rostret**),
8/9/10/7. Hennes två `RIVALRY_PAIRS`-poster (med Ragnar och Deathblade,
båda "Order of the Radiance"-temat) togs bort — ingen koppling kvar efter
ombyggnaden.

Nya delade primitiver, skrivna generiskt:
- **`active.onWinCleanseAlly`** (Healing Radiance) — ny hook i
  `checkOnWinBonuses`: vinner kortet en runda, väljs ett slumpat kort på
  EGEN sida (kastaren själv inräknad) — negativ `captureBonus` nollställs,
  `tempEffects` (pågående rond-effekter) rensas, sen +1 Power permanent.
- **`SpecialVerbs.buffThisRound`** (Divine Touch) — den positiva
  motsvarigheten till `debuffThisRound`: en tillfällig +N Power som
  automatiskt reverseras av den redan befintliga
  `sweepExpiredRoundEffects()` (den funktionen var redan tecken-agnostisk,
  `captureDelta` kan vara positiv eller negativ — behövde ingen ändring
  där, bara en ny "apply"-sida). Respekterar `buffLockedUntilTurnCount`
  precis som `attackBoost`/`directionalBoost`.
- **`reviveFromOwnGraveyardAtFixedPower(owner, count, fixedPower,
  immuneRounds)`** (Soul Revive, Rise Again) — en syskonfunktion till
  förra batchens `reviveFromGraveyard()`, men med två skillnader: (1) drar
  från KASTARENS EGEN graveyard, inte motståndarens, och (2) källtexten
  ber om en ABSOLUT "med 1 Power" istället för "-N Power" — omöjligt att
  uttrycka som ett `captureBonus`-avdrag mot ett godtyckligt baskort
  (motorns Power-värden är additiva, inget stat-golv finns), så istället
  klonas kortet med alla fyra sidor satta till exakt `fixedPower`. Rise
  Again-klausulen "kan inte tas bort denna runda" gav upphov till...
- **`isDestroyImmune(entry)`** — generaliserar den tidigare rena
  kort-nivå-koll (`entry.card.active.destroyImmune`, permanent) till att
  ÄVEN läsa en ny, tillfällig `entry.destroyImmuneUntilTurnCount`
  (samma "+2"-fönster som alla andra rond-klocka-flaggor). ALLA NIO
  tidigare råa `destroyImmune`-kollar i hela motorn (Lyrith, The Celestial
  Judgment, Triune Desire, Vaelira, Nyxara, Kaeldryx, Nexzoth, Morvath,
  Vorgrath, Zalazar) konverterades till att anropa den delade funktionen
  istället — samma refaktorerings-mönster som `isDebuffImmuneNow` fick i
  förra batchen.
- **`protectedBySanctuary(owner)`** (Sanctuary passiv) — en parallell
  helsides-skyddsfunktion till `protectedByInfiniteSeraph`, men **medvetet
  INTE kopplad till något förstör-ställe än**: kortets egen text undantar
  uttryckligen Ultimate-effekter, och VARJE förstöreffekt i spelet just nu
  ÄR en Ultimate — att koppla in den skulle motsäga kortets egen text.
  Vilande, sparad för en framtida icke-Ultimate-förstöreffekt.
- **`active.weakVsElement`s `'dark'`-variant blev NU levande** (Shadow
  Affinity), och det redan skrivna men vilande `'light'`-fallet (från förra
  batchens fem bossar) blev ockSÅ levande i samma veva — se Umbrael nedan.

Ultimate **Rise Again** (3 wins): drar upp till 2 kort från EGEN graveyard
till 1 Power vardera, tillfälligt `destroyImmune` i en rond.
**Soul Revive** (en av de vanliga förmågorna, inte Ultimate) och **Divine
Touch** slogs ihop till EN placerings-hook, samma "ingen sekundär
aktiverings-UI"-motivering som Vorgrath/Zalazar fick förra batchen.

**Umbrael** (nytt kort, FOREST_FOES-only, `element:'dark'`): 10/10/9/10 —
**nästan identisk kit-form som Nexzoth** (on-place enkel-debuff /
villkorad sido-buff / debuffImmune+"kan inte flyttas"-passiv / on-win
graveyard-återupplivning från MOTSTÅNDARENS graveyard / förstör-allt-
ultimate), så handler-koden återanvänder samma mönster rakt av. Enda
genuint nya primitiven: **`active.underdogSideBonus:N`** (Reality
Fracture) — +N Power på en specifik sida OM motståndarens FACING-sida i
just den striden är högre än kortets egna tryckta sida (en live,
per-strid-underdog-koll, till skillnad från det äldre
`active.underdogBonus` som jämför HELA kortets stat-summa). `element:'dark'`
är en tolkning (ingen explicit element-badge syns på kortet) — vald
medvetet så att Umbraels egen Light-svaghet OCH Nalines nya Dark-svaghet
blir ett levande, ömsesidigt triggande par så fort båda korten finns.
Ultimate **End of All** (3 wins): samma "förstör allt utom sig själv, båda
sidor"-tolkning som Nexzoths The Ending, av samma anledning (att spendera
3 wins på att radera sig själv vore en konstig tolkning).

**Bildhantering**: Nalines gamla konst (`cards/card-naline.jpg` +
`card-naline-full.jpg`) skrevs över rakt av med den nya — samma
"ersätt gammal konst"-hantering som Tiamat fick. Umbrael fick nya filer
enligt samma namnkonvention som alla tidigare kort.

**Testat**: två nya tester i `tests/game.test.mjs` — Nalines
Divine Touch/Soul Revive isolerat från battle-resolution, `buffThisRound`s
utgång via `sweepExpiredRoundEffects()`, Healing Radiance rensar ett
negativt `captureBonus` OCH lägger på +1 permanent, Rise Again återupplivar
upp till 2 kort från EGEN graveyard med tillfällig `destroyImmune`
(verifierat att den faktiskt går ut nästa rond via `isDestroyImmune()`),
att rivalry-paren är borttagna, och att hennes special nu är `'aoe'` inte
`'direction'` — plus Umbraels `debuffImmune`, Reality Fracture (triggar mot
en starkare sida, inte mot en svagare), det ömsesidiga Light/Dark-
svaghetsparet mätt i båda riktningarna, och End of All som sparar bara sig
själv. Inga `pageerror`. `tests/game.test.mjs`: 36 tester totalt, alla
gröna.

### Zlaizer — nytt kort, skickat direkt efter mobil-frågan ("Funkar allt på mobilen med?")

Användaren frågade om mobilkompatibilitet (svar: ja — verifierat med en
riktig Playwright-körning i iPhone 13-viewport, ingen overflow, inga
JS-fel, alla nya kort/paneler renderar identiskt med desktop; det enda som
sågs var namn/roll-text tätt ovanpå konsten på de minsta bräd-thumbnailsen,
men det är EXAKT samma på desktop vid samma kortstorlek — inte en
mobil-regression). Direkt efter det: "Lägg till nya zlaizer", ett nytt kort
("Zlaizer, The Redeemer", Legendary).

**Placeringsbeslut, en egen bedömning (inte uttryckligen begärd)**: till
skillnad från förra batchens fem bossar (uttryckligt skurk-kodade —
Hunter/World Eater/Abyssal King/Sister's Bane/Ashen Tyrant, FOREST_FOES-
only) läser Zlaizers eget tema — Healer/Revive/Purify/Forgive/Redemption,
"even the fallen deserve a second dawn" — som en HJÄLTE, inte en
antagonist, mycket närmare Naline. Gjord **spelbar** (duplicerad i både
HEROES och FOREST_FOES), dokumenterat som en tolkning, trivialt att flytta
till FOREST_FOES-only senare om fel gissning.

Stats 9/10/9/8, `special:{name:'Rebirth', cost:3}`. Delade primitiver:
- **`active.chanceToGraveyardIfRuleOff`** (Light of Forgiveness) — en ny
  hook direkt i `destroyCard()`: "50% chans att hamna i Graveyard istället
  för att försvinna" — OBEROENDE av den globala Graveyard-regeln. Är
  regeln redan PÅ sker inspelning som vanligt (100%, oförändrat); är den
  AV ger Zlaizer sin EGEN sida ändå ett myntkast-chans att hamna i
  graveyarden (aldrig motståndarens sida). Detta är alltså det FÖRSTA
  kortet som gör Graveyard-systemet delvis aktivt även när den globala
  toggeln är avstängd — ett genuint nytt, inte-vilande beteende (till
  skillnad från `weakVsElement`-mönstret som ofta varit vilande tills
  vidare).
- **`reviveFromOwnGraveyard(owner, count, powerPenalty)`** (Second Dawn) —
  en TREDJE återupplivningsvariant, syskon till förra sessionens
  `reviveFromGraveyard` (motståndarens graveyard, `-N Power`-avdrag) och
  `reviveFromOwnGraveyardAtFixedPower` (egen graveyard, ABSOLUT
  Power-värde): den här drar från EGEN graveyard men med samma
  `-N Power`-avdrags-stil som den första, eftersom källtexten säger
  "-1 Power vardera" (ett avdrag) snarare än Nalines "med 1 Power" (ett
  absolut värde). Ny hook: `active.onWinReviveFromOwnGraveyard:{count,
  powerPenalty}` i `checkOnWinBonuses`.
- Ultimate **Rebirth** återanvänder `reviveFromOwnGraveyardAtFixedPower`
  rakt av (samma som Nalines Rise Again, `count:3`, ingen
  destroyImmune-klausul den här gången — "rensa alla negativa effekter"
  kräver ingen extra kod, en återupplivad kopia har redan `captureBonus:0`
  och tomma `tempEffects` per konstruktion).
- Divine Balance + Redemption Touch slogs ihop till EN placerings-hook,
  samma "ingen sekundär aktiverings-UI"-motivering som Vorgrath/
  Zalazar/Naline fick.
- Weakness mot `'shadow'`-element — EN NY, egen sträng, medvetet skild
  från Umbraels `'dark'` trots snarlik tematik, eftersom källtexterna
  bokstavligen använder olika ord. Vilande tills ett shadow-element-kort
  finns.

**Bonus-fynd under test-arbetet**: en redan existerande FLAKY test hittades
och fixades (inte en ny bugg introducerad av Zlaizer) — Nalines
Healing Radiance-test lät en riktig strid avgöra vinnaren via
`resolveFlips`, men eftersom Naline VINNER den striden flippas förloraren
till hennes egen sida INNAN `onWinCleanseAlly` läses, vilket ger
slump-valet en andra, felaktig allierad-kandidat 50% av gångerna. Fixat
genom att anropa `checkOnWinBonuses()` direkt istället för att gå via en
hel stridsupplösning — samma isolerings-princip som resten av testsviten
redan använder för att undvika den här klassen av bieffekter.

Även den nu inaktuella texten i Graveyard-regelns egen beskrivning
("Purely a record for now — no card reads from it yet") uppdaterades —
stämde inte längre efter förra batchens Morvath/Zalazar och den här
sessionens Naline/Umbrael/Zlaizer.

**Testat**: ett nytt test i `tests/game.test.mjs` — Light of Forgiveness
mätt statistiskt över 200 upprepningar (förväntat ~50%, tolerans 30-70%),
verifierat att den ALDRIG skyddar motståndarsidan, att regeln-PÅ alltid
ger 100% oavsett Zlaizer, Second Dawns avdrag, Divine Balance/Redemption
Touch båda slår till (totalt +4 fördelat över de två slumpmålen) med
exakt en av dem tillfälligt oförstörbar, Rebirth återupplivar alla 3 till
ett rent 1-Power-tillstånd, samt den vilande shadow-svagheten. Inga
`pageerror`. `tests/game.test.mjs`: 37 tester totalt, alla gröna (den
tidigare flaky-testen kördes om flera gånger för att bekräfta att den nu
är deterministisk).

### Balanspass + polering (svar på "Hur ska vi göra spelet bättre" → "1. Och 2." → "Vänta med nytt innehåll, fokusera bara på balans nu" → "3 också")

Användaren valde att fokusera på balans (punkt 1) och polering (punkt 3)
från mitt eget tregrenade förslag, INTE nytt innehåll (punkt 2, uttryckligt
uppskjutet tills vidare).

**Balans — metodik och en verklig fälla värd att komma ihåg**: Försökte
först bygga en full självspels-simulator (AI mot AI, återanvänder
`simulateFlips`/`enemyTurn`, monkey-patchad `setTimeout` för att köra hela
matcher synkront) för att mäta vinstprocent per kort. Detta visade sig
vara en återvändsgränd — ett skenbart legitimt "baseline vs baseline"-test
(IDENTISKA kortlekar på båda sidor) gav 100% vinst för "blå" sidan
konsekvent, vilket avslöjade en STRUKTURELL bias i motorn/heuristiken
(sannolikt kopplad till att `battleNeighbors`s `effOutcome = placedVal >
targetVal` är en strikt olikhet som alltid gynnar försvararen vid exakt
lika värden, kombinerat med identiska deterministiska
korval-heuristiker) — helt orelaterad till vilket kort som testades. Två
separata buggar i själva testselen hittades och fixades under vägen
(dubbel `advanceTurn()`-anrop som lät AI:t spela extra drag; senare ett
saknat "ingenting kvar att göra"-säkerhetsnät för blå som spegla
`enemyTurn()`s egen sista rad, vilket orsakade en oändlig loop när ett
Vorgrath-förstör öppnade en ruta igen efter att båda händerna redan var
tomma). Även EFTER båda fixarna kvarstod en stor, omätbar bias (`baseline
avg margin = +3.35` av 9 rutor, i en spegel-match!). **Slutsats: gav upp
självspels-simuleringen som metod** — bruset från den strukturella biasen
var större än signalen jag försökte mäta, och att gräva vidare i EXAKT
varför skulle kosta mer än det är värt just nu. Simulatorn (`balance-sim.mjs`/
`balance-sim2.mjs` i scratchpaden, inte committad) kan återanvändas senare
om någon vill fortsätta gräva, men den ska INTE tolkas som en tillförlitlig
kalla för enskilda korts styrka i sitt nuvarande skick.

**Balans — vad som faktiskt gav en pålitlig signal**: en ren, deterministisk
numerisk genomgång av alla 62 kort (`top+right+bottom+left`-summa,
Wins-kostnad, vilka har en okapad on-win-effekt, vilka har permanent
`debuffImmune`). Slutsats:
- **Råa stats är INTE problemet** — de åtta nyaste bossarna (36-40 i
  totalsumma) ligger precis i samma spann som redan existerande,
  tidigare-mergade toppkort (Bahamut/Tiamat/Darien/Fenrir/Three Head
  Dragon, alla 37-38) och medianen (36) för hela 62-korts-rostret.
- **Det verkliga mönstret**: 6 av de 8 senaste korten (Nexzoth, Morvath,
  Zalazar, Umbrael, Vorgrath, Zlaizer, Naline) har en on-win-effekt UTAN
  någon "en gång per match"-spärr — ett mönster som INTE fanns i rostret
  före den här sessionen (enda tidigare exemplet: Three Head Dragons
  `onWinAreaDebuff`, en mild, tillfällig debuff till bara angränsande
  fiender — kvalitativt mycket svagare än att permanent förstöra en hel
  linje). Tre av dem (**Nexzoth, Morvath, Umbrael**) kombinerar detta
  DESSUTOM med permanent `active.debuffImmune` — kortet kan inte försvagas
  OCH varje vinst gör brädet permanent värre för motståndaren, utan tak.
  Ingen tidigare kombination i rostret parade ihop de två egenskaperna.

**Balansfix, en medveten avvikelse från källtexten (inte en
text-tolkningsförenkling)**: `active.onWinLineDestroy` (Nexzoths World
Shatter, Morvaths Abyssal Grasp) spärrades till EN gång per match via en
ny `winnerEntry.onWinLineDestroyUsed`-flagga — exakt samma mönster som de
redan existerande `onWinDirectionalBoostUsed`/`onWinDebuffOnceUsed`.
Källtexten har inget sådant tak ("whenever X wins..."), så det här är en
medveten, dokumenterad speldesign-ändring (inte en "hur mappar vi
oklar text till motorn"-förenkling som resten av sessionens beslut) —
flaggad tydligt i både kod-kommentaren och kortens `skills`-text, så
användaren kan enkelt be om en revert om den känns för sträng efter
speltestning. `active.onWinAllEnemiesDebuffThisRound` (Vorgrath, mild och
tillfällig) och `onWinReviveFrom(Own)?Graveyard`/`onWinCleanseAlly`
(självbegränsade av graveyardens/brädets storlek) lämnades okapade —
bara den kvalitativt farligaste kombinationen (permanent förstörelse +
oförstörbarhet) fick en spärr.

**Polering, del 1 (klar)**: in-play-kort på SJÄLVA SPELPLANEN (`.board
.card-role`) visar inte längre rollnamnet ("Legendary Card — The Last
Dragon Hunter" etc.) — bara namn + stats. De nyaste kortens längre
rollnamn radbröts till 2-3 rader och hamnade UTANFÖR `.card-art::after`s
mörkläggnings-gradient (dimensionerad för kortare, äldre rollnamn),
rakt ovanpå ren konst, med dålig läsbarhet som följd — samma problem
syntes lika mycket på desktop som mobil vid samma kortstorlek (bekräftat
med skärmdumpar), alltså inte en regression i sig men en riktig
polerings-möjlighet. Samma "släpp minst nödvändig info först"-princip som
redan fanns för `.hand-row.enemy .card-role` — hela rollen är fortfarande
en tryckning bort via info-knappen.

**Polering, del 2 (klar, byggd efter "Kör på det")**: "tydligare
UI-feedback när flera effekter triggar samtidigt". Löst med två separata
mekanismer, båda centraliserade i motorns delade lager istället för
utspridda över ett dussintal handlers (samma arkitektur-princip som
`isDebuffImmuneNow`/`isDestroyImmune` redan etablerat i tidigare batchar):

- **`flashStatChange(entry, signedAmount)`** — en ny delad hjälpfunktion,
  inkopplad direkt i VARENDA `SpecialVerbs`-metod som faktiskt ändrar en
  Power-siffra (`attackBoost`, `debuff`, `directionalBoost`,
  `debuffThisRound`, `buffThisRound`, `stealPower` på BÅDA sina kort).
  Eftersom ALLA stat-ändringar i hela motorn redan går genom just dessa
  metoder (samma choke-point som debuffImmune/buffLockedUntilTurnCount
  redan utnyttjar), gav den HÄR ena ändringen automatiskt visuell feedback
  åt HELA rostret — även gamla, redan mergade kort — inte bara de nyaste
  bossarna. Sätter samma `bonusFlash`/`bonusAmount` som redan fanns för
  singel-mål-specialer (via `runSpecialResolution`), fast nu med STÖD FÖR
  NEGATIVA belopp: `cardFace()`s popup-mall hårdkodade tidigare ett
  `+`-tecken (`+${amount} Power`), generaliserad till att visa `-N Power` i
  en ny röd `.skill-pop.bonus-negative`-stil när beloppet är negativt,
  istället för den gröna `.skill-pop.bonus`. Flashar ALDRIG vid en
  blockerad ändring (debuffImmune/buffLocked) eftersom `flashStatChange`
  bara anropas EFTER att `captureBonus` faktiskt uppdaterats — ingen risk
  för en missvisande popup på ett no-op.
- **`state.destroyGhosts`** — en ny array av `{index, card, owner}`,
  fylld av `destroyCard()` INNAN cellen töms. `boardCellHtml()` renderar
  en tonande "spillra" av det förstörda kortet (`cardFace(ghost.card,
  {destroyed:true, noInfo:true})`, en ny `.destroy-ghost`-CSS-animation:
  ~1.2s blekning + lätt rotation/skalning + en färgskiftning mot rött,
  plus en "💥 Destroyed!"-popup) istället för att bara låta rutan bli tom
  direkt. Städas av EXAKT samma två redan existerande 1300ms-timeouts som
  redan rensar `attackFlash`/`bonusFlash`/`shieldFlash` (en i
  `placeCard()`, en i `runSpecialResolution()`) — ingen ny timer behövdes.
  Löste alltså det jag ursprungligen trodde skulle kräva "ett nytt
  väntar-på-att-försvinna-tillstånd": datamodellen (`state.board[i]`)
  töms fortfarande OMEDELBART (så all annan spellogik som läser brädet
  direkt efter en destroy förblir korrekt, orörd), men RENDERINGEN har nu
  ett separat, kortlivat spår av vad som just stod där.

Resultat: en ultimate som slår flera mål samtidigt (destroy + debuff
blandat, t.ex. Kaeldryx's Dragonslayer) visar nu en tydlig, distinkt
visuell markering PER RUTA (röd "-N Power" på debuffade kort, en tonande
spillra + "💥 Destroyed!" på förstörda kort) — inte bara den befintliga
sammanfattande textraden i `state.log`.

**Testat**: ett nytt test i `tests/game.test.mjs` (två sidor — en snabb
del för själva flash-logiken, en andra separat sida för att verifiera att
`destroyGhosts` faktiskt töms efter den riktiga 1300ms-timern utan att
sakta ner resten av testfilen) plus två nya tester i befintliga testfall
för World Shatter/Abyssal Grasps engångsspärr (från balanspasset ovan).
En separat Playwright-skärmdump bekräftade visuellt att en Dragonslayer-
aktivering samtidigt visar en röd "-3 Power"-popup på två debuffade kort
OCH en tonande, röd-tonad spillra + "💥 Destroyed!" på det förstörda
draken, i en och samma rendering. Inga `pageerror`. `tests/game.test.mjs`:
38 tester totalt, alla gröna.

### Medusa — fullständig ombyggnad (samma session, efter kortroster-exporten)

Från en ny poster ("Medusa, The Petrified Queen") användaren laddade upp.
Samma mönster som Tiamat/Naline: `id:'medusa'`, namn oförändrat, ALLT
annat utbytt (konst, stats, element, skills, ultimate) — duplicerad
oförändrat i både `HEROES` och `FOREST_FOES` (redan spelbar sedan
tidigare, förblir det).

**Bildhantering**: ny poster beskuren `(140,y,800,y+431)` → skalad till
`(640,418)` → `cards/card-medusa.jpg` (tumnagel, skriver över den gamla)
och `card-medusa-full.jpg` (full bild, repo-rot, ny fil). `FULL_CARD_IMAGES.medusa`
pekar nu på den nya filen.

**Element**: vatten → `earth`. Inget i den nya konsten tvingar ett
specifikt element (ingen synlig element-badge), så sten/gorgon-temat fick
avgöra.

**Petrify blir här spelets FÖRSTA riktiga mekanik av det namnet** —
tidigare bara smak-text på äldre kort, aldrig kopplad till motorn. Ny
delad status: `entry.petrifiedUntilTurnCount` (samma rond-klocka-mönster
som `specialLockedUntilTurnCount`/`buffLockedUntilTurnCount`/
`destroyImmuneUntilTurnCount`: sätts till `state.turnCount + 2`, "en
rond"). Medvetet ett EGET fält, inte återanvändning av
`specialLockedUntilTurnCount`, trots att båda spärrar `specialUsable()` på
samma sätt — Petrify är en läsbar STATUS andra kort behöver kunna RÄKNA
(Serpent Queen nedan), inte bara en påtvingad spärr. `specialUsable()`
fick en tredje lås-koll: `if(entry && entry.petrifiedUntilTurnCount >
state.turnCount) return false;`, direkt efter den befintliga
`specialLockedUntilTurnCount`-koden. Ny 🗿-badge (`.petrified-badge`,
samma placering/stil som `.element-badge`) syns på petrifierade kort på
brädet (`boardCellHtml()` skickar `petrified: cell.petrifiedUntilTurnCount
> state.turnCount` till `cardFace()`).

**Skills** (alla nya `active`-flaggor, lästa i `fullEffectiveValue()` om
inte annat anges):

- **Stone Gaze** (on-win) — ny `onWinPetrify`-gren i `checkOnWinBonuses()`,
  körs efter en riktig vinst (inte Same/Plus): sätter förlorarens
  `petrifiedUntilTurnCount = state.turnCount + 2`. MEDVETET INTE
  "en gång per match"-cappad, till skillnad från Nexzoth/Morvaths
  `onWinLineDestroy` från balanspasset (punkt 10) — den cappningen fanns
  för att motverka permanent förstörelse KOMBINERAT med permanent
  `debuffImmune`; Petrify är tillfälligt (en rond) och saknar den
  kombinationen, så ingen spärr behövs. En dokumenterad balansbedömning,
  inte ett förbiseende.
- **Curse of the Gorgon** — en ny, PARALLELL sköld-mekanism vid sidan av
  den befintliga `isShielded()` (som INTE ändrades). Ny logik direkt i
  `battleNeighbors()`s sköld-kontrollblock (där de faktiska stridsvärdena
  redan finns tillgängliga, till skillnad från `isShielded()` som bara ser
  korten, inte deras beräknade Power) via två nya fält på kortet:
  `marginShieldThreshold` och `shieldGrantsBonus`. När Medusa förlorar en
  strid med liten marginal (`targetVal - placedVal <= marginShieldThreshold`,
  Medusas fall: `2`) blockeras flippen OCH angriparen debuffas -1 — utan
  att konsumera Living Statues separata engångs-`active.shield`. En
  förlust med STÖRRE marginal blockeras inte.
- **Serpent Queen** — ny `active.auraPerPetrifiedEnemy`-block i
  `fullEffectiveValue()`: +1 Power per petrifierad fiende på brädet,
  cappat vid +3.
- **Living Statue** — Medusas egen `active.shield` (den befintliga,
  generiska mekanismen `isShielded()` redan hanterar): blockerar sin
  FÖRSTA förlust, ger permanent +1 Power, konsumeras (`shieldUsed=true`)
  och skyddar inte igen.
- **Throne of Stone** — ny `active.adjacentAlliesBoost`-block i
  `fullEffectiveValue()`, en spegelbild av Tiamats redan existerande
  `adjacentEnemiesBoost` men för EGNA angränsande allierade och INTE
  rollspärrad: +2 Power med 2 eller fler angränsande allierade, +0 med
  bara 1.
- **Gorgon's Dominion** (ultimate, `SPECIAL_HANDLERS.medusa`) —
  petrifierar ALLA fiender på brädet (samma `petrifiedUntilTurnCount`-fält
  som Stone Gaze), debuffar dem -2 vardera, och buffar Medusa själv +3.
  Respekterar `protectedByInfiniteSeraph` (samma helhets-immunitet som
  redan blockerar andra destroy/status-effekter från Vaelira m.fl.).

**Faction/Rarity/Type/Alignment**-hörnbadges på den nya posterkonsten är
MEDVETET INTE inbyggda i motorn — rent flavor-only metadata, precis som
tidigare kort utan ett formellt typ/faktion-system (ingen sådan motor
finns än; se punkt 1b:s öppna tråd om användarens 8-stegs "balans-plan").

**Testat**: ett nytt test i `tests/game.test.mjs`
("Medusa (redesigned): ...") täcker alla sex skills + elementbytet +
spelbarhet, inklusive marginal-skölden med BÅDE ett blockerat (≤2) och
ett icke-blockerat (>2) utfall, samt att Living Statues sköld inte
återanvänds efter första förlusten. `shieldUsed:true` sätts manuellt på
Medusa i marginal-testerna för att isolera Curse of the Gorgon från
Living Statues egen, alltid-aktiva engångssköld (annars skulle båda
blockera samma scenario av olika anledningar, och testet skulle inte
faktiskt bevisa marginal-logiken). 39 tester totalt i svepet, alla gröna.

### Sex nya kort: Shiva, Leviathan, Omega Weapon, Yojimbo, Chocobo King, Odin

Från sex nya poster-bilder användaren skickade rakt av — inga omgjorda
kort den här gången, samma bedömning som Kaeldryx/Nexzoth/Morvath/
Vorgrath/Zalazar-batchen. Fem kort kom i ett meddelande; Odin skickades i
ett separat uppföljande meddelande mitt i implementationsarbetet på de
andra fem — hanterat som en sjätte tillökning till samma batch snarare än
en separat omgång. Alla sex duplicerade oförändrat i både `HEROES` och
`FOREST_FOES` (spelbara + fiender), Faction/Rarity/Type/Alignment-
hörnbadges är flavor-only (samma bedömning som alla tidigare kort utan ett
formellt typ/faktion-system).

**Bildhantering**: samma beskärningspipeline som alltid
(`crop((140,y,800,y+731)).resize((640,418))`, `y` justerad per bild — de
flesta använde standard-`y=300`, Chocobo King fick `y=290` för att undvika
att fånga en synlig "Upp"-statsiffra i beskärningen). Nya filer:
`cards/card-<id>.jpg` + `card-<id>-full.jpg` för alla sex.

**Ny delad hjälpfunktion**: `adjacentEntries(cellIndex)` — returnerar de
FAKTISKA angränsande bräd-entries (med index), till skillnad från
`fullEffectiveValue`s egna adjacency-koll (`adjacentEnemiesBoost`/
`adjacentAlliesBoost`/`auraPerPetrifiedEnemy`) som bara någonsin behövt en
RÄKNING och därför inlinear sin egen rad/kolumn-matematik. Behövdes för
on-place/on-capture-krokar som faktiskt ska PÅVERKA grannarna (Shiva/
Leviathans Frost Aura/Abyssal Presence, Chocobo Kings King's Command,
Shivas ultimate-frysning), inte bara räkna dem.

**Shiva, The Frost Empress** (`element:'ice'` — nytt element, se
ELEMENT_ICONS-fixen nedan):
- **Frost Aura** (on-place) — alla ANGRÄNSANDE fiender -1 denna runda,
  första verkliga användningen av `adjacentEntries()`.
- **Diamond Dust** (on-win) — ny `active.onWinDebuffLoserThisRound:2`:
  förloraren -2 denna runda, OKAPPAD (samma balansbedömning som Vorgraths
  redan okappade `onWinAllEnemiesDebuffThisRound` — ett milt, tillfälligt
  avdrag, inte en snöbolls-risk som de kapade destroy-effekterna).
- **Frost Barrier** — återanvänder befintlig `active.shield` rakt av.
- **Ice Touch** — ny `active.flatAttackBonus:2`: platt +2 Power bara vid
  attack, ovillkorat (den enklaste attack-bonusen i motorn hittills, fanns
  inte som egen primitiv förut).
- **Eternal Winter** — ny `active.adjacentEnemyAuraThisRound:{minCount:2,
  amount:1}`: fiende-räknande spegelbild av Medusas `adjacentAlliesBoost`
  (INTE rollspärrad, till skillnad från Tiamats `adjacentEnemiesBoost` som
  bara gäller attack — Shiva/Leviathans text säger "denna runda", inte
  "nästa attack").
- **Diamond Storm** (ultimate, 3 wins) — AOE -3 denna runda till alla
  fiender (ingen `protectedByInfiniteSeraph`-koll, ren debuff, samma
  bedömning som Kaeldryx's Dragonslayer-försvagning); fryser bara
  ANGRÄNSANDE fiender (återanvänder `specialLockedUntilTurnCount` — samma
  "tysta ett kort"-förenkling som Vorgraths World Denial redan etablerat,
  snarare än en genuin "kan inte använda Card Skills"-spärr som skulle
  kräva att röra varje enskild bonus-koll i `fullEffectiveValue`; RESPEKTERAR
  `protectedByInfiniteSeraph` här eftersom det är ett statuslås, samma
  kategori som Medusas petrify); ger sig själv +3 denna runda; sätter en
  temporär "avrätta svaga fiender"-regel (`entry.executeWeakFoesUntilTurnCount`
  + `executeWeakFoesThreshold`) för resten av ronden — en ny, läst direkt
  i `checkOnWinBonuses` från ett LIVE entry-fält snarare än `card.active`,
  eftersom den bara existerar efter att ultimaten avfyrats.

**Leviathan, The Abyssal Sovereign** (`element:'water'`):
- **Abyssal Presence** (on-place) — identisk text som Shivas Frost Aura,
  samma `adjacentEntries()`-mönster.
- **Crushing Tide** — samma `onWinDebuffLoserThisRound:2` som Shiva.
- **Maelstrom** — samma `adjacentEnemyAuraThisRound` som Shivas Eternal
  Winter, `amount:2`.
- **Abyssal Armor** — återanvänder `active.shield`.
- **Call of the Deep** — ny `active.onCaptureBuffSelfThisRound:2`: +2 denna
  runda på EGET kort vid varje erövring (till skillnad från Ifrit/Bahamut/
  Graffs redan existerande `onCaptureBonus`, som är PERMANENT — detta är
  temporärt, samma "denna runda"-mönster som `buffThisRound` överallt
  annars). Ny krok i `resolveFlips()` bredvid den befintliga
  `onCaptureBonus`-koden.
- **Abyssal Deluge** (ultimate, 3 wins) — AOE -2 denna runda till alla
  fiender, YTTERLIGARE -1 (totalt -3) till angränsande fiender via
  `adjacentEntries()`, +3 denna runda till sig själv, och en temporär
  "permanent +1 vid nästa vinst denna runda"-koppling
  (`onWinPermanentSelfBuffUntilTurnCount`/`Amount`) — samma mönster som
  Shivas execute-grant. Denna nya bonus samverkar (staplar) legitimt med
  Call of the Deeps egen on-capture-bonus om Leviathan både använder
  ultimaten OCH vinner en strid samma runda — verifierat explicit i testet,
  inte en bugg.

**Omega Weapon, The Ultimate Destroyer** (inget element — ingen synlig
badge på konsten, robot/void-tema passar inget av de fyra klassiska):
- **Omega Core** — ren återanvändning av befintlig `active.debuffImmune`.
- **Hyper Pulse** — samma `onWinDebuffLoserThisRound:2` som Shiva/Leviathan
  (tredje kortet som delar primitiven).
- **Anti-Matter Cannon** — ny `active.oncePerMatchVsStrongerBoost:{amount:4}`:
  +4 Power vid attack mot ett kort med högre TOTAL Power (jämfört på
  TRYCKTA värden, samma förenkling som alla andra motståndar-jämförelser
  i `fullEffectiveValue` redan gör), men bara EN GÅNG PER MATCH. Eftersom
  `fullEffectiveValue` är en ren läsfunktion (anropas även för hover-
  förhandsvisningar) kan den inte själv markera förmågan som förbrukad —
  löst genom att `battleNeighbors` räknar om exakt samma villkor direkt
  efter att ha använt `placedVal` för en RIKTIG attack och sätter
  `entry.vsStrongerBoostUsed = true` då, samma "räkna om utanför, markera
  som sidoeffekt"-mönster som Medusas `marginBlocked`-koll redan använder.
- **Absolute Defense** — ny `active.shieldResetsEachRound:true`: till
  skillnad från VARJE annat kort i rostret (vars `active.shield` bara
  blockerar EN gång per match, aldrig återställs), säger Omega Weapons text
  uttryckligen "varje runda" — löst genom att haka på den redan existerande
  `sweepExpiredRoundEffects()` (körs redan vid varje turordningsbyte) och
  nollställa `shieldUsed` där om kortet har flaggan. Genuint starkare
  försvarsprimitiv än resten av rostret — flaggat i kodkommentaren ifall
  framtida balansering vill begränsa den ytterligare.
- **Destroyer Protocol** — ny `active.buffOnEnemyDestroyedCapped:{amount:1,
  max:3}`: samma krok i `destroyCard()` som Morvaths redan existerande
  `buffOnEnemyDestroyed` (okappad), men CAPPAD via en ny räknare
  (`entry.buffOnEnemyDestroyedStacks`) eftersom Omega Weapons text
  uttryckligen säger "max +3".
- **Omega Protocol** (ultimate, 3 wins) — AOE -3 denna runda till alla
  fiender, +3 denna runda till sig själv, förstör sedan varje fiende vars
  svagaste sida (EFTER debuffen ovan, eftersom den räknas som del av samma
  attack) är 5 eller lägre. "Fiendens defensiva skills kan inte aktiveras"
  krävde ingen kod alls — AOE debuff/destroy-effekter i motorn har ALDRIG
  kollat `isShielded()` (bara vanliga `battleNeighbors`-flippar och
  enmåls-ultimates via `specialBlockedByShield` gör det). Destroyer
  Protocols cappade självbuff triggas automatiskt via den delade
  `destroyCard()`-kroken för varje dödad fiende.

**Yojimbo, The Silent Mercenary** (inget element):
- **Mercenary's Code** (on-place) — kollas EN GÅNG vid placeringstillfället
  (inte en levande, omräknad aura som `boardLeadBonus`): +1 permanent om
  motståndaren har fler kort på brädet just då.
- **Daigoro's Hunt** (on-win) — ny `active.onWinDebuffLoserPermanent:1`:
  permanent (inte "denna runda") -1 till förloraren, OKAPPAD — samma
  "mild, okappad stapling"-bedömning som Ifrits redan skeppade permanenta
  `onCaptureBonus`.
- **Price of Death** — ny `active.vsStrongerTotalPowerBoost:{amount:3}`:
  samma "attackera ett kort med högre total Power"-koll som Omega Weapons
  Anti-Matter Cannon, men UTAN engångsspärren — gäller varje attack.
- **Kozuka** — ny `active.oncePerMatchAttackBoost:{amount:2}`: +2 Power på
  VILKEN attack som helst, en gång per match, samma konsumtionsmönster
  (räkna om i `battleNeighbors`, markera `oncePerMatchAttackBoostUsed`) som
  Anti-Matter Cannon.
- **Wakizashi** — ren återanvändning av `active.onCaptureBonus:1` (samma
  primitiv som Ifrit/Bahamut/Graff), permanent +1 vid varje erövring.
- **Zanmato** (ultimate, 3 wins, enmål) — samma "jämför tryckt totalPower,
  applicera sedan belöningen vid vinst"-mönster som graff/aurelia/maximus
  m.fl. redan använder (inte inbakat i själva jämförelsen). Ignorerar
  målets sköld (`specialBlockedByShield` anropas ALDRIG, samma som Lyriths
  Serpent's Wrath). Förstör istället för att erövra vid 3+ Power-marginal.
  "Kostar bara 2 Wins om målet har högre total Power"-klausulen är
  implementerad som en 1-Win-återbetalning EFTER att `runSpecialResolution`
  redan dragit hela det tryckta priset (3) — medvetet vald istället för en
  dynamisk `special.cost`/`specialUsable`-omskrivning för en enda klausul
  på ett enda kort; ger exakt samma nettopris.

**Chocobo King, The Golden Sovereign** (inget element; `isBeast:true` — ny
generisk tagg, samma form som `isDragon`, vilande tills ett framtida
Beast-kort finns):
- **Golden Feathers** (on-place) — sig själv +1 denna runda, OCH om
  placerad bredvid ett allierat Beast-kort får DET kortet också +1 denna
  runda (läser den nya `isBeast`-taggen via `adjacentEntries()`).
- **Choco Dash** — samma `active.flatAttackBonus:2` som Shivas Ice Touch.
- **Royal Plumage** — återanvänder `active.shield`.
- **Feather Storm** (on-win) — ny `active.onWinRandomAdjacentEnemyDebuffThisRound:2`:
  ETT slumpmässigt ANGRÄNSANDE fiendekort (inte nödvändigtvis förloraren av
  just den striden) -2 denna runda — skiljer sig från den befintliga
  `onWinAreaDebuff` (som träffar ALLA angränsande fiender, ovillkorat).
- **Royal Choco Meteor** (ultimate, 2 wins, enmål) — samma jämförelse-
  mönster som Zanmato ovan, respekterar målets sköld (till skillnad från
  Zanmato — inget i texten säger att den ignorerar försvar). Vid vinst: -2
  denna runda till det besegrade kortet, +1 denna runda till alla
  ANGRÄNSANDE allierade kort (ny `active.onCaptureBuffAdjacentAlliesThisRound`,
  läser `adjacentEntries()`), och en extra attack.

**Odin, The Allfather** (inget element):
- **Allfather's Gaze** (on-place) — "se ett slumpmässigt fiendekorts sidor"
  är ren smak (alla kortstats visas redan öppet i det här spelet, inget
  dolt-kort-system finns); den mekaniska halvan (-1 denna runda till ALLA
  fiender, hela brädet — inte bara angränsande, till skillnad från Shiva/
  Leviathans Frost Aura/Abyssal Presence) implementerad rakt av.
- **Gungnir Strike** — samma `active.flatAttackBonus:2` som Shiva/Chocobo
  King.
- **Raven's Insight** — helt smak, samma anledning som Allfather's Gaze
  ovan; ingen kod.
- **Warrior's Soul** — återanvänder `active.shield`.
- **Valhalla's Call** — ny `active.onCaptureBuffAllAlliesThisRound:1`: +1
  denna runda till ALLA egna kort på brädet (inte bara angränsande, till
  skillnad från Chocobo Kings King's Command) vid varje erövring.
- **Zantetsuken** (ultimate, 3 wins, enmål) — samma jämförelse-mönster som
  Zanmato/Royal Choco Meteor, respekterar sköld. Vid vinst: permanent -3
  till målet via `SpecialVerbs.debuff` (respekterar alltså målets egen
  `debuffImmune`, till skillnad från Aurelias kritträff som skriver
  `captureBonus` direkt — Odins text har ingen krit-koppling som motiverar
  den genvägen), -1 denna runda till alla ANDRA fiender, +3 denna runda
  till sig själv. "Sju blixtsnabba slag" är ren smak för namnet/
  presentationen, inte sju separata träffar.

**ELEMENT_ICONS-fixen**: en tyst, sedan tidigare befintlig bugg hittades i
förbifarten — `ELEMENT_ICONS` hade bara `fire`/`wind`/`earth`/`water`
(de fyra som `state.rules.elemental`s sten-sax-påse-regel faktiskt
använder), men flera kort har LÄNGE haft `element:'light'`/`'dark'`/
`'shadow'`/`'magic'` för sina egna `weakVsElement`-klausuler (Naline,
Umbrael, Nexzoth, Morvath m.fl.) — `cardFace()`s badge läser
`ELEMENT_ICONS[card.element]` ovillkorat närhelst `card.element` är satt,
så de kortens badges har bokstavligen visat texten "undefined" sedan de
elementen tilldelades. Fixat i samma veva som Shiva fick sitt nya
`element:'ice'` (som annars skulle haft samma problem): alla fem saknade
element fick nu egna ikoner (❄️/✨/🌑/🖤/🔮). Ren bugfix, ingen
regeländring — `ELEMENT_BEATS`/den klassiska Elemental-regeln bryr sig
fortfarande bara om de fyra klassiska elementen, precis som förut.

**Testat**: sex nya permanenta tester i `tests/game.test.mjs`, ett per
kort, samma mönster som Kaeldryx/Nexzoth/Morvath/Vorgrath/Zalazar-batchen.
Två av dem (Chocobo Kings Feather Storm, kopplat till samma "flera
angränsande fiender flippar samtidigt"-problem som redan lösts för Nalines
Healing Radiance) anropar `checkOnWinBonuses` direkt istället för via
`resolveFlips`, av exakt samma isoleringsskäl. 45 tester totalt, alla
gröna.

## 5b. Campaign-läge (nytt sidospelläge, användarens idé)

Ett HELT separat tredje sätt att spela, bredvid "Random Draft"/"Choose Your
Five" — samma `.mode-toggle` på draftskärmen, bara ett tredje `mode-btn`
(`#mode-campaign`, `state.draftMode='campaign'`). Rör INGET i det
befintliga spelet — grundmotor, vanliga draft-lägena, allt oförändrat.

**Idén**: börja med 5 fasta "story"-kort (Graff, Elara, Sarah, Zaevir,
Ragnar — användarens eget val), klättra genom `CAMPAIGN_STAGES` (16 etapper,
en fast/kuraterad fiendehand + valfria-regler-konfiguration per etapp,
istället för `drawEnemyHand()`s helt slumpade 5-av-34), lås upp fler kort
vid varje vinst. Förlorar man en etapp: `Retry Stage`, ingen progress
förloras (etapp-index/upplåsningar ändras bara vid VINST, inte vid förlust
eller oavgjort). **("Lås upp fler kort" gäller fortfarande som progress/
narrativ, men spärrar INTE längre vilka kort som går att VÄLJA på etapp 2+
— se UPPDATERING längre ner i det här avsnittet, en mycket senare session.)**

**Sparad progression**: `campaignProgress` (`{stageIndex, unlocked, ngPlus}`)
är en egen modul-nivå-variabel, INTE en del av `state` — `state` byts ut
helt av `resetGame()` vid varje "Draft Again"/etapp-övergång, så
campaign-progress hade annars nollställts vid varje sådan övergång. Sparas i
`localStorage` (`triadArenaCampaign`, `loadCampaignProgress()`/
`saveCampaignProgress()`, båda try/catch-inslagna — spelet funkar även om
localStorage är blockerat, progress sparas bara inte). FÖRSTA gången
`localStorage` används i hela projektet.

**Var allt kopplas in** (alla additiva, ingen rör grundmotor-funktioner):
- `renderCampaignPanel()` — draftskärmens tredje gren. Etapp 1 visar bara
  de 5 fasta startkorten (icke-klickbara, ingen väljare — `#campaign-begin-btn`
  går rakt på). Etapp 2+ återanvänder EXAKT samma väljar-UI/interaktion som
  "Choose Your Five" (`.draft-grid .card.selectable`-klick-toggle) —
  **ursprungligen** begränsad till `campaignPool()` (startkort +
  `campaignProgress.unlocked`), **men se UPPDATERING några stycken ner:
  `campaignPool()` returnerar numera HELA `HEROES` rakt av.**
- `startCampaignBattle()` → sätter `state.rules` från etappens config, sen
  vanliga `startBattle()`. `startBattle()` självt kollar
  `state.draftMode==='campaign'` och hämtar fiendehanden från
  `currentCampaignStage().enemyIds` (mappat mot `FOREST_FOES`) istället för
  `drawEnemyHand()`s slump, om så är fallet — ett `if`, ingen duplicerad
  funktion.
- `finishGame()` — vid `state.draftMode==='campaign' && winner==='blue'`:
  slår upp etappens `unlockIds`, lägger till (utan dubbletter) i
  `campaignProgress.unlocked`, ökar `stageIndex`, sparar till localStorage
  — ALLT DETTA HÄNDER OMEDELBART här, inte uppskjutet till en knapptryckning,
  så progress är sparad i samma ögonblick striden avgörs. `state.campaignUnlocked`
  (transient, nollställd varje `finishGame()`-anrop) håller vilka kort som
  precis låstes upp, bara för resultatskärmens text.
- Resultatskärmen (`renderBattle()`s `resultHtml`) grenar på
  `draftMode==='campaign'`: vinst → "Stage Cleared!" (eller "Campaign
  Complete!" om `currentCampaignStage()` inte längre finns) + vilka kort
  som gick med, `#campaign-next-btn`; förlust/oavgjort → "Stage Failed" +
  `#campaign-retry-btn`. Båda knapparna anropar bara vanliga `resetGame()`
  — `campaignProgress` är redan uppdaterad (eller medvetet oförändrad vid
  förlust) innan knappen ens visas, så `resetGame()` behöver inget
  campaign-specifikt alls.

### UPPDATERING, en mycket senare session: progressionsspärren på kortval är borttagen

Speltestning avslöjade att etapp 2+ kändes för svårt när valpoolen bara var
5 startkort + det fåtal man hunnit låsa upp — särskilt tidigt, innan man
låst upp mycket alls. Detta river medvetet upp en tidigare design-idé
("gradvis uppläsning är poängen med Campaign") — så innan något kodades
ställdes en `AskUserQuestion` med fyra alternativ (ge alla kort direkt / fler
startkort / mjuka upp tidiga fiendehänder / ett separat Free Mode-läge).
Användaren valde uttryckligen **"Ge alla 46 kort från start"**.

Implementerat som EN rad: `campaignPool()` returnerar nu `HEROES.map(h =>
h.id)` istället för `CAMPAIGN_STARTERS.concat(campaignProgress.unlocked)`.
Konsekvenser, medvetet avgränsade till bara det som faktiskt behövde ändras:

- **Etapp 1 är OFÖRÄNDRAD** — fortfarande de 5 fasta narrativa startkorten,
  icke-klickbar, ingen väljare. Användarens klagomål gällde specifikt
  "etapp 2+", inte introt.
- **`campaignProgress.unlocked`/varje etapps `unlockIds` är OFÖRÄNDRADE och
  fortsätter sparas/räknas precis som förut** — de styr bara inte längre
  VILKA KORT SOM GÅR ATT VÄLJA. `finishGame()`s "nya kort gick med i din
  historia"-logik och resultatskärmens text kör exakt samma kod som förut.
  Läs om som ren narrativ smak ("de här karaktärerna är nu en del av din
  berättelse") istället för en spelmässig spärr — helt ofarligt att lämna
  orört, ingen kod bryr sig om skillnaden.
- **"Unlocked so far"-galleriet (den ihopfällbara `📁 Unlocked
  Champions`-knappen från förra fixen, se ovan) togs BORT helt** från
  etapp 2+-skärmen — den visade bara en delmängd av `campaignProgress.unlocked`
  bredvid ett väljarrutnät som nu redan visar alla 46 kort, vilket hade sett
  ut som en bugg (varför visas bara några kort som "upplåsta" när jag kan
  välja bland alla?). `state.showUnlockedGallery`-fältet, dess klick-hanterare
  och `.campaign-unlocked-grid`-CSS:en togs bort i samma veva — kortlivad
  funktion, byggd och borttagen i samma session.
- Regeltexten ändrades från "Choose five champions from your story so far"
  till bara "Choose five champions" — "so far" antydde felaktigt en
  begränsad pool.
- **"Campaign complete"-slutskärmen** (`!stage`-grenen i
  `renderCampaignPanel()`) visar nu automatiskt hela `HEROES`-rostret istället
  för bara upplåsta kort — samma `poolIds`-variabel, ingen extra kod behövdes.
- NG+ (`campaign-ngplus-btn`) och Reset Campaign är OFÖRÄNDRADE — de
  manipulerar bara `campaignProgress`/`state.selected` direkt, ingen av dem
  gick via `campaignPool()`s gamla spärr.

Testat: `campaignPool().length === HEROES.length` även med `unlocked:[]`
(stage 2, inget upplåst än), draftrutnätet renderar alla 46 kort, en full
match spelad med sena/kraftfulla kort (Tiamat, Three Head Dragon, Infinite
Seraph m.fl.) valda redan på etapp 2 — inga `pageerror`. Ett test i
`tests/game.test.mjs` bytt ut mot det nya beteendet (gallery-togglens test
togs bort eftersom funktionen den testade inte längre finns) — 21 tester
totalt, alla gröna.

**Samtidigt, en separat bugg-fix:** Triple Triad Sisters (Vaelira/Seraphine/
Nyxara) hade ingen egen `CARD_IMAGES`-tumnagel (bara `FULL_CARD_IMAGES` för
modalen) sedan de gjordes spelbara — syntes som ikon+hue-gradient istället
för en bild i hand/bräde/draftrutnät, vilket användaren upptäckte och
frågade om. Beskurna tumnaglar genererades från samma redan sparade
`card-<id>-full.jpg`-filer (ingen ny bild behövdes) och lades till i
`CARD_IMAGES`. Vaeliras och Seraphines standardbeskärning (`y=300`) klippte
av ansiktet (samma mönster som Seraph/Judgment/Fenrir tidigare) — justerad
`y`-startpunkt (150 respektive 90) tills ansiktet/kompositionen satt bra;
Nyxaras standardbeskärning fungerade direkt.

**Etapp-data** (`CAMPAIGN_STAGES`, `CAMPAIGN_STARTERS`) — alla kort-id:n
verifierade mot `HEROES`/`FOREST_FOES` innan de skrevs in (ett skript som
grep:ade båda arrayerna och diffade mot listan, för att undvika tysta
`undefined`-kort från en felstavning):

| Etapp | Fiender (FOREST_FOES) | Regler | Låser upp |
|---|---|---|---|
| 1 The Awakening | ogre, wendigo, harpy, lich, direbear | inga | templaren |
| 2 Into the Wilds | graff, twistedgipsy, medusa, maximus, ifrit | inga | naline |
| 3 The Gathering Storm | daron, darum, aurelia, tahabata, twinbrothers | Same+Plus | deathblade |
| 4 Shadows Lengthen | aurelian, vorlix, lyrith, eviltwistyang, eviltwistyin | Same+Plus | astrael |
| 5 The Old Powers | voidqueen, tiamat, bahamut, shadowking, astrael | +Combo | vorathos, tiamat |
| 6 The Final Reckoning | dragon, threeheaddragon, celestialjudgment, infiniteseraph, fenrir | +Elemental | littlejesp |
| 7 Old Rivals | twinsisters, wyrm, revenant, ferea, medusa | allt på | darien |
| 8 The Shadowblade Sisters | lyrith, aurelia, twistedgipsy, maximus, darum | allt på | vayra, ysara |
| 9 Hunter's Pact | daron, aurelian, vorlix, tahabata, ifrit | allt på | sylvarion, torn |
| 10 The Wild Hunt's Bond | bahamut, dragon, shadowking, voidqueen, fenrir | allt på | pallispell, pallis |
| 11 The Twin Storm | eviltwistyang, eviltwistyin, ifrit, bahamut, tahabata | allt på | twinbrothers, twinsisters |
| 12 Yin and Yang Resonance | medusa, lyrith, aurelia, twistedgipsy, maximus | allt på | eviltwistyang, eviltwistyin |
| 13 The Forgotten Legion | twinbrothers, twinsisters, ifrit, bahamut, tahabata | allt på | darum, daron, aurelian, vorlix |
| 14 Wardens of the Wild | darum, daron, aurelian, vorlix, tahabata | allt på | medusa, lyrith, aurelia, twistedgipsy, maximus |
| 15 Ashes and Frost | voidqueen, shadowking, dragon, fenrir, twinsisters | allt på | ferea, tilda, ifrit, bahamut, tahabata |
| 16 The Ancient Wyrmking's Domain | celestialjudgment, infiniteseraph, threeheaddragon, dragon, fenrir | allt på | dragon, shadowking, voidqueen, celestialjudgment, infiniteseraph, fenrir |

Etapp 7–10 tillkom i en uppföljande session ("gör fler nivåer") — samma
mönster, bara fler rader i `CAMPAIGN_STAGES`. Bara 4 av `FOREST_FOES`s 34
kort var fortfarande helt oanvända vid det laget (twinsisters, wyrm,
revenant, ferea) — resten av etapp 7–10s fiender är MEDVETNA återanvändningar
av redan-använda `FOREST_FOES` i nya kombinationer (samma sak spelet redan
gjorde för graff/tiamat/astrael i etapp 1–6, inget nytt mönster).

**Etapp 11–16 tillkom direkt efter, samma session** ("plus att du fortsätter"
— fortsatte utan att fråga om enskilda kort/regler den här gången, samma
mönster var redan etablerat och godkänt). Dessa sex sista etapper delar upp
och låser upp ALLA 24 återstående `HEROES`-kort — inklusive de utan
källtext för en ultimate (dragon, celestialjudgment, infiniteseraph,
threeheaddragon-relaterade shadowking/voidqueen/fenrir, ferea, tilda) och
twinbrothers/twinsisters/eviltwistyang/eviltwistyin-paren, som tidigare
medvetet sparades undan. **Kampanjen är nu KOMPLETT i den bemärkelsen att
efter etapp 16 har spelaren låst upp samtliga 43 unika `HEROES`-kort**
(5 startkort + 38 upplåsningar = 43, verifierat med samma id-kontrollskript
som alla tidigare etapper). Fiender i etapp 11–16 är, liksom 7–10, nästan
uteslutande återanvändningar av redan etablerade `FOREST_FOES`-kort i nya
kombinationer — inga fler helt fräscha `FOREST_FOES` fanns kvar att ta av
vid det här laget. Om fler etapper någonsin läggs till efter 16 måste
fiende-rostren medvetet återanvända ännu mer (eller — inte gjort —
duplicera någon av de nyare signaturkorten, t.ex. Sylvarion eller Pallis &
Pell, in i `FOREST_FOES` också, vilket skulle kräva att lägga till dem
enligt samma "signaturkort dupliceras i båda arrayerna"-konvention som
avsnitt 4 beskriver).

Testat end-to-end med Playwright (verklig UI-interaktion, inte bara
state-injicering för klick-delarna): mode-byte, etapp 1:s fasta hand,
vinst → rätt kort upplåst + rätt etapp-index + localStorage matchar exakt,
etapp 2:s väljare (6 valbara = 5 start + 1 upplåst, korrekt), start av
etapp 2 ger rätt fiendehand OCH rätt regler, förlust lämnar
etapp-index/upplåsningar helt oförändrade, en sidladdning läser tillbaka
sparad progress korrekt, "Reset Campaign" nollställer allt (med en
`confirm()`-dialog eftersom det är oåterkalleligt — enda stället i hela
spelet som använder en native browser-dialog, medvetet val för en
destruktiv engångs-handling utan befintligt modal-mönster att återanvända),
etapp 7:s fiendehand/regler efter hopp direkt till den, etapp 16:s
väljare (37 valbara = 5 start + 32 upplåsta, korrekt), och den SLUTGILTIGA
"Campaign complete"-skärmen (alla 16 etapper klarade) listar alla 43
upplåsta kort (5 start + 38 upplåsningar — HELA `HEROES`-rostret) korrekt.

**Medvetet inte byggt** (kan läggas till senare, användaren har inte bett
om det): ingen svårighetsjustering baserat på hur många försök en etapp
tagit, ingen möjlighet att byta ut redan upplåsta kort mellan etapp-försök
utan att gå via draftskärmen igen.

`#concede-btn`-texten anpassad efter läge: `state.draftMode==='campaign'
? 'Retreat to Camp' : 'Forfeit & Redraft'` — samma knapp/handler
(`resetGame()`), bara etikett-strängen ändras. Åtgärdat efter att ha
identifierats som en liten skönhetsfläck (ordvalet "Forfeit & Redraft"
antydde felaktigt att man tappade progress under en campaign-strid, trots
att beteendet redan var korrekt).

**UPPDATERING, senare session — playtester-feedback:** `resetGame()`
nollställde ALLTID `state.selected`, oavsett läge — i Campaign innebar det
att `campaign-retry-btn`/`campaign-next-btn`/`#concede-btn` (samma
`resetGame()`-anrop som ovan) tvingade spelaren att välja om alla fem kort
från grunden vid VARJE försök, även när de bara ville köra samma trupp
igen. Löst genom att `resetGame()` nu behåller `state.selected` när
`state.draftMode==='campaign'` (kopierar arrayen, rör inget annat) — Random
Draft/Choose Your Five nollställer fortfarande som förut (en riktig
"Forfeit & Redraft" ska fortfarande vara ett fräscht val). Stage 1 påverkas
inte (den tvingar redan `CAMPAIGN_STARTERS` explicit i `startCampaignBattle()`
oavsett `state.selected`), och varken "Reset Campaign" eller "Start New
Game+N" går via `resetGame()` (de sätter sin egen färska
`CAMPAIGN_STARTERS`-selektion direkt), så ingen risk för kvarvarande
ogiltiga kort-id:n efter en sådan återställning. Löser användarens
konkreta klagomål ("jag behöver välja om alla kort varje gång ... vill man
byta så kan man") — de fem senast valda kommer nu förvalda/ikryssade på
väljarskärmen, `Begin Stage N` är direkt klickbar, och man kan fortfarande
byta ut enskilda kort om man vill. Testat både direkt (`resetGame()` med
olika `draftMode`) och genom en riktig UI-klick-sekvens (Playwright:
starta etapp 2 med fem valda kort → tvinga fram en förlust → klicka på den
RIKTIGA `#campaign-retry-btn`-knappen → verifiera att draftskärmens rutnät
visar exakt fem ikryssade kort och att `#campaign-begin-btn` inte är
`disabled`) — två nya tester i `tests/game.test.mjs` (19 totalt, alla
gröna).

**Samma session, en liten skönhetsfix:** stat-siffran `10` visades som `A`
överallt (handkort, bräde, draftrutnät, kortmodalens fallback-vy) — en
gammal `const num = n => n === 10 ? 'A' : n` (klassiskt Triple
Triad-spelkortsmönster, aldrig efterfrågat i det här projektet). Borttagen
helt (funktionen och alla 8 anropsställen bytta mot att skriva `card.top`
m.fl. direkt) på användarens begäran — `10` visas nu som `10`.

**Samma session, två layout-fixar på etapp 2+-väljarskärmen, båda direkt
från fortsatt speltestning:**
1. **"Unlocked so far"-galleriet är nu ihopfällt bakom en knapp** (`📁
   Unlocked Champions (N)` / `Hide Unlocked Champions`, nytt
   `state.showUnlockedGallery`-fält, samma "extra fält i båda
   `state`-konstruktionerna"-mönster som `showSisterLore`, samma
   klick-hanterare-mönster som `sister-lore-toggle`). Motiverat av att
   galleriet bara upprepade kort som redan syns, valbara, i väljarrutnätet
   direkt nedanför (`campaignPool()` innehåller redan alla upplåsta kort)
   — ren dubblering som bara blev längre för varje etapp. Ihopfällt som
   standard; expanderar/kollapsar utan sidladdning.
2. **`Champions chosen`-raden och `Begin Stage N`-knappen flyttade uppåt**,
   till direkt efter regeltexten/galleri-knappen — FÖRE hela
   väljarrutnätet istället för efter det. Med förra sessionens
   retry-fix (kort redan ikryssade från förra försöket) innebar den gamla
   ordningen att man var tvungen att scrolla förbi hela kortgallret bara
   för att nå en knapp som oftast redan var klar att klicka. Ren
   DOM-ordning i den returnerade template-strängen i
   `renderCampaignPanel()` — `document.getElementById('campaign-begin-btn')`
   i `attachHandlers()` bryr sig inte om var i DOM:en knappen sitter, så
   ingen annan kod behövde ändras.

Testat: ett nytt test i `tests/game.test.mjs` (21 totalt, alla gröna) för
galleri-togglen (kollapsad som standard, `.campaign-unlocked-grid` finns
inte ens i DOM:en förrän expanderad, expanderar till rätt antal kort,
knapptexten växlar korrekt) + skärmdumpar som bekräftar att
`BEGIN STAGE N` nu syns ovanför kortgallret utan att scrolla.

### New Game+ (svar på "kör om med tuffare AI-händer / tills vi bygger
fler nivåer")

Ett fjärde delsystem inom Campaign, byggt som en stopgap tills fler etapper
läggs till: när `currentCampaignStage()` returnerar `null` (spelaren har
klarat alla 16 etapper) visar "Campaign complete"-skärmen nu en extra knapp,
`#campaign-ngplus-btn` ("Start New Game+N"), bredvid den befintliga "Reset
Campaign". Klick: `stageIndex` nollställs till 0, `unlocked` behålls
OFÖRÄNDRAT (alla tidigare upplåsta kort är kvar tillgängliga från start),
`ngPlus` ökas med 1, sparas till `localStorage`, `state.selected` sätts till
startkorten igen — samma 16 `CAMPAIGN_STAGES` spelas om från början, bara
med `ngPlus > 0`.

Själva svårighetshöjningen: `ngPlusBoostCard(card, ngPlus)` — om `ngPlus`
är 0, returneras kortet oförändrat (no-op för vanlig campaign och alla andra
lägen). Annars returneras en SHALLOW COPY av kortet med `+2` på alla fyra
sidor (topp/höger/botten/vänster) per NG+-cykel, cappat vid 3 cykler
(`Math.min(ngPlus, 3) * 2`, alltså max +6) så att siffrorna inte skenar vid
upprepade NG+-varv. Appliceras EXAKT ett ställe: `startBattle()`s
campaign-gren, via `.map(c => ngPlusBoostCard(c, campaignProgress.ngPlus))`
när `state.enemyHand` byggs från `currentCampaignStage().enemyIds`. Random
Draft och Choose Your Five går aldrig igenom den här kodvägen och påverkas
inte alls.

Varför shallow copy och inte mutation av `FOREST_FOES`-objekten direkt:
samma `FOREST_FOES`-kortobjekt återanvänds av `drawEnemyHand()` i de vanliga
lägena också (delad array, inte kopior per match) — att mutera dem på
plats hade läckt NG+-boosten in i Random Draft/Choose Your Five-matcher
som råkar dra samma kort efteråt. Verifierat via grep att ingen kod i
spelet jämför kortobjekt med `===` (bara `id`-strängslookups, t.ex.
`HEROES.find(h => h.id === id) || FOREST_FOES.find(f => f.id === id)` i
kortinfo-modalens lookup) — shallow-copyn stör alltså ingenting.

UI: stage-header visar `(New Game+N)` när `ngPlus > 0` (`ngTag`-variabel i
`renderCampaignPanel()`), etapp 1 får extra flavor text ("The forest
remembers you — its champions strike harder this time."), och slut-skärmen
nämner vilket NG+-varv som just klarades.

Testat med Playwright: injicerade `localStorage` med etapp 16 klarad + alla
38 kort upplåsta, laddade om, klickade fram till "Campaign complete"-skärmen
(skärmdump bekräftar alla 38 kort + "Start New Game+1"-knappen), klickade
knappen, verifierade via `page.evaluate` att `campaignProgress` blev exakt
`{stageIndex:0, ngPlus:1, unlockedCount:38}` (upplåsningar bevarade, etapp
nollställd, ngPlus rätt), skärmdump av resulterande etapp 1-i-NG+1-vy
(header visar korrekt "STAGE 1 OF 16 — THE AWAKENING (NEW GAME+1)" +
flavor-texten), startade striden och läste `state.enemyHand`s stats —
varje fiendekorts alla fyra sidor var exakt bas-värdet +2 (t.ex. `ogre`
bas `8/5/8/4` → boostat `10/7/10/6`, exakt +2 på varje sida). Inga
`pageerror`-fel under hela testkörningen.

### Etapp 17: The Triple Triad Sisters (boss-etapp, byggd från användarens egna kortdesigner)

Användaren laddade upp tre färdiga kortdesigner (Vaelira/Seraphine/Nyxara —
"Triple Triad Sisters", fullständiga bilder med namn/stats/förmågor/ultimate/
weakness redan inbakade i själva bilden) och bad om en dedikerad boss-etapp,
INTE spelbara `HEROES`-kort (bekräftat via `AskUserQuestion`). De låg
alltså bara i `FOREST_FOES`, inte i `campaignPool()`.

**UPPDATERING, en mycket senare session: OMVÄND.** Användaren bad
uttryckligen om att göra systrarna spelbara. Alla tre dupplicerades
verbatim in i `HEROES` (identisk kortdata, samma "signaturkort i båda
arrayerna"-konvention som resten av rostret) — inget motorarbete behövdes
alls, eftersom `sisterAura`/`checkSisterFlip`/`ON_PLACE_HANDLERS`/
`freeIfSistersPresent` redan läser `owner` generiskt istället för att anta
`'red'`. Etapp 17:s `unlockIds` bytte samtidigt från tomt (`[]`, "inget
kvar att dela ut") till `['vaelira','seraphine','nyxara']` — att klara
den riktiga slutbossen är nu vad som faktiskt låser upp att SPELA som den.
De finns kvar i `FOREST_FOES` precis som förut (etapp 17:s fiendehand
oförändrad). Testat: `HEROES`/`FOREST_FOES`-medlemskap för alla tre,
`sisterAura`-bonusen med en BLÅ-ägd Vaelira/Seraphine (inte bara röd),
Vaeliras placerings-bränning och Infernal Pact fungerar identiskt när
spelaren äger henne, samt en full match spelad med alla tre systrarna i
spelarens egen hand — inga `pageerror`. Ett nytt test i
`tests/game.test.mjs` (20 totalt, alla gröna).

**Kortdata**: `vaelira`/`seraphine`/`nyxara`, element fire/wind/water,
stats 10/9/10/10, 10/10/10/10 respektive 10/10/9/10 (exakt från
bilderna), `special.targets:'aoe'` på alla tre (kostnad 2/2/3 wins) — vilket
betyder att AI:ns generiska aoe-gren i `enemyTryUseSpecial()` redan kan
använda dem utan någon ny id-specifik AI-targeting-kod (samma mönster som
Medusa/Sylvarion).

**Fyra nya, generella motor-tillägg** (inga grundmotor-funktioner ändrades,
bara nya valfria fält/hakar utöver befintliga mönster):

1. **`active.sisterAura`** — generaliserar det befintliga `pairPresence`-
   mönstret från 1 partner till en lista + en "bonus per antal närvarande"-
   tabell: `{partners:[...], bonusByCount:{1:X, 2:Y}}`, läst i
   `fullEffectiveValue()` precis där `pairPresence` redan läses. Ger de tre
   systrarnas olika Sister's Bond/Empress Aura-text (Vaelira +2/+4, Seraphine
   +2/+3, Nyxara +1 per syster/+6 vid båda) utan någon ny state-tracking —
   räknas live varje strid via `sistersPresentCount()`.
2. **`checkSisterFlip()`** ("Weakness — Broken Focus") — alla tre kortens
   olika Weakness-texter (som refererar till effekttyper — försegla/rena/
   vända — som inte finns i spelet) approximerades enhetligt till EN regel,
   efter uttrycklig användarbekräftelse: flippas en syster till fiendens
   sida och sedan tillbaka till sin egen, förlorar hon -3 Power den runda
   hon återtas. Implementerat via `sisterHomeOwner`/`sisterWasCaptured`
   flaggor satta vid placering (`placeCard()`), och ett anrop till
   `checkSisterFlip(entry)` insatt efter VARJE ställe i koden som sätter
   `entry.owner = owner` — både de 2 generiska (`battleNeighbors`,
   Same/Plus-grenen i `resolveFlips`) och alla ~20 `targetEntry.owner =
   owner`-rader inne i enskilda `SPECIAL_HANDLERS` (så att t.ex. spelarens
   Graff/Lyrith/Aurelia osv. som flippar en syster också räknas). No-op för
   alla andra kort (första raden i `checkSisterFlip` filtrerar på
   `SISTER_IDS`).
3. **`ON_PLACE_HANDLERS`** — ny liten dispatch-tabell (samma mönster som
   `SPECIAL_HANDLERS`, men körs automatiskt från `placeCard()` istället för
   mot `state.wins`), för Nyxaras Void Touch och Vaeliras Undying Flame:
   väljer ett slumpmässigt fiendekort på brädet och ger -2 Power
   (`SpecialVerbs.debuff`). Vaeliras version sätter en `vaeliraBurned`-flagga
   på målet så samma kort inte kan brännas två gånger (matchar hennes
   kortartext).
4. **`special.freeIfSistersPresent`** (bara Nyxara) — Sister's Command:
   hennes Ultimate kostar 0 Wins när båda de andra systrarna är på brädet.
   Kontrolleras i `specialUsable()` (annars är knappen inte ens klickbar)
   OCH i `runSpecialResolution()` (annars dras kostnaden ändå) — samma
   `sistersPresentCount(...) >= 2`-koll på båda ställena. `special.once`
   gäller fortfarande (en gång per match, gratis eller inte).

**Medvetet flavor-only** (samma "(Flavor only — ...)"-konvention som redan
används för Ferea/Aurelia/Twisted Gipsy/Medusa m.fl.), för att hålla
tilläggets omfattning rimlig: Vaelira's Crimson Surge-korddragning (inget
card-draw-system finns i spelet), Seraphines Celestial Mark (kräver
per-mål-tracking av en framtida bonus — inte byggt) och Silver Sight (inget
dolt-kort/fog-of-war-system finns), Nyxaras Shadow Rend ("förstör svagaste
fiende vid rundvinst" — ingen generisk on-win-destroy-hook finns; hennes
Ultimate Void Dominion gör redan motsvarande sak i stor skala).

**Ultimates** (alla tre `SPECIAL_HANDLERS`-funktioner, aoe, inget
brädval): Vaeliras Infernal Pact förstör (helt, `state.board[i] = null`,
inte bara flippar) alla fiendekort på brädet + extra tur om något
förstördes. Nyxaras Void Dominion gör samma sak men ger henne själv
`+3 captureBonus` per förstört kort istället för extra tur. Seraphines
Silver Judgment nollställer alla fiendekorts positiva `captureBonus`/
`sideBonus` (tar bort deras bonusar) och ger dem sedan -2 Power, utan
sköld-koll (matchar "ignorerar alla barriärer").

**Konst**: bilderna användaren laddade upp är kompletta, redan färdig-
designade "posters" (namn/stats/förmågor redan inbakade i bilden) — sparade
rakt av som `card-vaelira-full.jpg`/`card-seraphine-full.jpg`/
`card-nyxara-full.jpg` i `FULL_CARD_IMAGES` (visas i info-modalen).
Inga `CARD_IMAGES`-tumnaglar skapades (samma fallback som många andra
`FOREST_FOES`-kort utan egen konst — ikon + hue-gradient på brädet/i handen).

**Etapp-data**: `CAMPAIGN_STAGES[16]`, `enemyIds:['vaelira','seraphine',
'nyxara','shadowking','voidqueen']` (2 redan etablerade starka fiender
fyller ut till 5), alla regler på. `unlockIds` var ursprungligen `[]`
(tomt — alla 43 `HEROES`-kort var redan upplåsta vid etapp 16, inget kvar
att dela ut; `finishGame()`s `stage.unlockIds.filter(...)` och
resultatskärmens `unlockedNames.length ? ... : ''`-villkor hanterade det
utan problem). **Ändrat i en senare session** till
`['vaelira','seraphine','nyxara']` när systrarna gjordes spelbara (se
uppdateringen ovan) — nu är de VERKLIGA belöningen för etapp 17.

Testat med Playwright: (1) ett fullständigt spelat AI-mot-AI-liknande parti
på riktig etapp 17 — inga `pageerror`, on-place-debuffarna syns tydligt i
slutresultatet (spelarens Elara/Ragnar fick `captureBonus:-2` var). (2) En
separat, deterministisk enhetstest-svit som anropar motorfunktionerna direkt
och verifierar exakta tal: `sisterAura`-bonusen adderar precis rätt (+1/+6
för Nyxara, +2/+4 för Vaelira, +2/+3 för Seraphine, mätt som differens
mellan 0/1/2 systrar närvarande), `specialUsable` tillåter Nyxaras Ultimate
vid 0 Wins bara när båda systrarna är på brädet, `checkSisterFlip` ger
exakt -3 vid återerövring (och inte vid första tillfångatagandet, och inte
igen vid en redundant omkontroll), Infernal Pact/Void Dominion förstör rätt
antal fiendekort och lämnar kastarens eget kort orört, Void Dominion ger
exakt `+3 × antal förstörda` i `captureBonus`, och Silver Judgment
nollställer en fiendes `captureBonus`/`sideBonus` innan den drar av -2.
Inga fel i någon körning.

**Etapp-banner** (senare tillägg, samma session): användaren skickade en
fjärde bild — en samlingsposter av alla tre systrarna ("Sisters of Fate")
— och frågade om den passade någonstans på sidan. Sparad som
`sisters-of-fate-banner.jpg`, kopplad via ett nytt valfritt `banner`-fält
på etapp-objektet (`CAMPAIGN_STAGES[16].banner`) och en ny `.stage-banner`
CSS-klass/render-gren i `renderCampaignPanel()` — visas direkt under
"Stage 17 of 17"-rubriken, ovanför regeltexten, bara på etapper som har
ett `banner`-fält (bara etapp 17 just nu). Rent additivt: andra etappers
render påverkas inte (`stage.banner ? ... : ''`).

CSS-bugg hittad och fixad under byggandet: `.stage-banner{overflow:hidden}`
(för rundade hörn) kolliderade med den kringliggande `.wrap`-containerns
`display:flex` — ett känt CSS-quirk där ett flex-items `min-height:auto`
tvingas till `0` så fort elementet har `overflow` satt till något annat än
`visible`, vilket kollapsade banner-boxen till en 2px-hög linje trots att
bilden själv laddades och mätte upp korrekt (bekräftat via
`getBoundingClientRect`/`getComputedStyle` i Playwright). Löst genom att ta
bort `overflow:hidden` från wrappern och lägga `border-radius` direkt på
`<img>` istället (samma resultat visuellt, ingen flex-krock).

**Uppdaterad banner + bakgrundshistoria** (ytterligare ett tillägg, samma
session): användaren skickade en förbättrad version av gruppbilden (bättre
komposition, logotyperna renare placerade) — `sisters-of-fate-banner.jpg`
ersattes rakt av, ingen kodändring behövdes eftersom filnamnet är
oförändrat. Användaren skrev också en fullständig bakgrundshistoria om de
tre systrarna (Dominion-kraften, varje systers ursprung/kraft/svaghet,
bandet mellan dem, varför de är sista bossen) och frågade om den passade
någonstans på sidan.

Löst som en ihopfällbar panel på etapp 17-skärmen: en ny `SISTER_LORE`-
konstant (array av `{title, body:[...]}`-sektioner, en per kapitel:
intro/Vaelira/Seraphine/Nyxara/"Three Sisters, One Fate"/"The Final Boss"),
kopplad till etappen via ett nytt `lore`-fält (samma additiva mönster som
`banner`). Texten är ÖVERSATT till engelska (originalet skrevs på svenska
av användaren) för att matcha att absolut all annan text i spelet — alla
kortnamn, skills, UI-strängar — redan är på engelska; bara detta
projektdokument är på svenska.

Ny `📖 Read Their Story`/`Hide Their Story`-knapp visas under bannern när
`stage.lore` finns, togglar `state.showSisterLore` (nytt state-fält,
tillagt i båda de två ställena `state` konstrueras — grundinitieringen och
`resetGame()`s återuppbyggnad). Panelen (`.lore-panel`, ny CSS) är en
scrollbar box (`max-height:420px; overflow-y:auto`) i samma
panel/border-stil som `.rules`, med kapitelrubriker i guld (`Cinzel`-typsnitt,
matchar `.poster-name-plain`). Ren flavor — ingen spellogik läser
`SISTER_LORE`.

Testat med Playwright: knappen togglar panelen korrekt (text växlar
"Read"/"Hide"), alla sex kapitel renderas med rätt rubriker/stycken,
sidan scrollar normalt, inga `pageerror`.

### Multiplayer — medvetet uppskjutet

Diskuterat men INTE påbörjat: hela spelet är idag en helt fristående
klientsida HTML-fil (ingen backend, ingen server, bara `localStorage` för
campaign-progress) — riktig multiplayer (två spelare på olika enheter)
kräver ett synk-lager av något slag. Tre vägar diskuterade:

1. **Serverless realtids-databas** (t.ex. Firebase/Supabase) — passar bra
   för ett turordningsbaserat spel som inte är latency-känsligt, ingen egen
   server att drifta, men binder spelet till en extern tjänst (API-nycklar,
   säkerhetsregler, gratisnivå-gränser).
2. **Egen WebSocket-server** — mest kontroll, men kräver riktig serverdrift
   (funkar INTE på ren statisk hosting som GitHub Pages, vilket är hur
   spelet körs idag).
3. **Peer-to-peer (WebRTC)** — ingen backend alls, men kräver någon form av
   "mötesplats" för att två spelare ska hitta varandra (signalering), och
   är klurigare att få robust.

Användarens beslut: vänta med multiplayer tills spelet är mer komplett
(mer innehåll, bättre balans) innan nätverkskomplexitet läggs till. Ingen
kod skriven för detta ännu — ren framtida bordsanteckning.

## 6. Övriga viktiga funktioner (grundmotor — rör försiktigt)

`placeCard` → `resolveFlips` → `battleNeighbors`/`computeSamePlusCaptures`
→ `fullEffectiveValue`/`effectiveValue` → `isShielded`. `enemyTurn` +
`simulateFlips` är AI:ts vanliga korthandtering (oberoende av special-AI:t).
`startBattle`/`resetGame`/`finishGame` styr fas-övergångar (`draft` →
`coinflip` → `battle` → `result`).

**Transient visuella flaggor (`justFlipped`/`shieldFlash`/`bonusFlash`/
`attackFlash`) — ett rent tillägg ovanpå grundmotorn, ändrar aldrig
vinst/förlust-logiken:** `render()` gör en FULL `app.innerHTML`-omritning
varje gång NÅGOT händer (AI-drag, knapptryck, vad som helst), så varje
`entry`-fält som styr en CSS-animationsklass (t.ex. `flipping:
cell.justFlipped` i `boardCellHtml`) måste EXPLICIT nollställas igen efter
sin animation — annars ritas animationen om PÅ NYTT vid varenda efterföljande
`render()`-anrop, för resten av matchen (hittades och fixades som en
riktig bugg för `justFlipped` — den nollställdes aldrig, så redan flippade
kort "flippade om" synligt vid varje efterföljande omritning; samma
latenta bugg fanns för `shieldFlash` när den triggades via en specialattack).
Mönstret nu: sätt flaggan när händelsen sker (`battleNeighbors`,
`SPECIAL_HANDLERS.*`, `specialBlockedByShield`), rendera EN gång, och kör
sedan en `state.board.forEach(...)`-sopning som nollställer ALLA fyra
flaggorna på HELA brädet i ett `setTimeout(...,950)` — se `placeCard`
(numret 950 valdes långt efter alla animationers egen varaktighet, 0.55s
flip / 0.4s slash / 0.9s shield-ring) och `runSpecialResolution` (samma
sopning, för specialattacker). Sopningen körs numera OVILLKORLIGT (inget
`if(flips>0 || ...)`-villkor) — annars missar man exakt den kombination av
flaggor som inte råkar matcha villkoret, vilket var precis hur
`attackFlash`-läckan skulle ha återupprepat samma bugg. **Lägg alltid till
nya transienta visuella flaggor i BÅDA dessa sopningar**, annars läcker de
på samma sätt.

`attackFlash` (satt i `battleNeighbors` för VARJE riktig batalj, vinst eller
förlust, sköldad eller ej — samt i `runSpecialResolution` för alla
`targetEntry`-specialer) driver en dubbel "slash"-svepeffekt
(`.slash-fx`/`.slash-line`, `@keyframes slashSweep`, 0.4s) som blinkar över
det ANFALLNA kortet. Ligger medvetet på ett eget FRISTÅENDE barn-element,
inte som en `animation:`-egenskap på `.card` själv — `.card.flipping`
använder redan `transform`+`filter` i sin egen `flip`-animation, och CSS
`animation`-genvägen MERGEAR INTE mellan konkurrerande regler (högst
specificitet vinner hela egenskapen, resten av reglerna ignoreras helt för
den egenskapen) — ett separat barn-element med sin egen animation undviker
hela den kategorin krockar helt.

### Rond-klockan (`state.turnCount` / `sweepExpiredRoundEffects`)

Ny, minimal primitiv för att äntligen kunna skilja "denna runda" från
"permanent" — svar på det äldsta kända problemet i avsnitt 7. Medvetet
INTE tillämpad överallt på en gång (se avsnitt 1b/7 för varför); bara
Tiamats Weakening använder den hittills, som bevis på att den fungerar och
som mall för framtida kort.

- `state.turnCount` ökar med 1 varje gång `advanceTurn` faktiskt växlar
  `state.turn` (INTE vid `extraTurnPending`-grenen, eftersom ingen
  motståndartur då hinner ske). Nollställs i båda `state`-konstruktionerna
  (grundinit + `resetGame()`), precis som alla andra transienta fält.
- **En "runda" definieras symmetriskt**: en tillfällig effekt överlever
  resten av kastarens egen tur OCH motståndarens NÄSTA tur, och tas bort
  precis när det blir kastarens tur igen (`expiresAtTurnCount = turnCount +
  2` vid skapandet). Samma regel oavsett vilken sida som kastar — testat
  explicit åt båda hållen.
- `SpecialVerbs.debuffThisRound(entry, amount)` är den enda nya verben
  hittills — samma signatur som `debuff`, men bokför en post i
  `entry.tempEffects` (`{captureDelta, expiresAtTurnCount}`).
  `sweepExpiredRoundEffects()` (anropas i `advanceTurn` direkt efter
  `turnCount++`) går igenom HELA brädet varje tursväxling och river tillbaka
  `captureDelta` för varje post vars `expiresAtTurnCount` har passerats.
- Skrivet generellt nog för framtida `directionalBoost`/`attackBoost`-
  varianter (`sideDeltas`-hantering finns redan i sopningen även om ingen
  verb sätter det ännu) — kopiera mönstret, inte bara `debuffThisRound`,
  om nästa kort behöver en tillfällig sido- eller helkorts-boost istället
  för en debuff.
- **Tiamat** (`SPECIAL_HANDLERS.tiamat`): "Defense" (`enemy -1 all sides`,
  originaltext utan tidsbegränsning) och "Weakening" (`enemy -1 all sides
  this round`) var identiska i koden innan (båda `SpecialVerbs.debuff`) —
  nu använder Weakening `debuffThisRound` och är på riktigt tillfällig,
  Defense är oförändrad (permanent). Testat direkt mot `SPECIAL_HANDLERS`
  (state-injicering, ingen UI-klick behövdes): debuffen kvarstår genom
  motståndarens svarsdrag och försvinner exakt vid kastarens nästa tur, i
  båda riktningar (blå kastar mot röd, röd kastar mot blå), Defense
  opåverkad genom samma sopningar. Även en full spelomgång kördes end-to-
  end (draft → 9 placeringar → resultat) för att bekräfta att den nya
  `turnCount++`/sopnings-koden i `advanceTurn` inte stör vanlig
  tursväxling — inga `pageerror`.

### ERÖVRAD-bannern och AOE-specialer

`runSpecialResolution`s conquest-banner-koll använde ursprungligen bara
`targetEntry.owner === owner && targetEntry.justFlipped` — fungerar för
`targets:'single'`-kort (`targetEntry` är då den fiende som eventuellt
flippades) men AOE-specialer (`targets:'aoe'`) har ingen `targetIndex` alls,
så `targetEntry` var alltid `null` för dem — bannern triggades aldrig även
när t.ex. Pallis & Pells Hunter's Wrath faktiskt erövrade kort.

Löst utan att röra en enda `SPECIAL_HANDLERS`-funktion: handlern som
FAKTISKT erövrar ett kort satte redan `entry.justFlipped = true` på den
erövrade rutan (Pallis & Pell gjorde redan detta, precis som alla
enkelmåls-kort) — kollen i `runSpecialResolution` byttes bara ut mot en
brädsvepning: `state.board.some(e => e && e.owner === owner &&
e.justFlipped && ...)`. Enda extra steget: ett snapshot av VILKA celler som
redan var flaggade `justFlipped` INNAN handlern körs (kvarlevor från en
tidigare, fortfarande-animerande händelse inom samma 1300ms-sopningsfönster,
se avsnitt 6 ovan) subtraheras bort, så en gammal flagga aldrig räknas som
en ny erövring. Fungerar nu identiskt för `single` och `aoe` utan att
handlarna behöver rapportera något extra.

Testat direkt mot `runSpecialResolution` (state-injicering): Pallis & Pells
Hunter's Wrath (AOE, faktisk erövring) → bannern visas korrekt; Deathblades
Shadow Assault (enkelmål, positionsbyte + debuff, ALDRIG en erövring) →
ingen banner, som förut; en konstruerad kvarvarande `justFlipped`-flagga
någon annanstans på brädet före en Torn-attack (AOE-debuff, erövrar aldrig
någon) → ingen falsk banner. Även en full end-to-end-match kördes om för
att bekräfta att vanlig enkelmåls-erövring fortfarande fungerar som förut.

## 7. Kända problem

- **AI:ts special-targeting** är i grunden en generisk "vinn
  styrkejämförelsen"-heuristik — Voidqueen och Tiamat har egna undantag (se
  avsnitt 5) eftersom deras mekanik inte passar den heuristiken, men nya
  kort med en icke-strid-effekt behöver samma sorts specialfall om AI:t ska
  använda dem meningsfullt. **Pallis och Naline aktiveras aldrig av AI:t**
  just nu (guardad bort för att inte krascha — se avsnitt 5) tills de får
  en egen dedikerad gren.
- **Rond-räkning finns nu (se avsnitt 6, "Rond-klockan"), men bara EN effekt
  använder den hittills** (Tiamats Weakening — se `SpecialVerbs.debuffThisRound`).
  Alla ANDRA "X denna runda"-effekter i originaltexterna (t.ex. Bahamuts
  Megaflare "+1 alla sidor denna runda om han vinner", Tiamats egna passiva
  förmågor Fivefold Catastrophe/Five Heads One Will) är fortfarande medvetet
  förenklade till permanenta — de använder samma gamla mönster som innan och
  har INTE gjorts om, för att inte ändra balansen på massvis av redan
  godkända kort utan att fråga användaren först. Flera passiva förmågor är
  fortsatt rena "(Flavor only)"-texter, inte kopplade alls (Frostmark-
  stapling på Ferea, kortstöld-från-hand på Twisted Gipsy, däckmanipulation
  på Ferea, m.fl.) — kan nu göras mer troget med rond-klockan om/när det blir
  aktuellt.
- **En automatiserad testsvit finns nu** (`tests/` + `npm test`, se avsnitt
  9) men täcker bara ett litet urval: grundmotorns flip/erövring, rond-
  klockan och conquest-bannerns AOE-fix, plus en full slumpad match end-to-
  end. Det mesta av spelets ~31 ultimates har fortfarande INGEN automatisk
  regressionstest — manuell verifiering (state-injicering + Playwright,
  kastas efter varje session) är fortsatt normen för nytt kortarbete. Bygg
  gärna ut `tests/game.test.mjs` per nytt kort istället för att bara testa
  manuellt, om det är rimligt utan att sakta ner iterationstakten för mycket.

## 8. Att göra / naturliga nästa steg (historik från ÄLDRE sessioner — se avsnitt 1b för DEN SENASTE sessionens arbete)

Inget pågående/avbrutet arbete. Den (då) senaste sessionen städade repo-roten
(tog bort ~38MB skräp/dubblettfiler), konverterade alla ogenomskinliga
helbilds-PNG:er till JPEG (~110MB besparing, ingen synlig kvalitetsskillnad),
lade till en illustrerad regelbok (📖-knapp i mastheaden, se avsnitt 3),
kopplade in `eviltwistyin`s, Pallis och Tiamats ultimates, fixade Voidqueens
AI-targeting, lade till en "+N Win!"-toast vid erövring, lade till ett helt
nytt kort (Astrael — se avsnitt 5), gjorde om **Naline** helt (ny konst,
roll, skills och en ny ultimate "Thunderstorm Assault" med
`targets:'direction'` — se avsnitt 5) på användarens begäran, och hittade +
fixade en krasch-bugg i AI:ts fallback-loop som drabbade både Pallis och
Naline (se avsnitt 5/7), gav **Deathblade** och **Vorathos** (två
befintliga placeholder-kort utan ultimate) ny konst, korrigerade
stats (Vorathos) och en fungerande ultimate var, och gjorde samma sak för
**Vayra**, **Ysara** och **Darien** (befintliga) plus **Torn** (helt nytt
kort) i en efterföljande batch, och gav sedan **Little Jesp** (befintligt,
"Ultra Legendary"-nivå) ny konst, korrigerade stats och ultimaten "Divine
Arrow" — se avsnitt 5 för alla detaljer, särskilt vilka stats som är
påhittade (Torn, delvis) vs. avskrivna vs. oförändrade (Ysara) eftersom
källbilderna varierade mycket i hur mycket speldata de faktiskt innehöll,
och den nya `active.pairPresence`-återanvändningen för Little Jesps
"Pallis & Pell"-synergi. Direkt därefter gav en efterföljande session
**Pallis & Pell** själv (befintligt kort) ny konst och dess FÖRSTA ultimate,
"Hunter's Wrath" (`targets:'aoe'`, hittar upp till 2 angränsande fiendekort
automatiskt istället för spelarval — se avsnitt 5 för varför). Uppdaterade
sedan även **Darien** (den riktiga, INTE `dariensv`) med ny konst och en
ultimate, "Shadow Breaker", och tog bort `dariensv`-dubbletten helt på
användarens begäran.

Därefter en "spelkänsla"-omgång på tre delar, allt drivet av konkret
speltestar-feedback: (1) hittade + fixade `justFlipped`-läcka-buggen som
gjorde att redan flippade kort "flippade om" synligt vid varenda
efterföljande omritning (se avsnitt 6 för hela mönstret); (2) flyttade
kortens fyra sifferbadgar från en hopträngd central klunga till kortets
faktiska fyra kanter (topp-siffran vid toppkanten, osv) efter feedback om
att det var svårt att se/tolka vilken siffra som hörde till vilken sida
(testat på draftskärm/hand/bräde, men INTE på mobilbrytpunkten först —
användaren frågade uttryckligen "är detta med på mobilen också?", vilket
avslöjade att det inte var det: vid `@media (max-width:640px)`s 44px
handkort krockade alla fyra kant-badgarna med varandra OCH med
info-knappen/stjärnorna, eftersom `.stat-n`s `clamp(17px, 22cqw, 27px)`-
golv redan är större än vad ett 44px-kort har plats för. Fixat med en
`.side-hand.hand-row .stat-n`-override inuti samma mobil-mediaquery:
mindre badgar (12px), tightare kant-marginaler, och stjärnbetyget
(`.level-stars`) dolt helt vid den bredden — samma "minst viktiga info
först"-princip som `.hand-row.enemy .card-role{display:none}` redan
använde. **Läxa: en `cqw`-baserad `clamp()`-storlek är bara responsiv
NER TILL sitt eget min-golv — under det golvet krävs en egen override per
extra-trång kontext, container-storleken ensam räcker inte.**);
(3) lade till en "slash"-svepeffekt (`attackFlash`, se avsnitt 6) som
blinkar på VARJE anfallet kort — vinst, förlust eller sköldad — inte bara
på lyckade erövringar. Direkt efter det: en bonus-effekt ovanpå slashen,
en stor "ERÖVRAD"-banner (`.conquest-banner`, `showConquestPopup(owner)`)
som blinkar till centrerad över hela brädet i ~1s varje gång NÅGON
erövrar ett kort — via vanlig placering (`placeCard`, `flips>0`) eller en
enkelmåls-special (`runSpecialResolution`). Fanns först bara som en blå,
spelar-vänd version (`conquered-badge.png`) eftersom bara den konsten
fanns — "Fiendekortet har erövrats" läses ur spelarens perspektiv, så den
visades bara för `owner==='blue'`. Användaren gjorde strax därefter en röd
motsvarighet (`conquered-badge-red.png`, samma text/komposition men i röd
palett), så nu triggas bannern för BÅDA sidor: `state.conquestPopup`
håller vilken sida ('blue'/'red') som erövrade, och `<img>`-taggens `src`
väljer rätt fil därefter (se `.conquest-banner`-CSS-kommentaren för
detaljer). Medveten begränsning vid den tidpunkten: bara enkelmåls-fall
täcktes — AOE-specialer (Pallis & Pell, Torn, Evil Twist Yin) hade ingen
`targetEntry` att kolla mot i den generiska wrappern, så de triggade den
inte. **Åtgärdat i en senare session — se avsnitt 6, "ERÖVRAD-bannern och
AOE-specialer".**

**Uppföljning samma session — tempo:** användaren tyckte fortfarande att
allt gick för fort och att kort "flippas hej vilt" när flera kort flippar
samtidigt (Same/Plus/Combo kan flippa upp till hela brädet i EN placering
— alla dessa löstes redan ut synkront i samma `resolveFlips`-anrop, så de
animerade alla i EXAKT samma ögonblick). Tre ändringar, alla presentation-
lager ovanpå grundmotorn (grundmotorns faktiska utfall — vem äger vilken
ruta till slut — är HELT oförändrat, bara NÄR/HUR resultatet visas):

1. **Stegrad flip/slash** (`--fx-delay` CSS custom property, satt via
   inline `style` i `cardFace()`, läst av `.flipping`/`.slash-line`s
   `animation-delay`): varje kort som flippar i samma placering (Same/Plus-
   loopen i `resolveFlips`, vanlig strid i `battleNeighbors`, Combo-kedjan
   som anropar `battleNeighbors` upprepade gånger) får ett stigande
   `fxDelay = min(result.flipSeq++, FX_STAGGER_CAP) * FX_STAGGER_MS`
   (130ms/steg, taket på 5 steg förhindrar att en extrem kedja drar ut
   animationen orimligt länge). `result.flipSeq` är EN delad räknare på
   `result`-objektet som redan skickas mellan alla tre källorna, så
   ordningen blir naturligt kronologisk (Same/Plus "händer" konceptuellt
   före den vanliga striden, Combo rippel-effekten sist).
2. **Längre "ERÖVRAD"-banner**: `CONQUEST_BANNER_MS` 1000ms → 1400ms
   (måste hållas i synk med `.conquest-banner`s `conquestPop`-animations
   egna `1.4s`-längd i CSS:en — ingen delad konstant mellan JS och CSS
   här, bara en kommentar på båda ställena som påminner om det).
3. **AI:t väntar längre innan sitt drag OM spelaren precis erövrade något**:
   `advanceTurn` läser `state.conquestPopup` (redan `'blue'`/`'red'`/
   `false` från förra ändringen) för att välja fördröjning —
   `CONQUEST_BANNER_MS + 200` (~1.6s) om en banner just visades, annars
   oförändrade 700ms som förut (inget att hinna ikapp om placeringen inte
   erövrade något). Gäller båda ställena `enemyTurn` schemaläggs från i
   `advanceTurn` (normal tur-växling OCH extraTurnPending-grenen).

Städ-sopningarna i `placeCard`/`runSpecialResolution` (avsnitt 6) fick
samma behandling som `justFlipped` m.fl. redan hade: nollställer nu även
`fxDelay`, och tidpunkten flyttades 950ms → 1300ms för att rymma värsta
fall (5 steg × 130ms + .55s flip ≈ 1.2s) med marginal. Testat med
Playwright: en tre-korts samtidig-flip visar synligt att korten flippar i
sekvens (inte samtidigt), och AI:ts drag mättes faktiskt vänta till
~1.6s efter en spelar-erövring men fortfarande köra på ~700ms-vägen när
placeringen inte erövrade något.

**Sylvarion** (befintligt kort, `id:'sylvarion'`) fick ny konst
(`card-sylvarion-full.jpg` + omklippt `cards/card-sylvarion.jpg`, ersatte
en gammal GitHub-UUID-fil) och sin FÖRSTA ultimate, "Tempest Volley".
Ovanligt fall: användaren skickade den nya kortbilden MITT I en pågående
tur — hann redan fråga användaren vilket av de 13 ultimate-lösa korten som
skulle prioriteras (svar: Sylvarion, eftersom hennes GAMLA flavor-text
redan lät som en ultimate som väntade på att hända) INNAN den nya bilden
dök upp med en riktig "Special Attack"-sektion, vilket gjorde hela den
plan-syntes-från-flavor-text-idén överflödig — byggde ultimaten direkt
från källtexten istället, som med alla andra kort. Stats (10/8/10/9)
matchade redan exakt, ingen ändring. Källtexten: "Sylvarion skjuter upp en
storm av 5 pilar mot fienden... Varje pil väljer slumpmässigt ett
fiendekort och träffar med SANN SKADA. Ingen kan undgå stormens vrede."
— `targets:'aoe'` (ingen spelarvalsmöjlighet, precis som Torn/Pallis &
Pell), handler slumpar EN fiende per pil (5 oberoende slumpdrag, `Math.random`),
`SpecialVerbs.debuff(mål, 1)` per träff — helt ovillkorligt, INGEN
`specialBlockedByShield`-koll (matchar "sann skada"/"ignorerar försvar"-
temat som går igen i flera av hennes ANDRA skills). Samma kort kan träffas
av flera pilar (testat: 5 pilar mot 2 fiender gav t.ex. en 4/1-fördelning),
vilket är en medveten tolkning av "varje pil väljer slumpmässigt" — inte
uttryckligen sagt i källan men den mest bokstavliga läsningen. Skadan per
pil (-1) är påhittad (källan ger bara "sann skada", ingen siffra).
Kostnaden "5 Energi" i källtexten mappades rakt av till `cost:5` i
motorns enda delade resurs (Wins) — spelet har inget separat
energi-system, så "Energi" här läses som samma sak som "Wins" överallt
annars, bara ett annat ord i just den här bild-genereringen. Källkortet
har OVANLIGT MÅNGA extra skills (5 "Triad Arena Skills" + 4 "Passiva
Förmågor", 9 totalt) som refererar system som inte finns — ett separat
energi/runda/attack-räknare-system, korthandsvisning av fiendens hand,
kortdragning — alla bevarade som flavor-only-text i `skills`-arrayen
(ingen struken, matchar principen att spara ALL källtext även när inget
går att koppla in). Inget av nedan är bekräftat av
användaren, bara idéer:

- **Fler ultimates — men fyra kort är medvetet hoppade över, inte bara
  oprioriterade:**
  - `celestialjudgment` och `infiniteseraph` har **ingen** "Special Attack:"
    -textrad i `skills` alls (till skillnad från vad ett tidigare utkast av
    det här dokumentet påstod) — att koppla in en ultimate här betyder att
    HITTA PÅ en ny effekt från grunden, inte "koppla in befintlig text". Det
    är ett designbeslut, inte ett implementationsjobb — fråga användaren
    vad de ska göra innan ni skriver kod. **UPPDATERING, en senare session:
    LÖST för dessa två (plus `fenrir`, som var i samma läge) — användaren
    laddade upp fullständiga nya poster-bilder med riktiga ultimates för
    alla tre. Se avsnitt 5, underrubriken om Tiamat/Judgment/Seraph/Fenrir.**
  - `threeheaddragon`s gamla "Trinity Apocalypse" (`skills`-texten fanns)
    sa ordagrant "Takes control of every card on the board" — en bokstavlig
    implementation låg nära en ögonblicksvinst-knapp för 3 wins. **UPPDATERING,
    samma senare session som ovan: LÖST — användaren laddade upp en helt ny
    poster med en mycket rimligare ultimate ("Apokalyps": alla fiendekort
    -3 alla sidor i EN runda), som ersatte hela det gamla kortet (konst,
    passiv, alla fyra skills). Se avsnitt 5.**
  - `dragon` (Ancient Wyrmking) har ingen special-textrad alls, bara en
    passiv `Ancient Shield` — samma läge som `celestialjudgment`/
    `infiniteseraph`/`threeheaddragon` var i (se uppdateringarna ovan;
    `dragon` är nu ENDA kortet i hela rostret som fortfarande väntar på ett
    sådant designbeslut).
- **Bättre AI-targeting** för framtida icke-strid-specialattacker (se
  avsnitt 5/Kända problem för mönstret — Voidqueen och Tiamat har redan
  egna undantag).

## 9. Beroenden och arbetsflöde

- **Inga externa beroenden i produkten**: allt är vanilla JS/CSS/HTML i en
  fil. Typsnitt (Cinzel + Spectral) laddas via `@import` från Google Fonts.
  De flesta ljudeffekter genereras med Web Audio API; ett fåtal Ultimates
  har numera riktiga inspelade filer också (`voices/*.mp3` för röstlinjer,
  `sfx/*.mp3` för impact-effekter — se avsnittet om fas 4c/4d/4e).
  Bakgrundsmusik är `ancient-mysteries.mp3`.
- **Repo**: GitHub `littlejesp/Triad-arena`. Varje session får en egen,
  automatiskt tilldelad arbetsbranch (namnet skiftar per session — kolla
  `git branch --show-current`). Arbetsflöde hittills: committa på den
  branchen, `git fetch origin main && git checkout -B main origin/main &&
  git merge --no-edit <arbetsbranch> && git push origin main`, sen
  `git checkout <arbetsbranch>` igen. Fråga användaren om detta fortfarande
  är rätt flöde om lång tid gått.
- **Testverktyg** (bara för utveckling, inte del av produkten): Python
  (`http.server`) eller Node (se `tests/server.mjs`) för att servera filen
  lokalt + Playwright/Chromium för att klicka igenom flöden och ta
  skärmdumpar. Skriv alltid ett `node --check` på det extraherade
  `<script>`-innehållet innan commit (script-taggens innehåll, se tidigare
  sessioner för exakt kommando).
- **Automatiserad testsvit** (`package.json` + `tests/`, tillagd en senare
  session — se avsnitt 6 för VAD den täcker): `npm install && npx
  playwright install chromium && npm test`. Node:s inbyggda testrunner
  (`node --test`, inga extra testberoenden behövs utöver Playwright självt)
  + riktig headless Chromium som laddar `index.html` från en liten
  Node-server (`tests/server.mjs`) och anropar motorns globala
  funktioner/`state` direkt via `page.evaluate(...)` — samma
  "state-injicerings"-stil som redan användes för manuell testning i
  tidigare sessioner (se t.ex. Pallis & Pell-testerna i avsnitt 5b), bara
  permanent i repot istället för ett engångsskript i `/tmp`. Blockerar
  Google Fonts-`@import`:et (och all annan extern trafik) per sida så
  testerna kör snabbt och offline (~1s/test istället för ~13s). Täcker inte
  UI-klick/DOM-rendering, bara motorlogiken — se testfilens egen
  toppkommentar. `node_modules/` är gitignorat, `playwright` är den enda
  dev-dependencyn.
- **Bildbeskärning**: fullbilder är 941×1672. Standardbeskärning för
  thumbnails: `crop((140,300)-(800,731))` → resize till 640×418, kvalitet 90.
  Justera y-start (±30-100px) om ansiktet hamnar för högt/lågt eller om
  korttext syns i beskärningen.

## 10. Snabbstart för nästa session

1. Läs det här dokumentet (`PROJECT.md`) — det är den primära kontexten.
   Börja med **avsnitt 1b** för en snabb status, läs sedan avsnitt 5b
   (Campaign/NG+/Triple Triad Sisters) i detalj innan du rör något av det.
2. `git log --oneline -20` för att se allt som redan är gjort sedan detta
   skrevs (bör visa merge-historiken till `main`, inget okänt).
3. Fråga användaren vad de vill bygga härnäst. Naturliga kandidater just nu:
   spela in NG+/etapp 17-balans-feedback, fler campaign-etapper (18+),
   koppla in fler "(Flavor only)"-förmågor, eller multiplayer (medvetet
   uppskjutet, se avsnitt 5b — bygg INTE detta utan att fråga först, det är
   en stor arkitekturändring).

## 11. Lore-bibel: de pack-exklusiva karaktärernas sammankopplade värld

**Viktig regel från användaren, verbatim i andemening**: dessa karaktärer
är INTE separata one-off-berättelser. De ska visa sig vara delar av SAMMA
värld och samma större konflikt. Varje nytt kort ska fråga "vad har den
här personen för koppling till världen/de andra karaktärerna/den större
konflikten?", inte bara "här är en cool ny figur". Lore byggs lager för
lager, och gamla karaktärers historier kan återupptas när nya kort
kopplar an till dem. Användaren skickar ibland lore skriven av ChatGPT
för att sammanfatta — **ta det som förslag/utkast att tolka, inte som
absolut sanning ordagrant**, särskilt om något motsäger vad användaren
själv redan bekräftat direkt i chatten (se t.ex. Faragon/Reaper-fallet
nedan, där ett ChatGPT-utkast antydde att de var samma person, men
användaren bekräftade explicit "Dom är helt olika personer").

**Etablerade kopplingar (bekräftat av användaren):**

- **Dragon** — Den fallne lansriddaren. Bär mörk rustning med
  drakmotiv/-gravyrer (INTE en bokstavlig drake — bara symboliken). Har en
  bror: **Faragon**.
- **Faragon** — Dragons bror, men en HALVGUD, en helt annan person än
  Reaper (bekräftat explicit av användaren — tidigare i sessionen gissade
  Claude fel att Reaper var "brodern"). Slåss med ett enormt lie-liknande
  lansvapen, attackerar från luften och störtar ner som ett gudomligt
  projektil ("Himlen öppnar sig — och Faragon faller ner"). Se kortet
  själv (Fas 46) för mekanikerna.
- **Reaper** (The Fallen Seraph) — förblir sin egen, fristående figur;
  INTE Dragons bror trots den tidigare (felaktiga) antagandet tidigt i
  sessionen. Ingen bekräftad familjekoppling till Dragon.
- **Freya** — Får liv att blomstra vid beröring, en skönhet utan dess
  like, tar hand om en gammal kyrka. Har börjat få känslor för en ung man
  hon träffat där — det är **Zidane**.
- **Zidane** — Soldat/krigare som kämpar för fred, populär, vapen
  inspirerat av FFIX men ska få sin egen lore-identitet över tid. Vet
  inte vad han vill: fokuserar på att rädda världen men har börjat få
  känslor för **Ruby** (inte Freya, som han ändå träffat i kyrkan — en
  medveten kärlekstriangel).
- **Ruby** — Gudarnas kallerska, en summoner som kan tillkalla gudomliga
  väsen. Det är henne Zidane egentligen dras till.
- **Gudomliga krafter i världen** (samma "kategori" narrativt, och nu
  även KODMÄSSIGT via `role`-taggen "Mythic Card"/"Mystic Card" som Rubys
  Godly Kinship-mekanik läser av): Faragon (halvgud), Ruby (kan kalla på
  gudar), Freya (livets/blomstringens kraft, om än inte kod-taggad som en
  "gud" — hennes kraft är egen, inte gudomligt lånad).
- **Kade** ("Den överlevande krigaren", tidigare bara "ghetto-killen
  med hunden") — Har varit nära döden fyra gånger och överlevt varje
  gång; många ser ner på honom men hans överlevnad + personliga
  förändring motbevisar det. Ärrad, till kropp och liv. Har en mystisk
  förmåga att se glimtar av möjliga framtider när han sitter ensam i
  mörka gränder (redan kodad som `Special Attack: Glimpse of Dawn`).
- **Selene** ("Hans kärlek — Vi mot världen") — Kades flickvän, italiensk,
  dömer honom inte för hans förflutna utan ser vem han faktiskt är. Deras
  relation: "vi mot världen." De har en hund tillsammans (synlig i
  kortkonsten, ingen egen spelmekanik).
- **Vaseir** — Enorm, fruktad orm som vaktar en legendarisk skatt (som
  också bär hans namn). Är själva barriären mellan världen och skatten,
  inte "bara" en fälla — alla som försökt ta skatten har blivit mat.
- **Balalajka** — Vaseirs bror, kaotisk och musikälskande till skillnad
  från broderns tystnad/beräknande brutalitet. Lockar offer med sin
  musik snarare än att bara krossa dem. Tror kanske själv att han är
  familjens stora geni.
- **Bram** ("The Last Toast"), **Brommi** ("The Little Toast"),
  **Sakura** ("The Drunken Sister") och **Akari** ("The Cruel Drunken
  Sister") — fyra syskon, en berusad kung fu-familj (酔拳, "Drunken
  Fist"). Bram/Brommi bekräftat bröder via kortens egen "弟"-stämpel;
  Sakura och Akari bekräftade som systrar direkt av användaren
  (`AskUserQuestion` respektive "Elaka systern" i chatten). Akari bär
  sin egen "悪" (ond)-stämpel — familjens svarta får. Alla fyra delar
  samma `sisterAura`-bindning (skalar med hur många syskon som är på
  brädet). Ingen kopplad lore-tråd till övriga karaktärer ännu — ett
  eget litet hörn av världen, inte forcerat ihop med de andra.

**Tre narrativa "kluster" hittills** (per användarens egen taxonomi):
krigare (Dragon, Zidane, Kade), gudomliga krafter (Faragon, Ruby, Freya),
mörka väktare (Vaseir, Balalajka) — plus en andra kärleks-/relationsnivå
ovanpå (Freya→Zidane→Ruby-triangeln; Kade↔Selene "vi mot världen";
Vaseir↔Balalajka som bröder). Framtida kort bör fortsätta koppla an hit
istället för att starta ett helt nytt, orelaterat hörn av världen —
fråga användaren om ett nytt kort ska koppla till en EXISTERANDE tråd
om det inte är uppenbart.
