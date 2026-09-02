# Triad Arena — projektdokument

> Läs det här dokumentet först i en ny session. Det är den primära kontexten —
> börja inte om från noll, fortsätt där vi slutade.

## 1. Kort sammanfattning

Ett webbaserat 1v1-kortspel i Triple-Triad-stil: ett 3×3-bräde, du (blå) mot en
AI-motståndare ("Forest", röd). Kort har fyra sidor (upp/höger/ner/vänster).
När du placerar ett kort jämförs dess sidor mot angränsande fiendekort — vinner
din sida flippas fienden till din färg. Flest rutor när brädet är fullt vinner.

Hela spelet är **en enda fil**, `index.html` (~2 800 rader): HTML-skal, all CSS
i en `<style>`-tagg, all JS i en `<script>`-tagg. Inga byggsteg, inga npm-paket,
inget ramverk. Öppnas direkt i webbläsaren eller serveras som valfri statisk
fil (t.ex. GitHub Pages).

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
rulebook-cover.jpg,   Regelbokens sidor (📖-knapp i mastheaden). En bild per
rulebook-page-*.jpg  sida, listade i JS-arrayen RULEBOOK_PAGES i den ordning
                     de bläddras. Lägg till en ny sida genom att generera en
                     matchande bild och lägga till filnamnet i den arrayen.
battle-theme.mp3     Bakgrundsmusik (loopar), spelas via <audio id="bgm">.
README.md            Minimal, oanvänd för kontext — använd det här dokumentet.
```

## 4. Kortdata — hur ett kort ser ut

Varje kort är ett objekt i arrayen `HEROES` (42 kort — spelarens dragbara pool)
eller `FOREST_FOES` (33 kort — fiendens pool, en delmängd av HEROES + monster).
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
  (välj ett fiendekort) eller `'aoe'` (löser ut direkt, inget mål).
- `skills` = ren text som visas i kortmodalen. De flesta korten har EN rad som
  börjar med `"Special Attack: <Namn>"` — det är källtexten för `special`.
  Många passiv-/skill-rader är märkta "(Flavor only — not currently wired
  into the battle engine.)" — det betyder exakt vad det står.

## 5. Specialattack-arkitekturen (viktigast att förstå)

**18 av 42 HEROES-kort har en fungerande ultimate just nu:**
Graff, Lyrith, Aurelia, Medusa, Maximus, Twisted Gipsy, Darum, Daron, Ifrit,
Bahamut, Aurelian, Vorlix, Voidqueen, Tahabata, Twin Brothers, Twin Sisters,
Evil Twist Yang, Evil Twist Yin.

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

**`requiresPartner`** i `special`-metadata (bara Evil Twist Yang just nu,
kräver `eviltwistyin` på brädet) gör kortet olåsbart förrän partnern finns på
brädet — kollas centralt av `specialUsable(card, owner)`, som är EN funktion
som styr allt: diamant-läge, `executeSpecial`, AI:t, `hasFurtherAction`. Ändra
bara här om reglerna för "kan aktiveras" ska ändras.

**AI:t** (`enemyTryUseSpecial`, anropas från `enemyTurn`) använder en generisk
girig heuristik: leta upp ett vinnbart mål (styrkejämförelse) eller aktivera
AOE alltid om en fiende finns. Inte skräddarsytt per kort — se Kända problem.

## 6. Övriga viktiga funktioner (grundmotor — rör försiktigt)

`placeCard` → `resolveFlips` → `battleNeighbors`/`computeSamePlusCaptures`
→ `fullEffectiveValue`/`effectiveValue` → `isShielded`. `enemyTurn` +
`simulateFlips` är AI:ts vanliga korthandtering (oberoende av special-AI:t).
`startBattle`/`resetGame`/`finishGame` styr fas-övergångar (`draft` →
`coinflip` → `battle` → `result`).

## 7. Kända problem

- **AI:ts special-targeting** är en generisk "vinn styrkejämförelsen"-
  heuristik — fungerar men är inte optimerad för icke-strid-effekter som
  Voidqueens adjacency-debuff (AI:t kan välja ett tekniskt "vinnbart" mål som
  råkar sakna angränsande fiender, och då göra ingenting den turen).
- **Ingen rond-räkning** finns i motorn. Alla "X denna runda"-effekter i
  originaltexterna är förenklade till "resten av matchen" (permanent). Flera
  passiva förmågor är rena "(Flavor only)"-texter, inte kopplade alls
  (Frostmark-stapling på Ferea, kortstöld-från-hand på Twisted Gipsy,
  däckmanipulation på Ferea, m.fl.).
- **Ingen automatiserad testsvit i repot.** All verifiering görs manuellt per
  session: en tillfällig `python3 -m http.server` + Playwright-skript i
  `/tmp` (kastas vid sessionsslut). Se avsnitt 9 om ni vill återskapa flödet.

## 8. Att göra / naturliga nästa steg

Inget pågående/avbrutet arbete. Senaste sessionen städade repo-roten
(tog bort ~38MB skräp/dubblettfiler), konverterade alla ogenomskinliga
helbilds-PNG:er till JPEG (~110MB besparing, ingen synlig kvalitetsskillnad),
lade till en illustrerad regelbok (📖-knapp i mastheaden, se avsnitt 3) och
kopplade in `eviltwistyin`s ultimate. Inget av nedan är bekräftat av
användaren, bara idéer:

- **Fler ultimates.** 24 HEROES-kort saknar fortfarande `special`. Kort som
  redan HAR en "Special Attack:"-textrad i `skills` men inte är inkopplade:
  `tiamat` (komplex, 5 valbara effekter), `pallis` (buffar ett helt
  element — kräver en ny "välj element"-UI, inte bara ett brädmål),
  `threeheaddragon`/`dragon` (tar kontroll över hela brädet — stor effekt),
  `celestialjudgment`, `infiniteseraph`.
- **Bättre AI-targeting** för icke-strid-specialattacker (se Kända problem).
- **Wins-popup/toast** vid intjänad win — nämndes tidigt som möjlig "quick
  win", aldrig byggd (bara wins-raden i scoreboard uppdateras just nu).

## 9. Beroenden och arbetsflöde

- **Inga externa beroenden i produkten**: allt är vanilla JS/CSS/HTML i en
  fil. Typsnitt (Cinzel + Spectral) laddas via `@import` från Google Fonts.
  Ljudeffekter genereras med Web Audio API (ingen extern SFX-fil);
  bakgrundsmusik är `battle-theme.mp3`.
- **Repo**: GitHub `littlejesp/Triad-arena`. Varje session får en egen,
  automatiskt tilldelad arbetsbranch (namnet skiftar per session — kolla
  `git branch --show-current`). Arbetsflöde hittills: committa på den
  branchen, `git fetch origin main && git checkout -B main origin/main &&
  git merge --no-edit <arbetsbranch> && git push origin main`, sen
  `git checkout <arbetsbranch>` igen. Fråga användaren om detta fortfarande
  är rätt flöde om lång tid gått.
- **Testverktyg** (bara för utveckling, inte del av produkten): Python
  (`http.server`) för att servera filen lokalt + Playwright/Chromium
  (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, flagga
  `--no-sandbox`) för att klicka igenom flöden och ta skärmdumpar. Skriv
  alltid ett `node --check` på det extraherade `<script>`-innehållet innan
  commit (script-taggens innehåll, se tidigare sessioner för exakt kommando).
- **Bildbeskärning**: fullbilder är 941×1672. Standardbeskärning för
  thumbnails: `crop((140,300)-(800,731))` → resize till 640×418, kvalitet 90.
  Justera y-start (±30-100px) om ansiktet hamnar för högt/lågt eller om
  korttext syns i beskärningen.

## 10. Snabbstart för nästa session

1. Läs det här dokumentet (`PROJECT.md`) — det är den primära kontexten.
2. `git log --oneline -20` för att se allt som redan är gjort sedan detta
   skrevs.
3. Fråga användaren vad de vill bygga härnäst, eller föreslå något från
   avsnitt 8 om de inte har något specifikt i åtanke.
