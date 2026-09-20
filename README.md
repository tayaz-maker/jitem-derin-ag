# Derin Ağ

Tek oyunculu tarihsel-politik strateji. **1986–1996.** Oyuncu bir kişi değil; görünmeyen bir karar masası.

Bu oyun, kaynaklardaki belge, tanıklık, iddia ve boşlukları oyunlaştırır. Tek doğru komplo dayatılmaz. Kanıt seviyesi veri modelinin zorunlu alanıdır.

Kaydetme anahtarı: `jitem-derin-ag-v3` · şema: `schemaVersion: 5`.

Şu an **bağımsız** bir oyun reposudur. `tayaz-maker/tariklab` içine henüz alınmadı. Entegrasyon rehberi: [docs/TARIKLAB.md](docs/TARIKLAB.md).

## Ne oynanır

Her tur:

1. Dönem olayı (tarihsel çıpa veya kaynak iddiası) + duruş
2. Sınırlı iş: bağ, kişi (koru / kullan / harca / mesafe), gerçek / düzen
3. Diğer taraflar **kendi bildikleriyle** hareket eder

Çıpa olaylar (Abas, Ersever ölümü, 3 Kasım) durmaz. Çevresi değişir: kim dahil, ne kadar bilgi açılır, kim konuşur, soruşturma ısısı.

İki başlangıç hattı: **Saha** (Ersever tipi, 3 iş) ve **İdari** (Doğan tipi, 2 iş). Kazanmak / kaybetmek yok; kapanış **SENİN 1986–1996 HİKÂYEN** dosyasıdır.

Mobil beş sekme: Harita · Olay · Kişi · İşler · Rapor.

## Nasıl çalıştırılır

Auth ve veritabanı **kapalı**. Kayıt `localStorage`.

```bash
npm install
npm run dev          # 0.0.0.0:8080
```

Üretim derlemesi:

```bash
npm run build
npm run preview      # 127.0.0.1:8081
```

## Test / typecheck / build

```bash
npm run typecheck
npm run test:game    # araştırma DB + kampanya motoru
npm run build
```

`npm test` ayrıca Grok App Builder iskele testlerini çalıştırır (PWA / OG injector). Oyun kodundan bağımsızdır.

Kaynaksız iddia `test:game` içinde hata verir.

## Phase 2 sistemleri

| Sistem | Ne işe yarar |
|---|---|
| **Research DB** | Kişi, kurum, iddia, bağ, olay, kaynak. Her kayıt kaynaklı. |
| **Koşullu event family** | 39 aile / 67 varyant. Çıpa takvimi durmaz; varyant geçmişe ve bilgiye bağlı. |
| **Asimetrik faction AI** | JİTEM, MİT, Emniyet, basın, hukuk, askerî, yeraltı, siyaset. Her biri kendi bilgisiyle hareket eder. |
| **Actor memory** | Koru / kullan / harca / yalnız bırak / sızdır / rakibi tut / söz tut / söz boz. |
| **İlişki grafı** | Sıkılaştır, gevşet, gözet, arabul, yalıt, ifşa, koru. BELGELİ kilit gevşemez. |
| **Soruşturma** | uyku → söylenti → ön inceleme → soruşturma → delil → kamu → kurumsal yanıt. Durdurmak zorunda değilsin. |
| **7 act** | 1986–1996. İlk 3 tur öğretici; sonra serbest. |
| **Save / replay** | `jitem-derin-ag-v3`, şema 5, migrate + yedek. Bitişte replay indir + aynı tohum. |

Mimari: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)  
Kaynak disiplini: [docs/SOURCES.md](docs/SOURCES.md)

Katalog (hydrate sonrası): 23 kişi, 10 kurum/yer, 18 iddia, 24 ilişki, 10 tarih kaydı, 17 kaynak.

## Save

```
localStorage["jitem-derin-ag-v3"]
schemaVersion: 5
```

Eski prototip anahtarı `derin-ag-save-v1` yalnızca okunur ve migrate edilir. Başka bir oyunla paylaşma.

## Bilinçli eksikler

- Araştırmacı / hukuk başlangıç hatları (tip hazır, içerik yok).
- Katalog kasıtlı ince; 80 düğümlük geniş harita yok.
- `giz_coktu` saha stilinde sık; idari/gizlilik ayakta kalıyor.
- TarıkLab entegrasyonu yapılmadı — bu repo standalone.

## Yığın

TanStack Start + React 19 + Tailwind v4 + zustand. Ek oyun motoru yok.

## Lisans / içerik notu

Tarihsel kişiler ve belgelı olaylar kaynak etiketleriyle durur. Emir uydurulmaz. Cinayet / yasadışı operasyon öğretilmez. Motivasyon kaynaklı, oyun varsayımı veya UNKNOWN olarak işaretlenir.
