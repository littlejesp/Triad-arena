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

**Klart: en liten motor/kvalitet-lista, vald av användaren efter att ha
bett om förbättringsförslag.** Allt nedan är COMMITTAT på sessionens
feature-branch men INTE ÄNNU MERGAT till `main` — fråga användaren
explicit innan merge (aldrig anta tillstånd från en tidigare merge).

- ✅ **Rond-räkningssystem** — se ny underrubrik i avsnitt 6 och
  uppdaterad post i avsnitt 7. Tiamats Weakening/Defense är första och
  hittills enda kortet som använder det.
- ✅ **AOE-specialer triggar nu "ERÖVRAD"-bannern** — se avsnitt 6
  ("ERÖVRAD-bannern och AOE-specialer").
- ✅ **Automatiserad testsvit** — `package.json` + `tests/` tillagt, se
  avsnitt 9 för hur man kör den och avsnitt 7 för vad den (ännu inte)
  täcker.

Parallellt, INTE en del av den här listan: användaren håller själv på att
göra om 5 befintliga kort till bossar (bekräftat att varken Ferea eller
Twisted Gipsy är bland dem, så deras "Flavor only"-kopplingar i avsnitt 8
är fortfarande fritt fram att göra separat om det blir aktuellt). Inget
kortarbete påbörjat härifrån ännu — vänta på att användaren skickar
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
battle-theme.mp3     Bakgrundsmusik (loopar), spelas via <audio id="bgm">.
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

**31 av 44 HEROES-kort har en fungerande ultimate just nu:**
Graff, Lyrith, Aurelia, Medusa, Maximus, Twisted Gipsy, Darum, Daron, Ifrit,
Bahamut, Aurelian, Vorlix, Voidqueen, Tahabata, Twin Brothers, Twin Sisters,
Evil Twist Yang, Evil Twist Yin, Pallis, Tiamat, Astrael, Naline, Deathblade,
Vorathos, Vayra, Ysara, Torn, Little Jesp, Pallis & Pell, Darien, Sylvarion.

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
Tiamat (bypassar choice-pickern helt, går rakt på Dominance). Lägg nya
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
eller oavgjort).

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
  "Choose Your Five" (`.draft-grid .card.selectable`-klick-toggle), bara
  begränsat till `campaignPool()` (startkort + `campaignProgress.unlocked`)
  istället för hela `HEROES`.
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
INTE spelbara `HEROES`-kort (bekräftat via `AskUserQuestion`). De ligger
alltså bara i `FOREST_FOES`, inte i `campaignPool()`.

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
fyller ut till 5), alla regler på, `unlockIds:[]` (tomt — alla 43
`HEROES`-kort är redan upplåsta vid etapp 16, så det finns inget kvar att
dela ut; bekräftat säkert eftersom `finishGame()`s
`stage.unlockIds.filter(...)` och resultatskärmens
`unlockedNames.length ? ... : ''`-villkor båda hanterar en tom array utan
problem).

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
    vad de ska göra innan ni skriver kod.
  - `threeheaddragon`s "Trinity Apocalypse" (`skills`-texten finns) säger
    ordagrant "Takes control of every card on the board" — en bokstavlig
    implementation är nära ett ögonblicksvinst-knapp för 3 wins och
    riskerar att göra spelet meningslöst. Kräver ett balansbeslut från
    användaren om hur kraftig effekten faktiskt ska vara innan den kodas.
  - `dragon` (Ancient Wyrmking) har ingen special-textrad alls, bara en
    passiv `Ancient Shield` — samma läge som celestialjudgment/infiniteseraph.
- **Bättre AI-targeting** för framtida icke-strid-specialattacker (se
  avsnitt 5/Kända problem för mönstret — Voidqueen och Tiamat har redan
  egna undantag).

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
