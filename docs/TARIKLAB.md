# TarıkLab’a alma — henüz yapılmadı

Bu repo **standalone**. `tayaz-maker/tariklab` içine **şimdilik commit atılmaz**.

Amaç: Derin Ağ’ı lab’e alırken mevcut oyunların route, save ve asset’leriyle **çakıştırmamak**.

## Hazır olan

- Oyun `src/game/` + `src/components/game/` içinde izole
- Save anahtarı zaten ayrı: `jitem-derin-ag-v3` (şema 5)
- Ek npm paketi yok (React / zustand / Tailwind / lucide)
- Auth / DB kullanılmıyor
- Bu rehber + `ARCHITECTURE.md` + `SOURCES.md`

## 1. Taşınacaklar

Kopyala (lab içinde yeni klasör, overwrite yok):

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

## 2. Giriş route

Bu repo: `src/routes/index.tsx` → `<GameApp />`.

Lab’de önerilen:

```
src/routes/jitem.tsx
# veya
src/routes/oyunlar/derin-ag.tsx
```

Kök `index`’e gömme. Navigasyona tek link.

## 3. Save izolasyonu (kritik)

```
SAVE_KEY        = "jitem-derin-ag-v3"
SCHEMA_VERSION  = 5
LEGACY_SAVE_KEY = "derin-ag-save-v1"   # yalnız okuma / migrate
```

Başka TarıkLab oyununun `localStorage` anahtarıyla **paylaşma**. Prefix’i değiştirme; mevcut kampanyalar kopar.

## 4. Asset yolları

Hepsi `/images/...` kök relative. Lab subdirectory + Vite `base` kullanıyorsa `public/images` yine site köküne kopyalanmalı.

OG kartı (`public/og.jpg`, `src/lib/og/site.json` type `x:game`) bu oyuna özel kalır. Lab ana sayfa kartını ezme.

## 5. Bağımlılıklar

Yeni paket yok. Lab zaten React 19 + zustand + Tailwind v4 ise ek `npm install` gerekmez.

Typecheck sonrası oyun testleri:

```bash
node --experimental-strip-types --test src/game/db/validate.test.ts src/game/sim/engine.test.ts
```

## 6. Lab’de değişecek dosyalar (gelecek PR)

1. Yeni route dosyası (yukarı)
2. Lab nav linki
3. İsteğe bağlı: lab oyun listesine “Derin Ağ” kartı (kendi OG’si)
4. **Değiştirilmeyecek:** diğer oyunların `SAVE_KEY`, lab auth popup, onboarding

Tek PR, tek oyun. Diğer simülasyonlara dokunma.

## 7. Deploy sonrası kontrol listesi

- Açılış: iki hat kartı + uyarı metni
- Tur 1 olay: TARİHSEL / KAYNAK etiketi + 3 duruş
- Mobil: Harita / Olay / Kişi / İşler / Rapor
- Save: yenile → “Kaldığım yerden”
- Anahtar: DevTools’ta yalnızca `jitem-derin-ag-v3`
- Son: SENİN 1986–1996 HİKÂYEN (kimi korudun / harcadın)
- Lab’in diğer oyunları aynı tarayıcıda kayıtlarını kaybetmemiş

## 8. Dokunulmaması gerekenler

- Başka oyunun `SAVE_KEY`
- Lab onboarding / auth popup
- `public/__grok`
- Cinayet envanteri veya kaynaksız bağ
- `historicalFact` ile `gameReconstruction` karıştırarak kayıt yazmak
- Bu standalone repoyu lab’e force-push / subtree karıştırmak — subtree veya kopya klasör

## 9. Önerilen alma yöntemi (ileride)

```bash
# tariklab içinde, bu repoyu kopya olarak al — history zorunlu değil
git clone --depth 1 git@github.com:tayaz-maker/jitem-derin-ag.git /tmp/derin-ag
# sonra yalnızca src/game, src/components/game, public/images, docs kopyala
```

Alternatif: git subtree. Her iki durumda da **lab’in main tarihini bu repo ile değiştirme**.

Bu adımlar çalıştırılmadı. Bu dosya gelecek tur için sözleşmedir.
