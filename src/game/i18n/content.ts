import type { Locale } from "./types.ts";

type Pair = { tr: string; en: string };
const p = (tr: string, en: string): Pair => ({ tr, en });

export const EVENTS_I18N: Record<string, { title: Pair; body: Pair; hidden: Pair }> = {
  e1: {
    title: p("Fiilî oluşum", "A working formation"),
    body: p(
      "Güneydoğu’da güvenlik bozulmuştur. Jandarma istihbarat içinde resmi olmayan ama fiilî bir yapı şekillenir: gruplar, timler, itirafçılar. Arif Doğan idari tarafta konuşulur. Ersever saha tarafında büyür. Resmi dil ‘yok’ der. Fiilî dil çalışmaya başlar.",
      "Security in the southeast has broken down. Inside gendarmerie intelligence an unofficial but working structure takes shape: groups, teams, informants. Arif Doğan is spoken of on the administrative side. Ersever grows on the field side. Official language says ‘there is no such unit’. Working language starts to operate.",
    ),
    hidden: p(
      "Kesin kuruluş günü belgesi yok. Siyasi zirvenin tam bilgi ve onay derecesi BOŞLUK. Tek el komplo bu dosyada üretilmez.",
      "There is no founding-day document. How much the political summit knew and approved is a GAP. This file does not mint a single-hand conspiracy.",
    ),
  },
  e2: {
    title: p("İtirafçı katmanı", "The informant layer"),
    body: p(
      "Saha, resmi birliğin yetmediği yerde itirafçı timleriyle genişler. Aygan hattı kapasite olarak görünür. Yeşil henüz gölgede bir operatif profilidir. Tim, Reis’ten fazla katmandır.",
      "Where a regular unit is not enough, the field widens with informant teams. The Aygan line shows as capacity. Yeşil is still a shadowed operative profile. A team is more than one Reis.",
    ),
    hidden: p(
      "Her faili meçhulün yazılı emirle yapıldığı iddiası ZAYIF’tır. Bu masada cinayet envanteri tutulmaz; kapasite tutulur.",
      "The claim that every unsolved killing was done on a written order is WEAK. This desk keeps no murder inventory; it keeps capacity.",
    ),
  },
  e3: {
    title: p("MİT içi hat", "A line inside MIT"),
    body: p(
      "MİT tek yürek değildir. Hiram Abas profesyonel operatör profilindedir. Mehmet Eymür kontrterörden izler, yazar. İki hat JİTEM’i henüz tam olarak kendi işi saymaz. Parçalı çıkar.",
      "MIT is not one heart. Hiram Abas is a professional operator. Mehmet Eymür watches from counter-terror and writes. Neither line yet treats JITEM as fully its own business. Partial interest.",
    ),
    hidden: p(
      "Eymür–Abas gerilimi kurum içi meseledir. Jandarma masasına otomatik bağlanmaz. Bilgi asimetresi burada başlar.",
      "The Eymür–Abas tension is an inside-institution matter. It does not automatically bind to the gendarmerie desk. Knowledge asymmetry begins here.",
    ),
  },
  e4: {
    title: p("Komuta kayması", "A command shift"),
    body: p(
      "Dosyalar el değiştirir. Haritalar aynı kalır. Arif Doğan idari hattan çekilir; Veli Küçük hattı konuşulmaya başlar. Ersever sahada kalır. Kimileri buna devir der, kimileri kayma, kimileri hiçbir şey demez.",
      "Files change hands. The maps stay. Arif Doğan pulls off the administrative line; a Veli Küçük line starts to be spoken. Ersever stays in the field. Some call this a handover, some a slide, some say nothing.",
    ),
    hidden: p(
      "İdari seviye ile saha operatörünün bildikleri farklıdır. Kim ne kadar sorumlu, kim ne kadar haberdar — net değildir. Detay TARTIŞMALI.",
      "What the administrative layer knows and what the field operator knows are not the same. Who is how responsible, who is how informed — it is not clear. The detail is DISPUTED.",
    ),
  },
  e5: {
    title: p("Abas hattı kırılır", "The Abas line breaks"),
    body: p(
      "İstanbul. Hiram Abas suikastta ölür. Aynı yıl içinde suikasta uğrayan ikinci MİT görevlisidir. Cenazede Eymür ve Eken vardır. MİT profesyonel kanadı sarsılır. Jandarma hattı bunu kendi zaferi sanmamalıdır.",
      "Istanbul. Hiram Abas is killed. He is the second MIT officer assassinated in the same year. Eymür and Eken are at the funeral. MIT’s professional wing is shaken. The gendarmerie line should not take this as its own victory.",
    ),
    hidden: p(
      "Tanıklara göre üç kişi. Bölgedeki takip ekibinin üç gün önce kaldırıldığı söylenir. Fail ve emir zinciri TARTIŞMALI bırakılır. JİTEM’e zorla bağlama — TARTIŞMALI.",
      "Witnesses speak of three people. The local watch team is said to have been pulled three days earlier. Perpetrator and order-chain are left DISPUTED. A forced bind to JITEM — DISPUTED.",
    ),
  },
  e6: {
    title: p("Ersever konuşur", "Ersever talks"),
    body: p(
      "9–14 Haziran 1993. Kasetler döner. Ersever, Soner Yalçın’a anlatır: timler, itirafçılar, sivil kıyafet. Yıllardır ‘yok’ denilen yapının içinden cümleler çıkar. Resmi dil çatlar.",
      "9–14 June 1993. The tapes turn. Ersever talks to Soner Yalçın: teams, informants, civilian clothes. Sentences come from inside a structure that had been called ‘nonexistent’ for years. Official language cracks.",
    ),
    hidden: p(
      "Konuşan içerideki, BİLGİ’yi patlatır ve GİZ’i yakar. Bastırma GİZ kaybını azaltır; kaseti yok etmez. Bu eşik tarihidir.",
      "The insider who talks blows knowledge open and burns secrecy. Suppression reduces secrecy loss; it does not destroy the tapes. This is a threshold date.",
    ),
  },
  e7: {
    title: p("Saha hattı kapanır", "The field line closes"),
    body: p(
      "Kasım 1993. Ahmet Cem Ersever, Nevval Boz ve bir itirafçı öldürülür. Cesetler bulunur. Saha hattının konuşan ucu kapanır. Masa, kahraman gömmez; kapasite ve sızıntı hesabı yapar.",
      "November 1993. Ahmet Cem Ersever, Nevval Boz and an informant are killed. The bodies are found. The talking end of the field line closes. The desk does not bury a hero; it accounts for capacity and leak.",
    ),
    hidden: p(
      "Fail olarak Yeşil — GÜÇLÜ (çoklu tanıklık). Emir kaynağı Veli Küçük / Ankara — TARTIŞMALI. Bu dosyada emir uydurulmaz.",
      "Yeşil as perpetrator — STRONG (multiple testimony). Order source Veli Küçük / Ankara — DISPUTED. This file does not invent an order.",
    ),
  },
  e8: {
    title: p("Çatlı yükselişi", "Çatlı’s rise"),
    body: p(
      "Jandarma saha hattı yaralıdır. Boşluğu Emniyet–yeraltı kesişimi doldurur. Abdullah Çatlı sahte kimliklerle ısınır. Kocadağ resmi yüz olarak görünür. Eymür uyarı yazmaya devam eder. Bu, JİTEM’in uzantısı değil ayrı bir çıkar ağıdır.",
      "The gendarmerie field line is wounded. The police–underworld intersection fills the gap. Abdullah Çatlı warms with false papers. Kocadağ shows as the official face. Eymür keeps writing warnings. This is not a JITEM extension — a separate interest network.",
    ),
    hidden: p(
      "Özel tim hattı ile jandarma istihbarat aynı masa değildir. Eşgüdüm varsayımı TARTIŞMALI’dır ve ifşa pahalıdır.",
      "The special-team line and gendarmerie intelligence are not the same desk. A joint-command assumption is DISPUTED and expensive to expose.",
    ),
  },
  e9: {
    title: p("Kesişim birikir", "The intersection gathers"),
    body: p(
      "Çatlı zirveye yaklaşmıştır. Yanında Gonca Us vardır. Bucak siyasi koridor olarak bağın ucuna gelir. Eymür uyarıları birikir. Araç henüz yolda değildir; ağ ise fiilen aynı kareye toplanmaktadır.",
      "Çatlı has neared a peak. Gonca Us is beside him. Bucak arrives at the end of the tie as a political corridor. Eymür’s warnings pile up. The car is not yet on the road; the network is already gathering into the same frame.",
    ),
    hidden: p(
      "Gonca ilişkisi ≈1 yıl. Detay sınırlıdır. BELGELİ kilit 3 Kasım’da atılır. Oyuncu yeni efsane bağ uyduramaz; var olanı gevşetebilir veya sıkılaştırabilir.",
      "The Gonca relationship is about a year. Detail is limited. The DOCUMENTED lock is set on 3 November. The player cannot invent a legend-tie; they can loosen or tighten what exists.",
    ),
  },
  e10: {
    title: p("Görünürlük şoku", "Visibility shock"),
    body: p(
      "Balıkesir–Susurluk yolu. Gece. Mercedes bir kamyonla çarpışır. İçinde Kocadağ, Bucak, Çatlı, Gonca Us. Silahlar, kimlikler, belgeler. Yıllarca ‘yok’ denilen ilişkiler bir kaza ile görünür hale gelir. Susurluk bir başlangıç değildir. Bir sonuçtur.",
      "The Balıkesir–Susurluk road. Night. A Mercedes hits a truck. Inside: Kocadağ, Bucak, Çatlı, Gonca Us. Weapons, papers, documents. Ties that had been called ‘nonexistent’ for years become visible in a crash. Susurluk is not a beginning. It is an outcome.",
    ),
    hidden: p(
      "Çatlı–Kocadağ–Bucak–Gonca bağları BELGELİ kilitlenir. TBMM komisyonu, inkâr, parçalı itiraf. Tek doğru komplo çözümü yoktur. Masa ya kontrollü parçalanmayı taşır ya görünürlükte yanar.",
      "The Çatlı–Kocadağ–Bucak–Gonca ties lock as DOCUMENTED. A parliamentary commission, denial, partial admission. There is no single true conspiracy solution. The desk either carries a controlled break-up or burns in visibility.",
    ),
  },
};

export const CHOICES_I18N: Record<string, { label: Pair; hint: Pair; log: Pair }> = {
  "e1-saha": {
    label: p("Saha timlerini büyüt", "Grow the field teams"),
    hint: p("Ersever tipi. Kapasite artar, iz kalır.", "Ersever type. Capacity rises; a trace remains."),
    log: p("Duruş: saha büyüdü. Resmi kayıt yok.", "Stance: the field grew. No official record."),
  },
  "e1-idari": {
    label: p("İdari kalkan ör", "Weave an administrative shield"),
    hint: p("Doğan tipi. Koruma kalın, saha mesafeli.", "Doğan type. Cover thick, field at a distance."),
    log: p("Duruş: idari kalkan. İnkâr dili önde.", "Stance: administrative shield. Denial language forward."),
  },
  "e1-izle": {
    label: p("Sadece izle", "Only watch"),
    hint: p("Az iz, az güç. Sis durur.", "Little trace, little power. Fog holds."),
    log: p("Duruş: mesafe. Masa izliyor.", "Stance: distance. The desk is watching."),
  },
  "e2-al": {
    label: p("İtirafçı katmanını al", "Take on the informant layer"),
    hint: p("Bilgi ve saha. Konuşma riski.", "Knowledge and field. Talk-risk."),
    log: p("Duruş: itirafçı alındı.", "Stance: informant taken on."),
  },
  "e2-resmi": {
    label: p("Resmi birlikle yetin", "Stay with the regular unit"),
    hint: p("Daha az iz, daha az kapasite.", "Less trace, less capacity."),
    log: p("Duruş: resmi hat. İtirafçı sınırlı.", "Stance: official line. Informants limited."),
  },
  "e2-sik": {
    label: p("Az konuştur, sıkı tut", "Talk less, hold tight"),
    hint: p("Orta yol.", "A middle path."),
    log: p("Duruş: sıkı denetim.", "Stance: tight control."),
  },
  "e3-oku": {
    label: p("Eymür uyarısını oku", "Read Eymür’s warning"),
    hint: p("Sis açılır. Giz incelir.", "Fog lifts. Secrecy thins."),
    log: p("Duruş: MİT içi not okundu. JİTEM emri değil.", "Stance: an inside-MIT note was read. Not a JITEM order."),
  },
  "e3-mesafe": {
    label: p("MİT’e mesafe koy", "Put distance from MIT"),
    hint: p("Eşgüdüm yok. Sadece uzak dur.", "No joint command. Only stay away."),
    log: p("Duruş: MİT hattı soğutuldu.", "Stance: the MIT line was cooled."),
  },
  "e3-karisma": {
    label: p("Karışma", "Do not interfere"),
    hint: p("Kendi işine bak.", "Mind your own work."),
    log: p("Duruş: MİT içi işine girilmedi.", "Stance: no entry into MIT’s inside business."),
  },
  "e4-saha": {
    label: p("Ersever’i sahada tut", "Keep Ersever in the field"),
    hint: p("Kapasite kalır, koruma incelir.", "Capacity stays; cover thins."),
    log: p("Duruş: saha hattı bırakılmadı.", "Stance: the field line was not left."),
  },
  "e4-uy": {
    label: p("Yeni komutaya uy", "Follow the new command"),
    hint: p("Kalkan artar. Saha uzaklaşır.", "The shield rises. The field recedes."),
    log: p("Duruş: devir kabul. Detay TARTIŞMALI.", "Stance: handover accepted. Detail DISPUTED."),
  },
  "e4-not": {
    label: p("Kopuşu not et", "Note the break"),
    hint: p("Bilgi artar, giz düşer.", "Knowledge rises, secrecy drops."),
    log: p("Duruş: kayma dosyalandı. Emir uydurulmadı.", "Stance: the slide was filed. No order invented."),
  },
  "e5-not": {
    label: p("MİT şokunu not et", "Note the MIT shock"),
    hint: p("Asimetri artar. Bağ uydurulmaz.", "Asymmetry grows. No tie is invented."),
    log: p("Duruş: Abas kırılması not edildi. Fail TARTIŞMALI bırakıldı.", "Stance: the Abas break was noted. Perpetrator left DISPUTED."),
  },
  "e5-mesafe": {
    label: p("Cenaze mesafesi", "Funeral distance"),
    hint: p("Profesyonel kanada yaklaşma.", "Do not approach the professional wing."),
    log: p("Duruş: mesafe. JİTEM zafer saymadı.", "Stance: distance. JITEM did not count a victory."),
  },
  "e5-zorla": {
    label: p("Zorla bağlama iddiasına yaklaşma", "Do not lean into a forced bind"),
    hint: p("TARTIŞMALI. İfşa pahalı. Hat yaratılmaz.", "DISPUTED. Exposure is expensive. No line is created."),
    log: p("Duruş: JİTEM’e zorla bağlama yok. İddia TARTIŞMALI kaldı.", "Stance: no forced bind to JITEM. The claim stayed DISPUTED."),
  },
  "e6-bas": {
    label: p("Bastır", "Suppress"),
    hint: p("Kaseti yok etmez. Hasarı keser.", "Does not destroy the tapes. Cuts the damage."),
    log: p("Duruş: sızıntı bastırıldı. Konuşma durmadı, GİZ hasarı kesildi.", "Stance: leak suppressed. Talk did not stop; secrecy damage was cut."),
  },
  "e6-not": {
    label: p("Konuşsun, not al", "Let him talk, take notes"),
    hint: p("Bilgi patlar, giz yanar.", "Knowledge blows open, secrecy burns."),
    log: p("Duruş: kaset tutuldu. İçeriden kırılma.", "Stance: the tape was kept. A break from inside."),
  },
  "e6-yumusa": {
    label: p("Araya gir, yumuşat", "Step in, soften"),
    hint: p("Orta hasar.", "Middle damage."),
    log: p("Duruş: yumuşatma. Kaset var, dil ölçülü.", "Stance: softening. The tape exists; the language is measured."),
  },
  "e7-tut": {
    label: p("Saha hattını dağıtma", "Do not scatter the field line"),
    hint: p("Kapasite kalsın.", "Let capacity remain."),
    log: p("Duruş: saha kapanmadı. Kahraman yok.", "Stance: the field did not close. No hero."),
  },
  "e7-inkar": {
    label: p("İnkâr diline çek", "Pull into denial language"),
    hint: p("Resmen yok. Kapasite düşer.", "Officially nonexistent. Capacity drops."),
    log: p("Duruş: inkâr. Saha geri çekildi.", "Stance: denial. The field pulled back."),
  },
  "e7-dosya": {
    label: p("Yeşil iddiasını dosyala", "File the Yeşil claim"),
    hint: p("Fail GÜÇLÜ. Emir TARTIŞMALI — uydurulmaz.", "Perpetrator STRONG. Order DISPUTED — not invented."),
    log: p("Duruş: fail iddiası dosyalandı. Emir boşluğu duruyor.", "Stance: perpetrator claim filed. The order-gap remains."),
  },
  "e8-sogut": {
    label: p("Kesişimi soğut", "Cool the intersection"),
    hint: p("Emniyet hattını yavaşlat.", "Slow the police line."),
    log: p("Duruş: Emniyet–yeraltı soğutuldu. JİTEM uzantısı değil.", "Stance: police–underworld cooled. Not a JITEM extension."),
  },
  "e8-fayda": {
    label: p("Faydayı kullan", "Take the benefit"),
    hint: p("Para döner, giz yer.", "Money returns, secrecy eats."),
    log: p("Duruş: Çatlı hattı fayda olarak işlendi. Eşgüdüm uydurulmadı.", "Stance: the Çatlı line was worked as benefit. No joint command invented."),
  },
  "e8-eymur": {
    label: p("Eymür uyarısını dinle", "Hear Eymür’s warning"),
    hint: p("Sis açılır.", "Fog lifts."),
    log: p("Duruş: uyarı okundu. İki hat ayrı kaldı.", "Stance: the warning was read. The two lines stayed apart."),
  },
  "e9-gevse": {
    label: p("Kareyi gevşet", "Loosen the frame"),
    hint: p("Çatlı bağlarını gevşet. Kaza takvimi durmaz.", "Loosen Çatlı’s ties. The crash calendar does not stop."),
    log: p("Duruş: kesişim gevşetildi. 3 Kasım takvimi durmadı.", "Stance: the intersection was loosened. The 3 November calendar did not stop."),
  },
  "e9-gormez": {
    label: p("Görmezden gel", "Look away"),
    hint: p("Kısa koruma, uzun risk.", "Short cover, long risk."),
    log: p("Duruş: görmezden gelindi. Ağ aynı karede birikiyor.", "Stance: looked away. The network is gathering in the same frame."),
  },
  "e9-uyari": {
    label: p("Uyarıyı ilet", "Pass the warning"),
    hint: p("Bilgi artar.", "Knowledge rises."),
    log: p("Duruş: uyarı iletildi. BELGELİ kilit henüz yok.", "Stance: warning passed. No DOCUMENTED lock yet."),
  },
  "e10-inkar": {
    label: p("İnkâr et", "Deny"),
    hint: p("Kaza durmaz. Dil tutulur.", "The crash does not stop. The language is held."),
    log: p("Duruş: inkâr. 3 Kasım görünürlüğü geldi.", "Stance: denial. 3 November visibility arrived."),
  },
  "e10-komisyon": {
    label: p("Komisyonla idare et", "Manage it with a commission"),
    hint: p("Siyasi kalkan, giz incelir.", "Political shield, secrecy thins."),
    log: p("Duruş: TBMM/kamuoyu idaresi. Parçalı itiraf.", "Stance: parliament/public management. Partial admission."),
  },
  "e10-parca": {
    label: p("Parçalı dağıt", "Break it into pieces"),
    hint: p("Tek karede durma.", "Do not stay in a single frame."),
    log: p("Duruş: parçalı dağıtım. Tek el yoktu.", "Stance: broken distribution. There was no single hand."),
  },
};

export const ENDINGS_I18N: Record<string, { title: Pair; verdict: Pair; body: Pair }> = {
  inkar_ayakta: {
    title: p("Ağ fiilen çalıştı", "The network kept working"),
    verdict: p("KONTROL", "CONTROL"),
    body: p(
      "1986–96 boyunca masa, resmi ‘yok’ dilini ayakta tuttu. Saha kapasitesi düşmedi. 3 Kasım görünürlüğü geldi; ama parça parça çıkar ağları henüz tek dosyada erimedi. Kazanmak, komployu çözmek değil, inkâr ile fiilî yapıyı aynı anda taşımak demekti.",
      "Through 1986–96 the desk kept official ‘nonexistence’ standing. Field capacity did not drop. 3 November visibility arrived; the piece-by-piece interest networks had not yet melted into a single file. Winning was not solving a conspiracy — it was carrying denial and the working structure at once.",
    ),
  },
  kontrollu_parcalanma: {
    title: p("Kontrollü parçalanma", "A controlled break-up"),
    verdict: p("GECİKME", "DELAY"),
    body: p(
      "GİZ inceldi, hatlar birbirini gördü, yine de komuta felakete dönmedi. Susurluk şoku geldi. Masa yıkılmayı erteledi. Bu da bir sonuçtur: tek el yoktu; parçalar kendi çıkarlarıyla dağıldı.",
      "Secrecy thinned, the lines saw each other, and command still did not become disaster. The Susurluk shock arrived. The desk delayed collapse. That too is an outcome: there was no single hand; the pieces scattered on their own interests.",
    ),
  },
  giz_coktu: {
    title: p("GİZ çöktü", "Secrecy collapsed"),
    verdict: p("İFŞA", "EXPOSURE"),
    body: p(
      "Resmi inkâr, fiilî yapının ağırlığını taşıyamadı. Sızıntı basılmadı. Asimetri kamuya aktı. Masa, ‘yok’ diyemez hale geldi.",
      "Official denial could not carry the weight of the working structure. The leak was not pressed. The asymmetry flowed to the public. The desk could no longer say ‘it does not exist’.",
    ),
  },
  ersever_esigi: {
    title: p("Konuşan içerideki", "The insider who talked"),
    verdict: p("EŞİK", "THRESHOLD"),
    body: p(
      "Ersever hattı konuştu ve GİZ zaten inceydi. Kaset, sahanın üzerine oturdu. Bastırma geç kaldı. İçeriden kırılma, dışarıdaki kazadan önce geldi.",
      "The Ersever line talked and secrecy was already thin. The tape sat on the field. Suppression came late. The break from inside arrived before the crash outside.",
    ),
  },
  komuta_felaketi: {
    title: p("Komuta kayması", "Command disaster"),
    verdict: p("KAYMA", "SLIDE"),
    body: p(
      "1990 devri saha ile idariyi kopardı. Kapasite ve koruma birlikte düştü. Emir-komuta boşluğu, parçalı ağın üzerine felaket olarak bindi.",
      "The 1990 handover tore field from administration. Capacity and cover fell together. The command gap sat as disaster on a partial network.",
    ),
  },
  susurluk_patlama: {
    title: p("Görünürlük patlaması", "A visibility blast"),
    verdict: p("3 KASIM", "3 NOVEMBER"),
    body: p(
      "Kesişim bağları kilitlendi. GİZ yetmedi. Aynı araç, aynı gece, aynı kamuoyu. Parçalı çıkar ağları bir kaza ile tek karede göründü. Masa bunu taşıyamadı.",
      "The intersection ties locked. Secrecy was not enough. The same car, the same night, the same public. Partial interest-networks appeared in one frame through a crash. The desk could not carry it.",
    ),
  },
  kurumsal_tasfiye: {
    title: p("Kurumsal tasfiye", "Institutional purge"),
    verdict: p("DAĞIT", "DISPERSE"),
    body: p(
      "Masa ağı küçülttü, kalkanı tuttu. Saha boşaldı. Koruma kendi boşluğunu yedi. Tasfiye bir temizlik değil; kapasitesiz inkârdır.",
      "The desk shrank the network and held the shield. The field emptied. Cover ate its own gap. A purge is not a cleaning; it is denial without capacity.",
    ),
  },
  rakip_zafer: {
    title: p("Rakip hat aldı", "The rival line took it"),
    verdict: p("EMİLİM", "ABSORPTION"),
    body: p(
      "Emniyet–yeraltı kesişimi boşluğu doldurdu. Jandarma masası emir vermedi; yerini kaybetti. Eşgüdüm uydurulmadı — pay kaydı.",
      "The police–underworld intersection filled the gap. The gendarmerie desk did not give an order; it lost its place. No joint command was invented — the share moved.",
    ),
  },
  kismi_adalet: {
    title: p("Kısmi görünürlük", "Partial visibility"),
    verdict: p("KOMİSYON", "COMMISSION"),
    body: p(
      "Kamuoyu ve hukuk ısındı. Bazı bağlar BELGELİ kilitlendi, bazı emirler boşlukta kaldı. Adalet tam değil; dosya açık.",
      "Public and legal heat rose. Some ties locked as DOCUMENTED; some orders stayed in the gap. Justice is not complete; the file is open.",
    ),
  },
  saha_felaketi: {
    title: p("Saha kendi işini yaptı", "The field did its own work"),
    verdict: p("KOPUŞ", "BREAK"),
    body: p(
      "Sadakat çatladı, kapasite yüksek kaldı. Masa kontrol etmedi; saha freelance yürüdü. Yumuşak başlangıç sert bitti.",
      "Loyalty cracked, capacity stayed high. The desk did not control; the field walked freelance. A soft start ended hard.",
    ),
  },
};

export const CLAIM_WHY: Record<string, Pair> = {
  clm_jitem_exists: p("Fiilî varlık inkâr dilini taşır. Elinde kısmiyse kamu bunu henüz kilitlemez.", "Working existence carries denial language. If yours is partial, the public has not locked it."),
  clm_official_denial: p("Resmi ‘yok’ BELGELİ’dir. Fiilî varlıkla çelişir; biri diğerini silmez.", "Official ‘nonexistence’ is DOCUMENTED. It clashes with working existence; neither erases the other."),
  clm_ersever_tapes: p("Kasetler durur. Bastırma yok etmez. Soruşturma ve bitiş bu kayda yaslanır.", "The tapes remain. Suppression does not destroy them. Inquiry and ending lean on this record."),
  clm_abas_watch_withdrawn: p("Ölüm BELGELİ, takip iddiası TARTIŞMALI. MİT şoku JİTEM zaferi değildir.", "Death is DOCUMENTED; the watch-team claim is DISPUTED. The MIT shock is not a JITEM victory."),
  clm_kocadag_catli_precrash: p("Kaza BELGELİ kilitler; kaza öncesi ortaklık GÜÇLÜ iddiadır, emir değildir.", "The crash locks as DOCUMENTED; a pre-crash partnership is a STRONG claim, not an order."),
  clm_eymur_emniyet_warn: p("Uyarı, jandarma ile emniyetin aynı masa olduğunu kanıtlamaz.", "A warning does not prove gendarmerie and police sat at the same desk."),
  clm_tbmm_commission: p("Komisyon kamu karesini açar. Adalet tam değildir; dosya açık kalır.", "The commission opens a public frame. Justice is not complete; the file stays open."),
  clm_yesil_ersever: p("Fail GÜÇLÜ, emir TARTIŞMALI. Bu ayrım bitiş ve soruşturmayı ayırır.", "Perpetrator STRONG, order DISPUTED. That split separates ending from inquiry."),
  clm_jitem_founding_date: p("Belge boşluğu kurucu anlatıyı kilitlemez. Araştırmacı hat bunu yoklar.", "A document gap does not lock a founder story. The researcher line tests this."),
  clm_dogan_founder: p("Kendi anlatı GÜÇLÜ iddia, kuruluş belgesi BOŞLUK. İdari hat yüzü.", "A self-account is a STRONG claim; a founding paper is a GAP. Face of the administrative line."),
};

export function pickLocale<T extends Pair>(pair: T | undefined, locale: Locale, fallback = ""): string {
  if (!pair) return fallback;
  return pair[locale] || pair.tr || fallback;
}
