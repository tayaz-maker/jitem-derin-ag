# Kaynak disiplini

Bu dosya teknik sözleşmedir. Yeni kayıt yazmadan önce oku. Belgesiz bağ, emir veya niyet **üretilmez**.

## Dört katman — karıştırılmaz

Her playable kayıt ve her iddia bu dört metni ayrı tutar:

| Alan | Anlam | Oyunda |
|---|---|---|
| `historicalFact` | Kamuya açık, çürütülmesi zor çıpa (tarih, kaza, kimlik, ceset, komisyon tutanağı) | Durdurulamaz takvim |
| `sourceClaim` | Kitap / tanık / rapor iddiası. Kaynak adı `sourceIds` ile bağlı | Oyuncu veya NPC “biliyor” sanabilir; dünya kilidi değil |
| `gameReconstruction` | Kampanyanın bu iddiayı nasıl işlediği. Oyun varsayımı | Mekanik |
| `alternativeOutcome` | Çıpa durur; kim dahil, ne kadar bilgi, kim konuşur değişir | Replay farkı |

`contradictions[]` (ve claim’de `contradiction`) boş bırakılmaz: yoksa açıkça “bilinen çelişki yok / boşluk duruyor” yazılır.

## Kanıt seviyesi

```
BELGELİ     kamu kaydı, kaza, kimlik, tutanak
GÜÇLÜ       çoklu tanıklık, kitap + ikinci hat. Tek el değil
TARTIŞMALI  iddia var; emir / niyet / bağ boşluğu duruyor
BOŞLUK      kaynak sessiz. Uydurulmaz. Sis olarak kalır
```

`evidence` ve `evidenceLevel` aynı skaladır. Hydrate ikincisini birinciden doldurur; validate ikisini de ister.

UI rozetleri `src/game/sim/authority.ts` (`SOURCE_UX`). Oyuncu “doğru” görmez; etiket görür.

## Kaynak kaydı

`src/game/db/sources.ts` — her `sourceIds` girdisi burada olmalıdır.

Alanlar: `id`, `title`, `author`, `kind` (book | testimony | archive | commission | press | self), `note`, `location`.

Mevcut katalog (17):

- Yalçın: *Binbaşı Ersever’in İtirafları*, *Pipo*, *Reis*
- Arif Doğan anlatımı
- Eymür / atin.org hattı
- Pekmezci — Yeşil
- Abdülkadir Aygan tanıklığı
- Uğur Mumcu haber arşivi
- Talat Turhan
- Susurluk kaza kamu kaydı
- TBMM Susurluk komisyonu
- Ergenekon süreci tanıklıkları (geriye dönük; TARTIŞMALI)
- Ayhan Çarkın (JİTEM’e zorla yedirilmez)
- Hanefi Avcı (86–96 omurgasına geri kilitleme yok)
- Kutlu Savaş / teftiş hattı
- Eşref Bitlis kaza kamu kaydı
- Jandarma kamu kaydı (JİTEM bu kayıttan doğmaz)

Yeni kaynak: dosyaya ekle, `location` yaz, id’yi kayıtlara bağla. Kaynaksız `sourceIds: []` validate error.

## Claim sınıflaması

`ClaimRecord.layer`:

- `historicalFact` — dünya `TRUE` olabilir (ör. Susurluk aracı)
- `sourceClaim` — kaynak iddiası; çelişki alanı zorunlu
- `gameReconstruction` — oyun işleyişi
- `alternativeOutcome` — campaign sapması

`worldStatus` (`TRUE/FALSE/PARTIAL/RUMOR/UNKNOWN`) **dünya gerçeğidir**. Faction `knowledgeBase` ve oyuncu `hand` bunu kopyalamak zorunda değildir. Medya açılışta `clm_jitem_exists = UNKNOWN`.

`classifyClaim()` testte historical / source / contradiction ayrımını kilitler.

## Motivasyon

Gerçek kişi:

- `sourced` — kaynak niyeti söylüyor
- `unknown` — kaynak niyeti kapatmıyor (**varsayılan**)
- `gameAssumption` — metinde “Oyun” / oyunsal işaret şart

Niyet uydurup `historicalFact` içine gömmek yasak.

## Tarihsel çıpa vs. kaynak iddiası vs. oyun

Örnekler:

| Olay | Katman | Not |
|---|---|---|
| 3 Kasım 1996 kaza, araç, kimlikler | historicalFact / BELGELİ | Takvim durmaz |
| “JİTEM emriyle” bağları | sourceClaim / TARTIŞMALI | Emir üretilmez |
| Ersever + Nevval Boz ölümleri | historicalFact / BELGELİ | Fail GÜÇLÜ iddia; emir TARTIŞMALI |
| Mumcu suikastı | historicalFact | JİTEM bağ TARTIŞMALI |
| Bitlis uçak kazası | historicalFact | Sabotaj TARTIŞMALI; JİTEM bağ üretilmez |
| Resmi “JİTEM yoktur” | sourceClaim / resmi dil | `clm_official_denial` |
| Kaset hasarının kesilmesi | gameReconstruction | Bastırma yok etmez |

Family addendum’ları aynı etiket dilini kullanır: `TARİHSEL ÇIPA`, `KAYNAK İDDİASI`, `OYUNSAL REKONSTRÜKSİYON`.

## BilinenBy / keşfedilebilirlik

`knownBy` hangi faction’ın bu kaydı **açılışta** bilebileceği. Hydrate, `factionId` yoksa `[]`.

`discoverability`: early / mid / late / hidden. `gameUnlock.appearTurn` + `bilgi` ile graf sisini açar. 80 düğüm birden basılmaz.

## Yasaklar (içerik)

- Kaynaksız gerçek dünya iddiası
- Uydurulmuş kişi–kurum bağı
- Yasadışı operasyon öğretimi / cinayet envanteri
- Tek komplo kilidi (“her şey JİTEM”)
- Çıpa ölümü oyuncu kararıyla iptal
- Faction’ın oyuncu elini okuması

Validate error olmadan PR birleştirme.

## Dosya haritası

| Dosya | İş |
|---|---|
| `src/game/db/schema.ts` | kayıt tipleri |
| `src/game/db/sources.ts` | kaynak kataloğu |
| `src/game/db/catalog.ts` | kişi / ana iddia / bağ |
| `src/game/db/catalog-extra.ts` | ek kişi, kurum, claim, tarih |
| `src/game/db/hydrate.ts` | etiket doldurma |
| `src/game/db/validate.ts` | kaynak zorunluluğu |
| `src/game/db/validate.test.ts` | kaynaksız kayıt kırılır |
