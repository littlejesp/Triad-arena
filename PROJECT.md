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
conquered-badge.png  "ERÖVRAD"-bannern (.conquest-banner) som blinkar till
                     över brädet vid en spelar-erövring — PNG, samma skäl
                     (verklig alfa-transparens runt konstverket).
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

**30 av 44 HEROES-kort har en fungerande ultimate just nu:**
Graff, Lyrith, Aurelia, Medusa, Maximus, Twisted Gipsy, Darum, Daron, Ifrit,
Bahamut, Aurelian, Vorlix, Voidqueen, Tahabata, Twin Brothers, Twin Sisters,
Evil Twist Yang, Evil Twist Yin, Pallis, Tiamat, Astrael, Naline, Deathblade,
Vorathos, Vayra, Ysara, Torn, Little Jesp, Pallis & Pell, Darien.

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

## 7. Kända problem

- **AI:ts special-targeting** är i grunden en generisk "vinn
  styrkejämförelsen"-heuristik — Voidqueen och Tiamat har egna undantag (se
  avsnitt 5) eftersom deras mekanik inte passar den heuristiken, men nya
  kort med en icke-strid-effekt behöver samma sorts specialfall om AI:t ska
  använda dem meningsfullt. **Pallis och Naline aktiveras aldrig av AI:t**
  just nu (guardad bort för att inte krascha — se avsnitt 5) tills de får
  en egen dedikerad gren.
- **Ingen rond-räkning** finns i motorn. Alla "X denna runda"-effekter i
  originaltexterna är förenklade till "resten av matchen" (permanent). Flera
  passiva förmågor är rena "(Flavor only)"-texter, inte kopplade alls
  (Frostmark-stapling på Ferea, kortstöld-från-hand på Twisted Gipsy,
  däckmanipulation på Ferea, m.fl.). Konkret exempel på hur detta urvattnar
  korddesign: Tiamats "Defense" och "Weakening"-val i Fivefold Apocalypse var
  i originaltexten skilda (en permanent, en "this round") men blir samma
  kod-effekt (`SpecialVerbs.debuff`) här — se `SPECIAL_HANDLERS.tiamat`.
- **Ingen automatiserad testsvit i repot.** All verifiering görs manuellt per
  session: en tillfällig `python3 -m http.server` + Playwright-skript i
  `/tmp` (kastas vid sessionsslut). Se avsnitt 9 om ni vill återskapa flödet.

## 8. Att göra / naturliga nästa steg

Inget pågående/avbrutet arbete. Senaste sessionen städade repo-roten
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
att det var svårt att se/tolka vilken siffra som hörde till vilken sida;
(3) lade till en "slash"-svepeffekt (`attackFlash`, se avsnitt 6) som
blinkar på VARJE anfallet kort — vinst, förlust eller sköldad — inte bara
på lyckade erövringar. Direkt efter det: en bonus-effekt ovanpå slashen,
en stor "ERÖVRAD"-banner (`conquered-badge.png`, `.conquest-banner`,
`showConquestPopup()`) som blinkar till centrerad över hela brädet i ~1s
varje gång SPELAREN (inte AI:t) erövrar ett kort — via vanlig placering
(`placeCard`, `flips>0 && owner==='blue'`) eller en enkelmåls-special
(`runSpecialResolution`). Medveten begränsning: bara enkelmåls-fall
täcks — AOE-specialer (Pallis & Pell, Torn, Evil Twist Yin) har ingen
`targetEntry` att kolla mot i den generiska wrappern, så de triggar den
inte; skulle kräva att varje handler själv rapporterade vilka index som
flippades. Bannern är avsiktligt EN-SIDIG (bara blå/spelar-erövringar) —
själva konstverket är skrivet ur spelarens perspektiv ("Fiendekortet har
erövrats"), så att visa den vid AI:ts erövringar hade sett fel ut; AI:ts
egna erövringar har ändå redan flip-animationen, erövringsringen (röd) och
slash-effekten. Inget av nedan är bekräftat av användaren, bara idéer:

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
