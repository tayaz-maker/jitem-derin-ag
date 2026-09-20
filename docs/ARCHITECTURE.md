# Mimari — Derin Ağ Phase 2

Üç çekirdek **yeniden yazılmaz**; genişletilir.

1. Research DB (`src/game/db/`)
2. Koşullu event engine (`src/game/sim/families.ts` + `engine.ts`)
3. Asimetrik faction AI (`src/game/sim/factions.ts` + `knowledge.ts`)

Tur döngüsü `src/game/engine.ts` içinde ince sargı: olay → duruş → işler → faction/side/soruşturma/kaynak tick → çözüm veya bitiş.

```
src/game/
  db/            araştırma kayıtları + hydrate + validate
  sim/           rng, family, faction, memory, edges, investigation, save, recap
  data.ts        grafik yerleşim, iş tanımları, 10 tur omurga
  engine.ts      tur döngüsü
  store.ts       zustand + localStorage
  types.ts       şema, SAVE_KEY, ActionId
```

UI: `src/components/game/`. Mobil beş sekme `GameApp`. Olay duruşu `EventModal` overlay.

Auth ve Postgres **kapalı**. `src/lib/auth` ve `src/lib/db` iskele durur; oyun onları kullanmaz.

## Research DB

Kayıt türleri: person, org, place, claim, relation, history, source.

Zorunlu disiplin:

- `sourceIds` boş olamaz
- `evidence` / `evidenceLevel`
- `provenance.historicalFact` / `sourceClaim` / `gameReconstruction` / `contradictions[]`
- `fiction: false` (bu katalogda kurgusal kişi yok)
- `motivation.kind`: `sourced` | `gameAssumption` | `unknown`

`hydrate.ts` eksik etiketleri kaynak kataloğundan doldurur. `validate.ts` kaynaksız kaydı error sayar.

Oyun grafı `data.ts` içindeki `NODES` / `EDGES` playId üzerinden DB’ye bağlanır (`RESEARCH_BY_PLAY`).

## Koşullu event engine

`EventFamily`:

- `turnWindow`, `act`, `historicalAnchor`
- `triggers` + opsiyonel `prerequisites`, `requiredKnowledge`, `factionState`, `actorState`, `relationshipState`, `playerHistory`
- `exclusivity`, `cooldown`, `followUps`
- `variants[]` ağırlıklı; `when` ile süzülür
- `VariantConsequence`: stat, belge, reveal, el, faction bilgisi

Tarihsel çıpa `selectAnchorFamily` ile seçilir (aynı turda tam pencere tercih). Varyant sonucu `applyEvent` içinde uygulanır — yalnızca dipnot değildir.

Yan olaylar `pickSideFamilies`: uygun aileler tohumla karıştırılır, follow-up tercih edilir, ilk-N katalog sırası kullanılmaz. Aynı seed aynı açılışı verir (`mulberry32`).

10 tur omurga `EVENTS` / `EVENT_CHOICES` (`data.ts`). Family, omurgayı ezer değil; varyant ve yan olay ekler.

## Asimetrik faction AI

`FactionMind.knowledgeBase` oyuncu elinden ayrıdır. Dünya gerçeği `truth` üçüncü katmandır.

Durumlar: `TRUE | FALSE | PARTIAL | RUMOR | UNKNOWN`.

Her tur, her faction (sıra sabit):

1. değerlendir
2. **kendi** bilgisinden yorumla
3. hedef seç
4. 1–2 hamle
5. hatırla

Çıpa takvim (`tickAnchors`: Abas, kaset, Susurluk) AI’dan ayrıdır; durdurulamaz.

`tickKnowledge` söylentiyi müttefik hatlara sızdırabilir. Oyuncu eli kopyalanmaz. Medya açılışta JİTEM’i bilmez.

## Actor memory

`src/game/sim/memory.ts`

Etiketler: `protected | used | spent | abandoned | leaked | backed-rival | promise-kept | promise-broken`.

`talkChance` / `helpChance` family `when` koşullarını ve tur sonu ısı/yardım tick’ini besler. Harcamak öldürme emri değildir.

## İlişki grafı

`edgeLive`: trust, dependency, secrecy, tension.

Hamleler: sıkılaştır, gevşet, gözet, arabul, yalıt, ifşa, koru. `belgelıLockTurn` sonrası gevşeme / yalıtım o bağı koparmaz.

Kurum / kişi bakışı `NodeGraph` semantik zoom’udur; geç düğümler odakta soluklaşır.

## Soruşturma

`src/game/sim/investigation.ts`

```
dormant → rumor → inquiry → investigation → evidence → public → response
```

Oyuncu: yönlendir (`soru_yonlendir`), sınırla (`soru_sinir`), aç (`soru_ac`), bastır (`sizinti_bastir` / `inv-suppress`). Tag’ler **tek atımlık**; her tur kamu’ya zıplamaz. Tamamen durdurmak tasarım dışı.

## Kampanya act’leri

`src/game/sim/acts.ts`

| Act | Tur | Yıl bandı | Açılan |
|---|---|---|---|
| I Kuruluş | 1 | 1986–88 | bağ |
| II Ağ | 2 | 1988–89 | kişi |
| III Kurum rekabeti | 3–4 | 1989–90 | bilgi / inkâr |
| IV İlk kırılmalar | 5–7 | 1990–93 | soruşturma yüzeyi |
| V İfşa baskısı | 8 | 1993–95 | Emniyet kesişimi |
| VI Son dönem | 9 | 1995–96 | hedef baskısı |
| VII Final | 10 | 1996 | kamu karesi — çıpa durmaz |

## Save / replay

```
SAVE_KEY        = "jitem-derin-ag-v3"
SAVE_VERSION    = 5
SCHEMA_VERSION  = 5
LEGACY_SAVE_KEY = "derin-ag-save-v1"
```

`src/game/sim/save.ts`: `serialize` / `parseSave` / `migrate`. Eksik v3 alanları doldurulur. Yazarken `:bak` yedek. Bozuk JSON yedekten okunur.

`replayMeta`: seed, hat, decisions, events, factions, major. UI export yok; veri duruyor.

RNG: `worldSeed` / `eventSeed` / `aiSeed` + `rngCursor`. Aynı tohum + aynı karar = aynı açılış varyantı.

## Bitiş

`src/game/sim/recap.ts` — `pickEnding` + `buildDossier`.

Erken `giz_coktu` kapısı: tur ≥ 8, `gizCrisisTurns ≥ 3`, hukuk ≥ 55, giz < 6. Tur 2 giz 11 kampanyayı bitirmez.

Dossier başlığı: **SENİN 1986–1996 HİKÂYEN**.

## Balance

`src/game/sim/balance.ts` — 5 stil × 25 tohum. Softlock 0 beklenir. Tek ending’e kilitlenmemeli.

## UI sözleşmesi

- Masaüstü: harita + yan panel; olay overlay her duruşta görünür
- Mobil: 5 sekme; overlay duruşta altta
- Kaynak rozetleri: BELGELİ / GÜÇLÜ / TARTIŞMALI / BOŞLUK + katman etiketi
