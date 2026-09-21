# TarıkLab integration contract

> **Current ownership:** `tayaz-maker/jitem-derin-ag` is JITEM's upstream/source
> canonical. `tayaz-maker/tariklab` is the product/deployment canonical. The
> production route is `https://www.tariklab.com/oyna/jitem-derin-ag`.
>
> TarikLab stores only the built isolated runtime in
> `public/games/jitem-derin-ag/`. Never hand-edit its compiled
> `assets/runtime.js` and never create a third editable source copy.

## Build and sync procedure

1. Change and test source in this upstream repository.
2. Merge the upstream PR and record the exact resulting `main` SHA.
3. Build the integration runtime from that SHA with base
   `/games/jitem-derin-ag/`.
4. Sync the generated runtime/assets to TarikLab.
5. Only then update TarikLab `SOURCE.json` with that exact SHA and run its
   integration/provenance test and product build.

The rest of this file records the embedded/save contract.

Amaç: Derin Ağ’ı lab’e alırken mevcut oyunların route, save ve asset’leriyle **çakıştırmamak**. TC SIM’deki `100vh` + outer shell + duplicate back hatasını **tekrarlamamak**.

## Hazır olan

- Oyun `src/game/` + `src/components/game/` içinde izole
- Save anahtarı zaten ayrı: `jitem-derin-ag-v3` (şema 5)
- Embedded shell sözleşmesi: `src/game/embed.ts`
- Ek npm paketi yok (React / zustand / Tailwind / lucide)
- Auth / DB kullanılmıyor
- Bu rehber + `ARCHITECTURE.md` + `SOURCES.md`

## Embedded mode (zorunlu sözleşme)

Lab iframe / gömülü rota açınca oyun **iç site kabuğunu taklit etmez**.

Aktif etme (ilk eşleşen):

1. `/?embed=1` veya `/?embedded=1`
2. `window.__DERIN_AG_EMBEDDED = true` (parent set eder)
3. `window.parent !== window` (iframe)

`applyShellMode()` `document.documentElement.dataset.shell = "embedded"` yazar.

| Konu | Standalone | Embedded |
|---|---|---|
| Global back | Küçük “başa dön” (oyun reset) | **Gizlenir** — outer shell’in back’i |
| Dil TR/EN | Kompakt TR/EN anahtar (`jitem-derin-ag-locale`, save’den ayrı) | **İç anahtar gizlenir.** Outer `window.__DERIN_AG_LOCALE`, `?lang=`, `postMessage({type:'derin-ag-locale', locale})` veya `CustomEvent('derin-ag-locale')` ile yönetir. Parent değişince oyun reaktif render eder. Duplicate TR/EN yok. |
| Site header / wordmark | Küçük “DERİN AĞ” (sm+) | **Gizlenir** |
| Gameplay HUD | Kompakt: yıl, tur, 4 stat, kapasite | **Aynı HUD kalır** |
| Yükseklik | `.game-shell { height: 100dvh }` | `.game-shell { height: 100% }` — **100vh varsayımı yok** |
| Safe area | `viewport-fit=cover` + `env(safe-area-inset-*)` | Outer padding varsa oyun ekstra 100vh eklemez |
| Onboarding | İlk 3 tur, oyunun kendi ipucu | **İkinci lab onboarding yok** |

Iframe örneği:

```html
<iframe
  src="https://example.invalid/jitem?embed=1"
  style="width:100%;height:100%;border:0;display:block"
  allow="fullscreen"
></iframe>
```

Parent `height: 100%` zincirini kendi shell’inde kurar. Oyun `100vh` ile outer’ı ezmez.

## Dil sözleşmesi (zorunlu)

- Oyun dili **save state’e yazılmaz**. Kampanya RNG, event seçimi ve checksum dilden bağımsızdır.
- Replay semantik ID taşır (`dosya_oku`, `e6-bas`); çevrilmiş cümle değil.
- Standalone: HUD’da kompakt TR/EN. Tercih `localStorage['jitem-derin-ag-locale']`.
- Embedded: iç dil anahtarı **gösterilmez**.
- Parent tercih:

```js
window.__DERIN_AG_LOCALE = "en";
iframe.contentWindow.postMessage({ type: "derin-ag-locale", locale: "en" }, "*");
```

veya `/?embed=1&lang=en`. Parent değişince oyun `useLocale` üzerinden yeniden render olur.

Header yüksekliği (hedef): mobil HUD ~44px + safe-area; alt nav ~48px + safe-area. Outer lab header **ayrı** — oyun kendi global nav’ını koymaz.

## Historical source inventory (do not copy into TarikLab)

These are source references only; TarikLab receives the generated integration output, not these folders:

```
src/game/                  →  (aynen)
src/components/game/       →  (aynen)
public/images/map.jpg
public/images/office.jpg
public/images/road.jpg
docs/                      →  docs/derin-ag/ veya oyun klasörü
```

`src/components/ui/badge.tsx` ve `button.tsx` lab’de varsa **kullanma / çakıştırma**; lab’in shadcn’ine map et.

**Taşıma:**

- `src/lib/auth`, `src/lib/db`, `migrations/auth`
- `public/__grok`, `scripts/grok-pwa-*`, `server/middleware/grok-pwa.ts`
- `startup.sh` (Grok Build iskelesi)
- Bu repodaki kök `src/routes/index.tsx` (lab’in index’ini ezme)

## Production route and asset base

Bu repo: `src/routes/index.tsx` → `<GameApp />`.

Lab’de önerilen:

```
src/routes/jitem.tsx
# veya
src/routes/oyunlar/derin-ag.tsx
```

Kök `index`’e gömme. Navigasyona tek link. Gömülü açılış: aynı rota + `?embed=1`.

Asset prefix: hepsi `/images/...` kök relative. Lab `base` / subdirectory kullanıyorsa `public/images` site köküne kopyalanmalı. Vite `base` değişirse oyun içindeki `/images` ve `/favicon.svg` lab’in prefix’ine map edilir — **bu repoda base `/`**.

## 3. Save izolasyonu (kritik)

```
SAVE_KEY        = "jitem-derin-ag-v3"
SCHEMA_VERSION  = 5
LEGACY_SAVE_KEY = "derin-ag-save-v1"   # yalnız okuma / migrate
```

Başka TarıkLab oyununun `localStorage` anahtarıyla **paylaşma**. Prefix’i değiştirme; mevcut kampanyalar kopar.

## 4. Duplicate shell / onboarding yasağı

Lab’e alınırken **ekleme**:

- ikinci geri tuşu
- ikinci dil seçici
- ikinci “nasıl oynanır” lab turu (oyunun Dosya’sı yeter)
- `h-screen` / `100vh` wrapper
- outer header’ı içeri kopyalamak

## 5. Bağımlılıklar

Yeni paket yok. Lab zaten React 19 + zustand + Tailwind v4 ise ek `npm install` gerekmez.

Typecheck sonrası oyun testleri:

```bash
node --experimental-strip-types --test src/game/db/validate.test.ts src/game/sim/engine.test.ts
```

## Product scope

1. Yeni route dosyası (yukarı) + `?embed=1` varsayılanı iframe için
2. Lab nav linki
3. İsteğe bağlı: lab oyun listesine “Derin Ağ” kartı (kendi OG’si)
4. **Değiştirilmeyecek:** diğer oyunların `SAVE_KEY`, lab auth popup, onboarding

Tek PR, tek oyun. Diğer simülasyonlara dokunma.

## 7. Deploy sonrası kontrol listesi

- Açılış: iki hat kartı + varsa “kaldığın yer” brifingi
- Tur 1 olay: TARİHSEL / KAYNAK etiketi + 3 duruş
- Mobil 360 / 390: HUD tek sıra, alt nav, harita görünür, event ekranı yutmuyor
- Save: yenile → act + son olay + soruşturma
- Anahtar: DevTools’ta yalnızca `jitem-derin-ag-v3`
- Son: SENİN 1986–1996 HİKÂYEN + `DERIN-AG-1986-1996-<seed>.json`
- `?embed=1`: wordmark ve reset-back yok, HUD var, yükseklik parent’a oturur
- Lab’in diğer oyunları aynı tarayıcıda kayıtlarını kaybetmemiş

## 8. Dokunulmaması gerekenler

- Başka oyunun `SAVE_KEY`
- Lab onboarding / auth popup
- `public/__grok`
- Cinayet envanteri veya kaynaksız bağ
- `historicalFact` ile `gameReconstruction` karıştırarak kayıt yazmak
- Bu standalone repoyu lab’e force-push / subtree karıştırmak — subtree veya kopya klasör

## Retired migration notes

```bash
# tariklab içinde, bu repoyu kopya olarak al — history zorunlu değil
git clone --depth 1 git@github.com:tayaz-maker/jitem-derin-ag.git /tmp/derin-ag
# sonra yalnızca src/game, src/components/game, public/images, docs kopyala
```

Alternatif: git subtree. Her iki durumda da **lab’in main tarihini bu repo ile değiştirme**.

Bu adımlar çalıştırılmadı. Bu dosya gelecek tur için sözleşmedir.
