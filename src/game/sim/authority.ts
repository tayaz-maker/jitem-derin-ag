export const AUTHORITY = {
  command: [
    "Saha kapasitesi (tim, itirafçı, lojistik)",
    "İnkâr dili ve sızıntı bastırma",
    "Var olan bağı sıkılaştırma / gevşetme / gözetme / yalıtma",
    "Kendi ağındaki kişiyi koruma, kullanma, harcama, mesafe",
  ],
  influence: [
    "MİT ve Emniyet hatlarını bir tur soğutma (eşgüdüm değil)",
    "Ankara kalkanı, basın kesme — bedelli etki",
    "Rapor ve dosya: sis açılır, giz incelir",
    "Soruşturmayı yönlendirme veya açığa çıkarma — durdurmak zorunda değilsin",
  ],
  never: [
    "Tarihsel çıpa: Abas, Ersever ölümleri, 3 Kasım kazası durmaz",
    "Kaynakta olmayan bağ uydurma",
    "Suikast emri, cinayet envanteri, operasyon tarifi",
    "Diğer kurumların bilgi haritasını görme veya tam kontrol",
    "Tek el komplo kilitleme",
  ],
} as const;

export const LAYER_LABEL: Record<string, string> = {
  historicalFact: "TARİHSEL ÇIPA",
  sourceClaim: "KAYNAK İDDİASI",
  gameReconstruction: "OYUNSAL REKONSTRÜKSİYON",
  alternativeOutcome: "ALTERNATİF TARİH",
};

export const SOURCE_UX = [
  "TARİHSEL ÇIPA",
  "BELGELİ",
  "KAYNAK İDDİASI",
  "TARTIŞMALI",
  "ÇELİŞKİLİ",
  "OYUNSAL REKONSTRÜKSİYON",
  "ALTERNATİF TARİH",
] as const;

export function sourceUxFor(opts: {
  layer?: string;
  evidence?: string;
  contradiction?: string | null;
}) {
  const tags: string[] = [];
  if (opts.layer && LAYER_LABEL[opts.layer]) tags.push(LAYER_LABEL[opts.layer]);
  if (opts.evidence === "BELGELİ") tags.push("BELGELİ");
  if (opts.evidence === "TARTIŞMALI") tags.push("TARTIŞMALI");
  if (opts.contradiction) tags.push("ÇELİŞKİLİ");
  return tags;
}
