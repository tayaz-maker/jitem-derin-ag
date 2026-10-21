# JITEM: Derin Ağ — Master Gameplay Audit

22 Ekim 2026 · Faz 0 · Analiz ve rapor; ürün kodu değişikliği yok.

## 1. Mevcut sistemler ve doğrulanan temel

- Upstream main: `006c7e73af0f2bf4fa208ae3a46556bf903f5e33`; kaynak ağacı `8af44852e1405ded48c8e360069696761403b5f2`.
- TarikLab main: `97aa59d4cfafd9413a6da4aa107188a622d6b226`; portalın `SOURCE.json.standaloneSha` değeri upstream main ile aynı.
- Canlı `assets/runtime.js` SHA256: `687d785f05eb69153811815b41e7060b33d96e3d771a37b00047bcc4852e0ee3`; üç yeni Chromium oturumunda kaynak piniyle eşleşti.
- Kimlik: 1986–1996 boyunca ağ, bilgi asimetrisi ve tarihsel baskı yönetimi. Saha/idari ana hatlar; araştırmacı/hukuk başlangıçta açıkça deneysel. Tek bir cinayeti doğrusal görev zinciriyle çözme oyunu değildir. Bu denetim bu kimliği değiştirmeyi önermiyor.
- `AGENTS.md`, `AGENTS.project.md`, mimari/kaynak disiplini, ADAPT 1–3 ve support-payoff raporları okundu. Portalın ürün kimliği, 21 Ekim production kabulü, 8 Ekim kalite raporu ve locale makbuzları incelendi. Portalın derlenmiş runtime dosyası değiştirilmedi.

Kaynak: `src/game/db/index.ts::DB_COUNTS`, `data.ts`, `sim/families.ts` doğrudan import edilerek sayıldı:

| Katalog / mekanik | Adet | Sayımın anlamı |
|---|---:|---|
| Ana dönem dosyası / olay omurgası | 10 | `EVENTS`; serbest vaka jeneratörü değil |
| Omurga karar seçeneği | 30 | `EVENT_CHOICES` toplamı |
| Hamle türü | 32 | `ACTIONS`; her rolde hepsi açık değil |
| Olay ailesi / varyantı | 41 / 80 | 10 çıpa işaretli aile + 31 yan aile; dosya sayısıyla toplanmaz |
| Kişi / kurum veya yer | 23 / 10 | Araştırma DB kayıtları |
| İddia / ilişki / tarih kaydı / kaynak | 26 / 24 / 10 / 17 | Ayrı katalog türleri |
| Oynanabilir atlas düğümü / bağı | 18 / 24 | Tüm araştırma kişileri aynı anda haritada değildir |
| Sonuç türü | 10 | `ENDINGS`; hepsi bu dar örnekte görülmüş sayılmaz |

`validateResearch()` bu ağaçta boş hata/uyarı listesi döndürdü. Bu, kaynak referanslarının yapısal bütünlüğüdür; her tarihsel iddianın bağımsız doğrulandığı anlamına gelmez.

## 2. Tamamlanmış işler — mükerrer geliştirme yapılmamalı

| ID / sınıf | Mevcut davranış | Dosya, fonksiyon ve mevcut test kanıtı |
|---|---|---|
| A01 — A | Upstream/portal ayrımı, sabit kaynak pini, izole embed | Portal `00_PRODUCT_IDENTITY.md`, `SOURCE.json`, `jitem-canonical-browser.mjs`; 21 Ekim 31 dosya / 6 portal vakası kabul makbuzu |
| A02 — A | Atlas seçili hedefe göre karar açıyor; önizleme gerçek motoru kopyada çalıştırıyor | `sim/preview.ts::previewMove`, `sim/planning.ts::decisionOptions`; `move-preview.test.ts`, `atlas-model.test.ts`, `plan-targeting.test.ts` |
| A03 — A | İlk adım, kapasite, mevcut hedef ve neden/bedel/iz açıklaması var | `MoveGuide.tsx::NextStepBar`, `OperationDesk.tsx::RiskRewardGrid`, `sim/briefing.ts::briefingFrom`; `move-preview.test.ts` “guidance always names one next step” |
| A04 — A | İddia/tarih/oyun katmanı ve BELGELİ/GÜÇLÜ/TARTIŞMALI/BOŞLUK ayrı | `db/hydrate.ts`, `sim/authority.ts`, `ClaimDrawer.tsx`; `db/validate.test.ts`, `engine.test.ts` “splits historical / source claim / contradiction” |
| A05 — A | Kaynak karşılaştırması iddiaya bağlanıyor; tut/paylaş/yayımla ayrışıyor | `engine.ts:731–804`, `investigation.ts::recordComparison`; `engine.test.ts:731`, `:964`, `plan-targeting.test.ts:58` |
| A06 — A | Yoklama gerçek tarihsel kesinlik üretmiyor | `engine.ts:805–823` hiçbir doğrulama sonucunu TRUE yapmıyor; `engine.test.ts:964`. Kaynağın güven derecesi confidence artışını etkiliyor; belirsizlik korunuyor |
| A07 — A | Delil halkası generic sayaç yerine claim/document kimliği taşıyor | `engine.ts:824–854`, `investigation.ts::recordChainLink`; `engine.test.ts:746`, `:868`, `:982`. Aşağıdaki B02 bu sistemin kapsam eksiğidir, sistem yokluğu değildir |
| A08 — A | Koşullu aile, cooldown, exclusivity, follow-up ve geçmişe bağlı karar mutasyonu var | `families.ts::familyEligible`, `pickSideFamilies`, `mutateCommand/Tapes/Catli/Susurluk`; `engine.test.ts` event condition/exclusivity ve `:950` |
| A09 — A | Koruma/kullanma/harcama/ihanet hafızası gelecek sonucu etkiliyor | `memory.ts::remember`, `breakPromise`, `talkChance`, `tickMemory`; `engine.test.ts:927–963`, support-payoff raporu. Ölü/ihanete uğramış aktörün yeni yardım vermesi daha önce düzeltilmiş |
| A10 — A | Yaklaşımın gerçek maliyeti ve gecikmeli dönüşü var | `planning.ts::METHOD_NOW`, `planDue`, `tickPlans`; `operations-depth.test.ts:40–90,154–210`. Aynı-vade sırası, ölü aktör ve eski kayıt sorunları ADAPT 1/2 kapsamında tamamlanmış |
| A11 — A | NPC bilgisi oyuncu eli ve dünya tablosundan ayrı | `knowledge.ts::tickKnowledge`, `allyLeakThreshold`, `factions.ts::tickFactions`; `knowledge.test.ts:40–131`. Gerçek bağ koruması aynı rumor roll sonucunu değiştirebiliyor; yeniden söylenti motoru gerekmiyor |
| A12 — A | Soruşturma dormant→rumor→inquiry→investigation→evidence→public→response ilerliyor | `investigation.ts::tickInvestigation`, `investigationView`; tek atımlık direct/limit/expose/suppress tag tüketimi mevcut |
| A13 — A | Şema 5, yedek/önceki nesil, bozuk primary kurtarma ve salt-okunur yükleme var | `sim/save.ts::serialize/parseSave/migrate`, `store.ts`; `save-recovery.test.ts`, ADAPT 1 ve canonical production makbuzları. Yeni ölçümde 18/18 roundtrip + canlı 3/3 reload |
| A14 — A | Anlamlı sonuç, kurum/aktör hatırası, replay dışa aktarımı mevcut | `recap.ts::pickEnding/buildDossier/causalNarrative/formatReplayJson`, `EndScreen.tsx`; `engine.test.ts` replay/ending testleri. B03 hedef ve keşif kapsamını daraltır; yeni sonuç ekranı gerekmiyor |

Önceki raporlardaki 308 test, atlas/ürün/save/arrival/rumor matrisleri bu denetimde topluca yeniden çalıştırılmadı. Önceki kabul kanıtı olarak kullanıldı; aşağıdaki yeni ölçümler ayrı ve daha dardır.

## 3. Amaçsızlık analizi

Ana ağ yönetimi amacı ve sıradaki **arayüz işlemi** mevcut. Saha oyuncusu harita→hedef→hamle→önizleme→tur sonucu yolunu görebiliyor. Sonraki dosyanın motivasyonu tarihsel takvimin baskısı, yeni aktör/iddia görünürlüğü ve önceki kararın kurumsal sonucudur. Amaç veya onboarding bütünüyle eksik diye sınıflandırılmadı.

**B01 — B / P1: deneysel hatlarda gösterilen amaç gerçek kullanılabilir ilerlemeye uymuyor.**

- `objectives.ts:50–111::evalStatus/syncObjectives` ilk turda tüm rollere `obj_edge` verir: “Bir bağı sıkılaştır veya gevşet”. Tamamlanma yalnız `bag_guclendir` veya `bag_gevset` kararıyla olur.
- `planning.ts:23–75::decisionOptions` araştırmacıya yalnız claim karşılaştır/yokla/paylaş; hukuk hattına claim zinciri/eşik kararlarını verir. `ResourceActions.tsx:14–28` destek listesinde bu iki bağ hamlesi yoktur.
- Tüm görünür düğüm/bağlar ve eldeki kayıtlar üzerinde geçerli arayüz hamleleri tarandı: saha/idari için hedef tamamlanabilir; araştırmacı/hukuk için iki gerekli hamle de sunulmuyor. `canPlay` fonksiyonunu tek başına kullanmak bu UI erişim eksiğini gizler.
- Canlı üç oturumda araştırmacının gerçek karşılaştırması 4→2, hukukçunun gerçek delil zinciri 4→2 kapasite harcadı ve kaydedildi; ilk hedef hâlâ aynı `obj_edge/open` idi. Sorun ödül motorunun yokluğu veya tur softlock’u değildir; hedef/rol uyumsuzluğudur.
- Birçok sonraki ortak hedef de aktör koruma/bağ/kurum soğutma dili taşıyor. Yeni doğrusal görev sistemi yerine mevcut hedef kataloğu rolün gerçek çalışma biçimini okumalı.

İlk beş dakikanın insan tarafından algılanan anlamı/süresi ölçülmedi. Gerçek açılış, ilk vaka ve bir karar döngüsü incelendi; otomatik yürütmenin birkaç saniye sürmesi insanın beş dakika oynadığı anlamına gelmez.

## 4. Kanıt ve karar derinliği

Karşılaştırma eldeki claim/sourceIds listesini kalıcılaştırıyor; hukuk ve medya aynı şeyleri öğrenmiyor. Doğrulama confidence artırıyor, belirsizliği kesin tarihe dönüştürmüyor. Zincir iddiaya bağlanıyor. Farklı yayım kararları giz/kamu/hukuk ve faction bilgisi üzerinde gerçekten farklı sonuç doğuruyor. Bu nedenle “dosyalar yalnız okunuyor” iddiası tüm oyun için yanlış.

**B02 — B / P1: genel belge sayacı, seçili iddiaya ilişkin kanıt yeterliliğinin yerine geçebiliyor.**

Doğal açılıştan, yalnız sunulan arayüz hamleleriyle iki eşlenik hukuk yolu:

1. `clm_official_denial` için gerçek contextual `delil_zincir`: `doc-clm_official_denial-t1`, tek chain halkası.
2. A yolunda başka belge eklemeden sonraki turda aynı kaydın `kanit_esigi`: “Belge yetersiz”, `inv-direct=false`.
3. B yolunda ilk turda bir `dosya_oku` daha yapılıyor: yalnız `dosya-t1` ekleniyor. Sonraki tur aynı selected claim, aynı tek chain, aynı sourceIds ile eşik açılıyor: “Dosya bir kat ilerledi”, `inv-direct=true`.

Kök: `engine.ts:855–871` `documents.length >= 2 || chain.length >= 2` kullanıyor; seçili `claimId` için ilgili/yeni kaynak değerlendirmiyor. `dosya_oku` (`:683–690`) hedefi olmayan tur-kimlikli belge üretir. Kaynak okumanın gerçek bilgi/giz/kapasite maliyeti var; **bedava kaynak üretimi veya kaydı bozan hata tespit edilmedi**. Sorun, miktarın anlamlı ispat ilerlemesi olarak sunulabilmesidir.

Ek karşı örnek: aynı ilk turdaki iki `dosya_oku` kararı tek `dosya-t1` üretir; geç act hedefi `obj_chain` ise karar sayısına baktığı için iki belge notu açılmış gibi `done` olur (`objectives.ts:51,76–77`). Geç-act okuması, izole durum projeksiyonudur; doğal ilk turun aynı anda act VI olduğu iddia edilmez.

Mevcut `engine.test.ts:761` boş dosya ve iki halkalı durumları ayırır; **bir iddiaya bağlı tek halka + ilişkisiz genel belge** karşı örneğini kapsamaz. İddiaların çözüldüğünü tarihsel gerçek ilan edecek bir “doğru cevap” sistemi önerilmiyor.

Kaynak güvenilirliği statik katalog derecesi + eldeki bilgi confidence’ı ile temsil ediliyor. Yeni, rastgele cezalandıran kaynak itibarı puanı zorunlu değil (D/P2). Çelişkileri incelemek var; bunları haklı olarak her zaman çözmek/teyit etmek mümkün değil. Yeni kanıt panosu gerekmiyor.

## 5. Olay tekrar ölçümleri ve strateji karşılaştırması

Yeni örnek: eşlenik tohumlar `42, 2026, 7919` × altı politika = **18 kaynak-motor kampanyası, 375 ücretli hamle**. Politikalar gerçek `decisionOptions/targetClaims/canPlay` ve mevcut destek listesiyle sınırlandı; contextual koruma aşılarak hamle seçilmedi. Her koşuda dördüncü turda schema-5 JSON roundtrip ile devam edildi.

| Politika (tohum başına) | Ücretli hamle dağılımı | Bilgi çalışması / sonuç |
|---|---|---|
| Saha, temkinli | 30: 16 bağ koru, 8 inkâr, kalan destek/kişi | T10 `inkar_ayakta` |
| Saha, aceleci | 19: 8 soyut saha işi, 9 kişi kullan, 1 bağ, 1 okuma | T9 `saha_felaketi` |
| Araştırmacı, kanıt odaklı | 18: 12 farklı claim karşılaştır, 6 yokla | T9 `giz_coktu` |
| Araştırmacı, yayımla | 18: 12 karşılaştır, 6 yayımla | T9 `giz_coktu`; önceki politikayla bilgi/kurum sonuçları aynı değildir |
| Hukuk, kanıt odaklı | 20: 5 zincir, 4 okuma, 11 eşik | T9 `giz_coktu` |
| İdari, temkinli | 20: 16 bağ koru, 2 kişi koru, 2 kalkan | T10 `inkar_ayakta` |

- **18/18 sona ulaştı, 18/18 reload geçti**, üç sonuç tipi görüldü; kaynak statları kontrollü puan sistemidir. Bu küçük, sabit tercihli örnek bir denge araştırması veya araştırmacı/hukuk hiç kazanamaz kanıtı değildir. Kanıt politikaları gizliliği korumaya öncelik vermediğinden onların yenilgisi tek başına yeni P1 sayılmadı.
- Örnekte **aynı aile kampanya içinde ikinci kez ateşlenmedi**. 31 yan aile ve cooldown/exclusivity sistemi çalışıyor. Örnekte görülmeyen tekrarın hiç mümkün olmadığı iddia edilmez: dört katalog ailesinde cooldown=2 vardır.
- 80 varyantın 58’inde doğrudan `consequence`, dört ailede `choiceMutate` bulunur. Aile mutasyonu/extraTag/direct consequence taşımayan **14 varyant** açılış/bağlam metni farklılığı sağlar. Örnek `fam_informants` base/heat/protected: mevcut aktör hafızasını anlatır; ayrı ödül vermez. Bu, her varyantın yeni mekanik üretmediği anlamına gelir; bütün hikâyelerin boş olduğu anlamına gelmez. B/P2, release zorunluluğu değil.
- 30 omurga seçeneğinde effect/special/tag imzası aynı olan yalnız bir çapraz-dönem çift bulundu: `e3-oku` ve `e8-eymur`. Aynı olay içinde birebir çift yok. E3 ayrıca belirli claim’i elde açar; E8 başka takvim/bağlama sahiptir. Bu çift **eşdeğer hikâye seçeneği** ilan edilip silinmemeli.
- Statik politikaların tohumlar arasında aynı hamle dizisini üretmesi bot tercihinden kaynaklanır. Koşullu varyant/yan olay çeşitliliğini yalnız bu action-ID dizisine bakarak yok saymak yanlış olur.
- Uzun oyun, mevcut tasarımda 9–10 dönemlik tam kampanyadır; sonsuz sandbox değil. Harita/dosya okuma tur harcamaz; yalnız kararlar kapasite tüketir. Boş zorunlu görev zinciri veya doğrulanmış uzun softlock bulunmadı.

## 6. Geçmiş kararların kalıcı sonuçları ve soruşturma hafızası

Önceki koruma/ihanet/ifşa, kaynakların konuşması, faction bilgisi ve plan dönüşlerini etkiliyor (A09–A11). Kanıt karşılaştırmaları sonraki kaynak clash/follow-up’ları, chain halkaları sonraki hukuk ailesini ve kamu/eşik koşulları sonucun seçilmesini etkiliyor (`families.ts`, `recap.ts:291–325`). Hatalı stratejinin maliyeti görünür önizleme ve gecikmeli sonuçtur; rastgele ceza önerilmedi.

**B03 — B / P1: oyuncunun kendi soruşturma izi ve son dosyanın bilgi kapsamı eksik.**

- `executeCoreAction` genel dönüşünde (`engine.ts:874`) çoğu karar `{id, summary:id}` olarak yazılır. Karar girdisindeki `claimId/nodeId/edgeId` `Decision.target` alanına taşınmaz. `bag_guclendir/gevset` ve kişi duruşları istisna; onlar hedef yazıyor. `applyPlanConsequences` tag’lerinde bazı hedefler tutulur, fakat `formatReplayJson` karar listesine bu bağlamı birleştirmez.
- Canlı araştırmacı karşılaştırması ve hukuk zinciri sonrasında kayıttaki karar nesnesinde target yoktu. Ayrı comparison/chain listesinde claim kimliği var; bu nedenle **tüm hafıza kayıp** denmiyor. Tut/paylaş/yayımla gibi tekrarlanan işlemde “hangi dosyada ne zaman ne yaptım?” karar geçmişinde yine eksik.
- Eşlenik kampanyaların araştırmacı başına 18, hukuk başına 16 hedefli hamlesinde `decisions.target` sayısı sıfır. Bu sayım UI plan hedefi ile kalıcı karar alanını karşılaştırır; decision listesinde her hamlenin tamamen kaybolduğu iddiası değildir.
- `recap.ts:34–70::buildDossier` oyuncunun karşılaştığı/karşılaştırdığı kayıtları süzmeden **tüm katalogdaki** contradiction metinlerinden ilk sekizi alır. Yeni saha eli üç claim taşırken bu sekiz kaydın altısı elde yoktur. 18 gerçek son dosyada da contradiction listesi aynı çıktı. `EndScreen.tsx` bunların ilk üçünü gösterir. Böylece kişisel araştırma özeti genel bibliyografik notla karışır.
- Açılan, karşılaştırılan, yayımlanan ve sonuçsuz bırakılan iddialar tek tek özetlenmez; açık sorular katalog sırasına göre görünür. Mevcut `hand`, `comparisons`, `chain`, `decisions`, `tags` ve pending-plan parser yeterli temeldir. Soy ağacı, yeni ekran veya yeni kayıt motoru gerekmiyor.

## 7. Tarihsel ve anlatısal tutarlılık

Olumlu: kaynak iddiası ile sabit ölüm/kaza çıpası ayrı; kaynaklar gerçek kişiler için uydurma emir veya niyet üretmeyi açıkça yasaklıyor (`docs/SOURCES.md`, `authority.ts`). `dogrula` TRUE yazmıyor. Komplo tek ele zorlanmıyor. Bu denetim bir kitap/tanıklık metnini tarihsel hüküm olarak yeniden sunmuyor.

**B04 — B / P2: kaynakların bulunabilirliği ve takvim ayrımı dar bir içerik işi olarak ertelenebilir.**

- 17 `SOURCES` girdisinin location alanları çoğunlukla “kitap”, “tanıklık”, “arşiv hattı”; doğrudan URL/baskı/sayfa alanı burada yok. Yapısal validasyon kaynağın varlığını doğruluyor, iddianın doğru yerde alıntılandığını doğrulamıyor. Gerçek kişilerle ilgili geniş iddialar yalnız bu metadata üzerinden bağımsız doğrulanamaz.
- `sources.ts::src_kutlu_savas` yılını 1997 yazıyor. HUDOC’taki **Kılıç/Türkiye**, başvuru 22492/93, 28 Mart 2000 kararının §29’u raporun Başbakana Ocak 1998’de sunulup yayımlandığını kaydeder. Bu dar bibliyografik tarih uyuşmazlığı doğrulandı; kaynağın içindeki kişi iddialarının doğru olduğu sonucu çıkarılmadı. [Mahkeme kaydı, Türkçe çeviri](https://hudoc.echr.coe.int/app/conversion/pdf/?filename=CASE+OF+KILI%C3%87+v.+TURKEY+-+%5BTurkish+Translation%5D+by+the+Turkish+Ministry+of+Foreign+Affairs.pdf&id=001-123599&library=ECHR).
- TBMM’nin açık erişim kaydı Susurluk komisyon raporunu 27 Mayıs 1997 ve Sıra Sayısı 301 olarak tarihler. [TBMM birincil katalog kaydı](https://acikerisim.tbmm.gov.tr/items/a4bf7511-78a5-4a92-a15c-0855fe51789c). Bu, 3 Kasım 1996 kazasıyla aynı gün yayımlanmış bir komisyon raporu değildir.
- `engine.ts::applyEvent`, T10’da `clm_tbmm_commission` bilgisini “kaza kaydı” kaynağıyla TRUE yapıyor; hukuk başlangıcında komisyon RUMOR olarak bile bulunuyor. Finalin kaza-sonrası kurumsal gelişmeleri sıkıştırdığı anlaşılıyor; bunun “sonraki dönem/retrospektif kaynak” olduğunun açık ayrılması gerekir. Yeni olay veya yeni fail iddiası eklemek gerekmez.
- Bu inceleme tüm 17 eserin baskı/sayfa taraması değildir. Tüm içerik doğru veya yanlış diye toplu sertifika verilmedi. Yukarıdaki iki birincil tarih kontrolü dışındaki iddialar katalogdaki nitelendirmeleriyle korunmalıdır.

## 8. Öncelik ve A–D sınıflandırması

| Bulgu / öneri | Sınıf | Öncelik / karar | Kanıt |
|---|---|---|---|
| Mevcut atlası, exact preview’ı, next-step rehberini yeniden yapmak | A | Mükerrer; yapma | A02/A03, gerçek Chromium açılışı |
| Aktör hafızası, source paylaşımı, faction asimetrisi, gecikmeli dönüş yaratmak | A | Mükerrer; mevcut sistemleri koru | A05/A09–A11, ADAPT kabul raporları |
| Kayıt kurtarma/locale byte korumasını baştan yapmak | A | Mükerrer | A13, canonical receipt; yeni 18+3 reload |
| Rol hedeflerini kullanılabilir araştırma/kanıt ilerlemesine bağlamak | B | **P1 / Paket 1** | B01; tüm UI seçenek taraması + canlı araştırmacı/hukuk |
| Genel belge adedini seçili dosyaya yeterli kanıt saymamak | B | **P1 / Paket 2** | B02 eşlenik tek-halka karşı örneği |
| İki okuma kararını iki farklı belge sanan hedefi düzeltmek | B | **P1 / Paket 2** | `duplicateRead` iki karar / bir belge |
| Hedefli kararın kimliğini mevcut kalıcı geçmişe geçirmek | B | **P1 / Paket 3** | B03; gerçek saved decision + chain farkı |
| Son dosyayı edinilen/işlenen/soru kalan iddialarla sınırlamak | B | **P1 / Paket 3** | B03; altı unheld kayıt, 18 özette tek contradiction listesi |
| Metinsel 14 varyantı mutlaka ayrı ödüle çevirmek | B | P2; içerik seçimi, zorunlu değil | `textOnlyVariants`; koşullu bağlam zaten var |
| Kaynak locator ve 1996/1997/1998 ayrımını düzeltmek | B | P2; ayrı içerik işi | B04 ve iki birincil kayıt |
| Sıfırdan kanıt panosu, ayrı vaka motoru, doğrusal görev menüsü | D | Kapsam dışı | Mevcut atlas/claim/chain kapasitesi yeterli |
| Yeni AI söylenti/itibar motoru veya rastgele yanlış-karar cezası | D | Gereksiz | ADAPT 3 ve mevcut confidence/propagation/heat |
| Tarihsel çıpayı iptal edebilmek, belirsiz emri kesinleştirmek | D | Ürün/kaynak disipliniyle çelişir | `SOURCES.md`, `authority.ts`, fixed anchors |
| Deneysel iki hat için tam ayrı kampanya veya sonsuz oyun | D | Bu auditin küçük paket kapsamı dışında | 10 dönem kimliği ve StartScreen deneysel etiketi |

**P0: doğrulanmış oyun/kayıt bozucu hata yok. C: mevcut üç çekirdeğin yerine konmasını gerektiren tamamen eksik büyük bir sistem doğrulanmadı.** Bulguları sırf sınıfları doldurmak için C’ye veya P0’a yükseltmedim. Üç P1 başlığının ortak niteliği, çalışan sistemin hedef/kapsam/atfetme eksikliği olmasıdır.

## 9. En fazla beş küçük uygulama paketi — önerilen yalnız üç

### Paket 1 — Mevcut hedefi rolün gerçek ilk ilerlemesine bağla

- Kanıt: B01. İlk araştırmacı/hukuk hedefi sunulan kararlarla erişilemiyor.
- En küçük çözüm: mevcut objective kataloğu ve mevcut hedef satırında rolün karşılaştırma veya delil halkasını okuyarak uygun başlık/tamamlanma üret. Saha/idari hedefini koru. Sonraki açık hedef mevcut claim/chain aşamasını işaret etsin; yeni görev ağacı veya ekran açma.
- Dosyalar: `sim/objectives.ts`, gerekli mevcut i18n objective kopyaları; yalnız gerekirse `SidePanel.tsx` hedef açıklaması. `OBJECTIVE_REWARDS` ve `obj-reward:*` tek-ödeme koruması korunmalı.
- Risk: eski schema-5 kaydında tamamlanmış ödülün yeniden verilmesi veya mevcut hedefin geri alınması. Mekanik katsayıları gereksiz değiştirme.
- Hedefli test: dört rol × doğal T1, her açık hedef için gerçek `decisionOptions` üzerinden tamamlanabilir hamle; araştırmacıda gerçek compare, hukukta gerçek chain; saha/idari mevcut davranış; ödül tek sefer + save/load; mevcut satır boyutu/yerleşimi sabit.

### Paket 2 — Dosya/eşik ilerlemesini ilgili kayıt ve gerçek belgeye bağla

- Kanıt: B02 ve duplicateRead. Seçili tek halka, ilişkisiz `dosya-t1` ile yeterli oluyor; iki tekrar okuma bir belge üretirken hedef iki sayıyor.
- En küçük çözüm: mevcut `claimId`, `investigation.chain/comparisons/documents` üzerinden eşik için ilgili ve anlamlı belge/kaynak katkısını ayır. Genel okumanın bilgi/giz/kapasite etkisini ve doğal tekrarını koru; genel okuma kendiliğinden seçili iddiaya yeni ispat olmasın. `obj_chain` karar sayısı yerine gerçek ilerleme saysın. İddianın doğruluğunu veya tarihsel kaydı değiştirme.
- Dosyalar: `engine.ts` ilgili dört hamle dalı; gerekirse `sim/investigation.ts` küçük saf kapsam helper’ı; `sim/objectives.ts` gerçek belge predikatı; mevcut preview/copy gerekiyorsa aynı alanlar.
- Risk: eski dosyalardaki generic belgeyi silmek veya hukuk hattını kilitlemek. Generic legacy notlar korunmalı, yeni doğrulanmış delilmiş gibi otomatik yükseltilmemeli; uygun sonraki hamle mevcut masada gösterilmeli.
- Hedefli test: tek halka A + generic not açmaz; A’ya ilişkin yeni uygun katkı açar; B’nin belgesi A’yı tamamlamaz; aynı-turn tekrar yalnız tek yeni not sayar; gerekli gerçek yeni çalışma tekrar yapılabilir; preview=commit; eski kayıt ve kamu baskısı gerektiren ending gate’leri korunur.
- Bağımlılık: Paket 1 ile aynı objective dosyası nedeniyle onun branch’i üzerine yapılmalı; kör bağımsız merge önerilmez.

### Paket 3 — Karar hedefini ve kişisel araştırma sonucunu mevcut hafızada tamamla

- Kanıt: B03. Claim kimliği comparison/chain’de varken karar target alanı boş; final çelişkileri katalogdan bağımsız dökülüyor.
- En küçük çözüm: mevcut opsiyonel `Decision.target` ve mevcut açıklama alanıyla gerçekten seçilen claim/bağ/aktörü yaz. Finalde edinilen/işlenen iddialar, karşılaştırma, paylaşım, zincir ve açık soruları bu mevcut kayıtlardan seç. Genel kaynak notu gerekiyorsa “incelemediğin tarihsel ek” olarak ayır; oyuncu çözdü gibi sunma. Yeni tarihçe veritabanı veya büyük ekran oluşturma.
- Dosyalar: `engine.ts::executeCoreAction`, gerekirse `planning.ts::applyPlanConsequences`, `recap.ts::buildDossier/formatReplayJson`, mevcut `EndScreen.tsx` bloklarının içeriği/i18n. Save schema/key değişmemeli; eski kararlarda bilinmeyen hedef dürüstçe bilinmiyor kalmalı.
- Risk: eski summary metinlerinin çevirisini veya eski save byte’larını değiştirmek, NPC’nin gizli bilgisini sızdırmak, kayıt geçmişine uydurma hedef doldurmak. Yalnız yeni karar gerçek hedefi yazar; eski özetler güvenli fallback alır.
- Hedefli test: compare/tut/paylaş/yayımla/chain ve bağ hamlesi doğru target ile roundtrip; farklı claim’ler farklı kişisel özet; elde olmayan çelişki kişisel sonuçta yok; bilinen tartışma “çözüldü” denmez; eski target’sız kayıt yüklenir; replay ve TR/EN mevcut düzeni sabit; sonuçsuz/geç plan “tamamlandı” diye yazılmaz.
- Bağımlılık: hedef kimliği kısmı bağımsız hazırlanabilir; son dosya kabulü Paket 1–2 ile birleşik davranış üzerinde yapılmalı. Yeni bir genel regresyon ordusu yerine üç karşı örnek + mevcut dar save/preview/ending testleri yeterlidir.

## 10. Koruma, kabul ve kanıt sınırları

Korunacaklar: mevcut görsel düzen/menüler/atlas/kanıt gösterimi; 18 düğümün semantik grafı ve 10 dönem; tarihsel içerik ve bütün anlamlı seçenekler; `SAVE_KEY=jitem-derin-ag-v3`, schema/version 5; eski target’sız/generic belge kayıtları; sourceClaim ve gameReconstruction ayrımı; deterministic RNG, maliyet/AP ve tarihsel çıpalar; diğer TarikLab oyunları, CI ve Cloudflare altyapısı.

Bu Faz 0’da bunların hiçbirine kod değişikliği yapılmadı. Upstream’e yalnız bu rapor dosyası commit edilmelidir. PR, merge, sync veya deployment bu görev kapsamında yoktur. Portal runtime’ı elle düzenlenmemelidir.

Yeni kabul kanıtı:

1. Katalog import/sayımı, `validateResearch()` ve altı karşı-örnek koşulu doğrulandı; tüm source kodu baseline ağacındaydı.
2. 18 UI-seçeneklerine uyan kampanya / 375 ücretli hamle, 18 son, 18 JSON save roundtrip. Bir tohumdaki farklı stratejiler karşılaştırıldı; toplam 3 ending tipi. Önceki 400 koşuluk balance testi tekrar edilmedi.
3. Canlı portalda **üç yeni TR Chromium vakası**: saha 390, araştırmacı/hukuk 1280. Gerçek başlangıç, gerçek olay tercihi, gerçek ücretli hamle, ilk tur çözümü ve kaydın birebir reload’u geçti. Runtime hash’i doğrulandı. Hiçbir başlangıç state fixture’ı enjekte edilmedi; mevcut kullanıcının kayıt alanına erişilmedi. Ekran görüntüleri görsel olarak incelendi.
4. Ölçüm yardımcısında ilk denemede save API’ye object yerine JSON string verilmesi ve JSON’un undefined alanlarını atması düzeltildi; bunlar ürün P0’ı olarak sayılmadı. Son kontroller geçerli `parseSave(JSON.stringify(serialize(state)))` ile yapıldı.

Eşlik eden Codex tesliminde `measurements.json` SHA256: `1e5ea55e4aa22f94d59a302280f2e70cce15f13834db825571400cc9bd3bb0dc`; `browser/results.json` SHA256: `a88ee4fa70804202d85dae5d1d16beee68a3c302be51a736668a7503a707a695`. Rapor bulguları bu dosyalar olmadan da yukarıdaki sayılar, kaynak satırları ve karşı örnek adımlarıyla okunabilir.

Yeniden üretim için baseline üzerinde saf örnek:

```js
import { createGame, applyEventChoice, eventViewFor, executeAction } from './src/game/engine.ts';
import { syncObjectives } from './src/game/sim/objectives.ts';
import { buildDossier } from './src/game/sim/recap.ts';
let s = createGame('saha', 42);
s = applyEventChoice(s, eventViewFor(s).choices[0].id);
s = executeAction(executeAction(s, { id: 'dosya_oku' }), { id: 'dosya_oku' });
console.log(s.investigation.documents); // ['dosya-t1']
console.log(syncObjectives({ ...s, turn: 9 }).objectives.find(o => o.id === 'obj_chain'));
// done; geç-act predikatını izole test eder, doğal T1'in act VI olduğunu söylemez.
console.log(buildDossier(createGame('saha', 42)).contradictions.length); // 8
```

Raporun kararı: çalışan üç çekirdeği yeniden geliştirmeden **üç küçük P1 paketi** yeterli adaydır. Doğrulanmış P0 yok; yeni motor, yeni atlas veya yeni tarihsel olay gerekmiyor. Bu belge geliştirme/merge/yayın onayı değildir.
