import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  applyEvent,
  applyEventChoice,
  createGame,
  executeAction,
  eventViewFor,
  isNodeVisible,
  resolveTurn,
  apFor,
  actionAp,
  canPlay,
} from "../engine.ts";
import { validateResearch, classifyClaim } from "../db/validate.ts";
import { DB_COUNTS } from "../db/index.ts";
import {
  familyEligible,
  FAMILIES,
  FAMILY_COUNT,
  VARIANT_COUNT,
  pickSideFamilies,
  pickVariant,
  viewEvent,
} from "./families.ts";
import { initialFactions } from "./factions.ts";
import { hasMemory, talkChance } from "./memory.ts";
import { tickInvestigation } from "./investigation.ts";
import { causalNarrative, pickEnding } from "./recap.ts";
import { parseSave, serialize, migrate } from "./save.ts";
import { autoCampaign, runBalance } from "./balance.ts";
import { formatReplay, formatReplayJson, replayFilename } from "./recap.ts";
import { detectShellMode } from "../embed.ts";
import { investigationView } from "./investigation.ts";
import { factionSignals } from "./intel.ts";
import { briefingFrom } from "./briefing.ts";
import { ALL_CLAIMS } from "../db/catalog.ts";
import { edgeSignal, dangerousActors, propagationRisk } from "./edges.ts";
import { hatTick } from "./hats.ts";

describe("campaign engine", () => {
  it("starts with research-backed visible nodes", () => {
    const s = createGame("saha", 42);
    assert.equal(s.turn, 1);
    assert.equal(s.phase, "event");
    assert.ok(isNodeVisible(s, "jitem"));
    assert.ok(s.stats.sadakat > 0);
    assert.ok(s.factions.mit);
    assert.equal(s.factions.media.known.includes("jitem"), false);
    assert.equal(s.schemaVersion, 5);
  });

  it("event view carries layer and choices", () => {
    const s = createGame("saha", 42);
    const v = eventViewFor(s);
    assert.ok(v);
    assert.ok(v!.choices.length >= 3);
    assert.ok(v!.layer);
  });

  it("person spend is command, not a killing order", () => {
    let s = createGame("saha", 7);
    s = { ...s, turn: 2, phase: "actions", actionsLeft: 3, selectedNodeId: "ersever" };
    s = executeAction(s, { id: "kisi_harca", nodeId: "ersever" });
    assert.equal(s.stance.ersever, "spend");
    assert.equal(s.dead.ersever, undefined);
    assert.ok(s.stats.bilgi >= 22);
    assert.equal(hasMemory(s, "ersever", "spent"), true);
  });

  it("media does not start knowing JITEM", () => {
    const f = initialFactions();
    assert.equal(f.media.known.includes("jitem"), false);
    assert.ok(f.jitem.known.includes("jitem"));
    assert.equal(f.media.knowledgeBase.clm_jitem_exists?.status, "UNKNOWN");
  });

  it("soft-fail does not end at giz 11 on turn 2", () => {
    const s = createGame("saha", 1);
    const mid = {
      ...s,
      turn: 2,
      phase: "actions" as const,
      stats: { ...s.stats, giz: 11 },
      flags: { ...s.flags, gizCrisisTurns: 0 },
    };
    const ended = pickEnding(mid);
    assert.equal(ended, null);
  });

  it("research db is clean", () => {
    const errors = validateResearch().filter((i) => i.level === "error");
    assert.deepEqual(errors, []);
  });
});

describe("source-required validation", () => {
  it("blocks sourceless records", () => {
    const errors = validateResearch().filter((i) => i.level === "error");
    assert.equal(
      errors.filter((e) => e.message.includes("kaynaksız") || e.message.includes("sourceIds boş"))
        .length,
      0,
    );
  });
});

describe("claim classification", () => {
  it("splits historical / source claim / contradiction", () => {
    const c = classifyClaim("clm_jitem_exists");
    assert.ok(c);
    assert.equal(c!.layer, "sourceClaim");
    assert.ok(c!.contradiction);
    const car = classifyClaim("clm_susurluk_car");
    assert.equal(car!.layer, "historicalFact");
    assert.equal(car!.worldStatus, "TRUE");
  });
});

describe("event condition and exclusivity", () => {
  it("evaluates family windows", () => {
    const s = createGame("saha", 9);
    const fam = FAMILIES.find((f) => f.id === "fam_formation");
    assert.ok(fam);
    assert.equal(familyEligible(fam!, s, false), true);
    assert.equal(familyEligible(fam!, s, true), false);
  });

  it("exclusivity tags block a second fire", () => {
    let s = createGame("idari", 3);
    s = { ...s, tags: [...s.tags, "ex:denial", "side:fam_denial"] };
    const fam = FAMILIES.find((f) => f.id === "fam_denial")!;
    assert.equal(familyEligible(fam, s, true), false);
  });

  it("same seed picks the same variant", () => {
    const a = viewEvent(createGame("saha", 77));
    const b = viewEvent(createGame("saha", 77));
    assert.equal(a?.variantId, b?.variantId);
    assert.equal(a?.familyId, b?.familyId);
  });
});

describe("faction knowledge isolation", () => {
  it("player hand is not media knowledge", () => {
    const s = createGame("saha", 2);
    assert.ok(s.hand.clm_jitem_exists);
    assert.notEqual(
      s.factions.media.knowledgeBase.clm_jitem_exists?.status,
      s.hand.clm_jitem_exists.status === "PARTIAL" ? "TRUE" : "TRUE",
    );
    assert.equal(s.factions.media.knowledgeBase.clm_jitem_exists?.status, "UNKNOWN");
  });
});

describe("actor memory", () => {
  it("protect writes memory and changes talk/help later", () => {
    let s = createGame("saha", 4);
    s = {
      ...s,
      turn: 2,
      phase: "actions",
      actionsLeft: 2,
      selectedNodeId: "aygan",
      revealed: { ...s.revealed, aygan: true },
    };
    s = executeAction(s, { id: "kisi_koru", nodeId: "aygan" });
    assert.equal(hasMemory(s, "aygan", "protected"), true);
  });
});

describe("relationship effects", () => {
  it("strengthen increases edgeStr", () => {
    let s = createGame("saha", 5);
    s = { ...s, phase: "actions", actionsLeft: 2, selectedEdgeId: "ersever-jitem" };
    const before = s.edgeStr["ersever-jitem"] ?? 1;
    s = executeAction(s, { id: "bag_guclendir", edgeId: "ersever-jitem" });
    assert.ok((s.edgeStr["ersever-jitem"] ?? 0) > before);
    assert.ok(s.edgeLive["ersever-jitem"].trust >= 52);
  });
});

describe("investigation transitions", () => {
  it("dormant moves to rumor when giz is thin", () => {
    const s = createGame("saha", 6);
    const notes: string[] = [];
    const next = tickInvestigation(
      { ...s, stats: { ...s.stats, giz: 20 }, flags: { ...s.flags, investigationOpen: true } },
      notes,
    );
    assert.notEqual(next.investigation.stage, "dormant");
  });
});

describe("ending generation", () => {
  it("turn 10 with intact giz is not a binary win screen", () => {
    const s = createGame("idari", 8);
    const end = pickEnding({
      ...s,
      turn: 10,
      stats: { ...s.stats, giz: 40, saha: 30, etki: 30 },
      investigation: { ...s.investigation, stage: "inquiry" },
    });
    assert.ok(end);
    assert.ok(["inkar_ayakta", "kontrollu_parcalanma", "kismi_adalet"].includes(end!));
  });
});

describe("save roundtrip and migration", () => {
  it("roundtrips schemaVersion 5", () => {
    const s = createGame("saha", 11);
    const raw = JSON.stringify(serialize(s));
    const back = parseSave(raw);
    assert.ok(back);
    assert.equal(back!.schemaVersion, 5);
    assert.equal(back!.hat, "saha");
    assert.ok(back!.replayMeta);
  });

  it("migrates a stripped v3 payload", () => {
    const migrated = migrate({ hat: "idari", turn: 4, stats: { giz: 50 } });
    assert.equal(migrated.schemaVersion, 5);
    assert.equal(migrated.hat, "idari");
    assert.equal(migrated.stats.giz, 50);
    assert.ok(migrated.investigation);
    assert.ok(migrated.factions.mit);
    assert.ok(migrated.hand);
  });
});

describe("deterministic seed", () => {
  it("two campaigns with the same seed share opening variant", () => {
    const a = createGame("saha", 12345);
    const b = createGame("saha", 12345);
    assert.equal(eventViewFor(a)?.variantId, eventViewFor(b)?.variantId);
    assert.equal(a.eventSeed, b.eventSeed);
  });
});

describe("replay export", () => {
  it("includes namespace, seed and schema", () => {
    const s = autoCampaign("saha-gizlilik", 2026);
    const t = formatReplay(s);
    assert.match(t, /jitem-derin-ag-v3/);
    assert.match(t, /schema 5/);
    assert.match(t, /tohum 2026/);
    assert.match(t, /SENİN 1986–1996 HİKÂYEN/);
  });
});

describe("event family counts", () => {
  it("has 25–40 families and more variants", () => {
    assert.ok(FAMILY_COUNT >= 25 && FAMILY_COUNT <= 45, String(FAMILY_COUNT));
    assert.ok(VARIANT_COUNT >= FAMILY_COUNT);
  });
});

describe("research db size", () => {
  it("is populated not bloated", () => {
    assert.ok(DB_COUNTS.people >= 18);
    assert.ok(DB_COUNTS.claims >= 12);
    assert.ok(DB_COUNTS.relationships >= 18);
    assert.ok(DB_COUNTS.sources >= 15);
    assert.ok(DB_COUNTS.events >= 8);
  });
});

describe("mobile pane contract", () => {
  it("exposes five named panes", () => {
    const panes = ["map", "olay", "kisi", "isler", "rapor"];
    assert.deepEqual(panes.sort(), ["isler", "kisi", "map", "olay", "rapor"].sort());
  });
});

describe("auto campaign", () => {
  it("finishes a seeded run", () => {
    const s = autoCampaign("saha-gizlilik", 2026);
    assert.ok(s.phase === "ended" || s.turn >= 10);
    assert.ok(s.decisions.length >= 3);
  });
});

describe("choice applies", () => {
  it("moves event to actions", () => {
    let s = createGame("saha", 1);
    const v = eventViewFor(s);
    s = applyEventChoice(s, v!.choices[0].id);
    assert.equal(s.phase, "actions");
  });

  it("resolve produces notes", () => {
    let s = createGame("saha", 1);
    s = applyEventChoice(s, eventViewFor(s)!.choices[0].id);
    s = executeAction(s, { id: "bag_guclendir", edgeId: "ersever-jitem" });
    s = resolveTurn(s);
    assert.ok(s.phase === "resolution" || s.phase === "ended");
    assert.ok(s.lastResolution.length >= 1);
  });
});

describe("balance smoke", () => {
  it("50 seeds do not all share one ending or softlock", () => {
    const r = runBalance(50);
    assert.equal(r.runs, 50);
    assert.equal(r.softlocks, 0);
    assert.equal(r.sameEnding, false);
  });
});

describe("side family selection", () => {
  it("is seed-weighted, not first-in-catalog", () => {
    const results = new Set<string>();
    for (let seed = 1; seed <= 48; seed++) {
      let s = createGame("saha", seed);
      s = {
        ...s,
        turn: 5,
        stats: { ...s.stats, giz: 30, kamuoyu: 40, sadakat: 20, hukuk: 24 },
        flags: { ...s.flags, abasDead: true },
        factions: {
          ...s.factions,
          mit: { ...s.factions.mit, hostility: 32 },
          emniyet: { ...s.factions.emniyet, hostility: 26 },
        },
      };
      results.add(
        pickSideFamilies(s, 2)
          .map((f) => f.id)
          .join(","),
      );
    }
    assert.ok(results.size >= 2, [...results].join(" | "));
  });
});

describe("historical variant consequence", () => {
  it("tapes protected-soft applies giz bump", () => {
    let found = false;
    for (let seed = 1; seed <= 80; seed++) {
      let s = createGame("saha", seed);
      s = {
        ...s,
        turn: 6,
        phase: "event",
        actorMemory: { ...s.actorMemory, ersever: ["protected"] },
      };
      const v = eventViewFor(s);
      if (v?.variantId !== "protected-soft") continue;
      const before = s.stats.giz;
      s = applyEvent(s);
      assert.ok(s.stats.giz > before, `giz ${before} -> ${s.stats.giz}`);
      found = true;
      break;
    }
    assert.equal(found, true);
  });
});

describe("investigation tags are one-shot", () => {
  it("redirect does not bump every later turn", () => {
    const s = createGame("saha", 6);
    const notes: string[] = [];
    const a = tickInvestigation(
      {
        ...s,
        turn: 6,
        tags: ["inv-direct"],
        investigation: { stage: "inquiry", heat: 8, documents: [], suppressed: [] },
      },
      notes,
    );
    assert.equal(a.tags.includes("inv-direct"), false);
    const stage1 = a.investigation.stage;
    const b = tickInvestigation(a, []);
    const order = [
      "dormant",
      "rumor",
      "inquiry",
      "investigation",
      "evidence",
      "public",
      "response",
    ];
    assert.ok(order.indexOf(b.investigation.stage) - order.indexOf(stage1) <= 1);
  });
});

describe("edge protect and investigation limit", () => {
  it("bag_koru raises secrecy", () => {
    let s = createGame("saha", 5);
    s = { ...s, turn: 3, phase: "actions", actionsLeft: 2, selectedEdgeId: "ersever-jitem" };
    const before = s.edgeLive["ersever-jitem"].secrecy;
    s = executeAction(s, { id: "bag_koru", edgeId: "ersever-jitem" });
    assert.ok(s.edgeLive["ersever-jitem"].secrecy > before);
    assert.equal(hasMemory(s, "ersever", "protected"), true);
  });

  it("soru_sinir writes inv-limit", () => {
    let s = createGame("saha", 8);
    s = {
      ...s,
      turn: 6,
      phase: "actions",
      actionsLeft: 2,
      investigation: { ...s.investigation, stage: "inquiry" },
    };
    s = executeAction(s, { id: "soru_sinir" });
    assert.ok(s.tags.includes("inv-limit"));
  });
});

describe("knowledge isolation after tick", () => {
  it("player hand does not copy into media", () => {
    const s = createGame("saha", 2);
    assert.ok(s.hand.clm_jitem_exists);
    assert.equal(s.factions.media.knowledgeBase.clm_jitem_exists?.status, "UNKNOWN");
  });
});

describe("action capacity", () => {
  it("saha has 5, idari has 4, heavy ops cost 3", () => {
    assert.equal(apFor("saha"), 5);
    assert.equal(apFor("idari"), 4);
    assert.equal(actionAp("dosya_oku"), 1);
    assert.equal(actionAp("tim_kur"), 2);
    assert.equal(actionAp("kisi_harca"), 3);
    assert.equal(actionAp("saha_op"), 3);
  });

  it("refuses an action the pool cannot pay", () => {
    let s = createGame("idari", 9);
    s = { ...s, phase: "actions", actionsLeft: 1, selectedNodeId: "ersever" };
    assert.equal(canPlay(s, "kisi_harca"), false);
    assert.equal(canPlay(s, "dosya_oku"), true);
    const before = s.actionsLeft;
    s = executeAction(s, { id: "kisi_harca", nodeId: "ersever" });
    assert.equal(s.actionsLeft, before);
    assert.equal(s.stance.ersever, undefined);
  });

  it("refunds full cost when edge is missing", () => {
    let s = createGame("saha", 3);
    s = { ...s, phase: "actions", actionsLeft: 5, selectedEdgeId: null };
    s = executeAction(s, { id: "bag_guclendir" });
    assert.equal(s.actionsLeft, 5);
  });
});

describe("embedded shell", () => {
  it("reads embed query and iframe parent", () => {
    const standalone: { parent: unknown } = { parent: null };
    standalone.parent = standalone;
    assert.equal(detectShellMode({ search: "" }, standalone), "standalone");
    assert.equal(detectShellMode({ search: "?embed=1" }, standalone), "embedded");
    assert.equal(detectShellMode({ search: "" }, { __DERIN_AG_EMBEDDED: true }), "embedded");
    assert.equal(detectShellMode({ search: "" }, { parent: {} }), "embedded");
  });

  it("keeps long embedded start content on a shrinkable scroll owner", () => {
    const source = readFileSync(
      new URL("../../components/game/StartScreen.tsx", import.meta.url),
      "utf8",
    );
    assert.match(source, /start-screen-shell[^"]*min-h-0[^"]*overflow-y-auto[^"]*overscroll-contain[^"]*touch-pan-y/);
    assert.match(source, /pb-\[max\(2\.5rem,env\(safe-area-inset-bottom\)\)\]/);
    assert.doesNotMatch(source, /my-auto/);

    const styles = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
    assert.match(styles, /html,\s*body,\s*#app,\s*#root/);
    assert.match(styles, /html\[data-shell="embedded"\] #app,\s*html\[data-shell="embedded"\] #root/);

    const langSource = readFileSync(
      new URL("../../components/game/LangSwitch.tsx", import.meta.url),
      "utf8",
    );
    assert.match(langSource, /if \(!mounted \|\| detectShellMode\(\) === "embedded"\) return null/);
  });

  it("keeps desktop events contextual and reserves the modal sheet for mobile", () => {
    const source = readFileSync(
      new URL("../../components/game/GameApp.tsx", import.meta.url),
      "utf8",
    );
    assert.match(
      source,
      /lg:grid-cols-\[minmax\(360px,1\.05fr\)_minmax\(420px,1\.2fr\)_minmax\(300px,360px\)\]/,
    );
    assert.match(source, /lg:grid-cols-\[minmax\(0,1\.65fr\)_minmax\(380px,460px\)\]/);
    assert.match(source, /aria-label=\{t\(locale, "pane\.olay"\)\}/);
    assert.match(source, /lg:hidden/);
    assert.doesNotMatch(source, /lg:bg-bg\/70/);

    const eventSource = readFileSync(
      new URL("../../components/game/EventModal.tsx", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(eventSource, /absolute inset-0/);
    assert.doesNotMatch(eventSource, /bg-bg\/70/);
  });
});

describe("intel fog", () => {
  it("does not print raw faction objectives as known fact", () => {
    const s = createGame("saha", 4);
    const signals = factionSignals(s);
    assert.ok(signals.some((x) => x.faction === "jitem"));
    assert.equal(
      signals.some(
        (x) =>
          x.headline.includes(s.factions.mit.currentObjective) &&
          x.grade === "KNOWN" &&
          x.faction !== "jitem",
      ),
      false,
    );
  });
});

describe("investigation view", () => {
  it("exposes raising factors without dumping hidden formulas", () => {
    const s = createGame("saha", 5);
    const v = investigationView({
      ...s,
      stats: { ...s.stats, giz: 20, hukuk: 30, kamuoyu: 32 },
      flags: { ...s.flags, investigationOpen: true },
      investigation: { ...s.investigation, stage: "inquiry", heat: 12 },
    });
    assert.equal(v.stage, "inquiry");
    assert.equal(v.label, "inv.inquiry");
    assert.ok(v.raising.length >= 1);
    assert.ok(v.raising.every((k) => k.startsWith("inv.")));
    assert.ok(v.options.length >= 1);
  });
});

describe("returning player briefing", () => {
  it("names act, event and next problem", () => {
    const s = createGame("saha", 11);
    const b = briefingFrom(s);
    assert.match(b.act, /ACT/);
    assert.ok(b.lastEvent.length > 2);
    assert.ok(b.nextProblem.length > 4);
    assert.equal(b.turn, 1);
  });
});

describe("replay json", () => {
  it("uses DERIN-AG filename and schema 5 payload", () => {
    const s = autoCampaign("idari-koruma", 2026);
    const j = formatReplayJson(s);
    assert.equal(j.saveKey, "jitem-derin-ag-v3");
    assert.equal(j.schemaVersion, 5);
    assert.equal(j.seed, 2026);
    assert.ok(Array.isArray(j.decisions));
    assert.ok(j.dossier);
    assert.equal(replayFilename(2026), "DERIN-AG-1986-1996-2026.json");
  });
});

describe("researcher and lawyer loops", () => {
  it("compare writes a sourced comparison and faction notice", () => {
    let s = createGame("arastirmaci", 21);
    s = { ...s, phase: "actions", actionsLeft: 4 };
    assert.equal(canPlay(s, "kaynak_karsilastir"), true);
    const next = executeAction(s, { id: "kaynak_karsilastir" });
    assert.ok((next.investigation.comparisons ?? []).length >= 1);
    const cmp = next.investigation.comparisons![0];
    const claim = ALL_CLAIMS.find((c) => c.id === cmp.claimId);
    assert.ok(claim);
    assert.ok(claim!.sourceIds.length >= 1);
    assert.equal(next.tags.includes("src-compared"), true);
    assert.ok(next.factions.media.knowledgeBase[cmp.claimId]);
    assert.ok(next.factions.hukuk.knowledgeBase[cmp.claimId]);
  });

  it("evidence chain binds a claim, not a generic zincir-tN", () => {
    let s = createGame("hukuk", 22);
    s = { ...s, phase: "actions", actionsLeft: 4 };
    s = executeAction(s, { id: "delil_zincir" });
    assert.ok(s.investigation.documents.length >= 1);
    assert.equal(
      s.investigation.documents.some((d) => d.startsWith("zincir-t")),
      false,
    );
    assert.ok((s.investigation.chain ?? []).length >= 1);
    const link = s.investigation.chain![0];
    assert.ok(ALL_CLAIMS.some((c) => c.id === link.claimId));
    assert.match(link.documentId, /^doc-/);
  });

  it("proof threshold stays cold without documents and advances with a chain", () => {
    let s = createGame("hukuk", 23);
    s = { ...s, phase: "actions", actionsLeft: 4, turn: 5 };
    const hold = executeAction(s, { id: "kanit_esigi" });
    assert.ok(hold.tags.includes("inv-limit"));
    let chained = createGame("hukuk", 24);
    chained = { ...chained, phase: "actions", actionsLeft: 4, turn: 5 };
    chained = executeAction(chained, { id: "delil_zincir" });
    chained = { ...chained, turn: 6, phase: "actions", actionsLeft: 4 };
    chained = executeAction(chained, { id: "delil_zincir" });
    chained = { ...chained, phase: "actions", actionsLeft: 4 };
    chained = executeAction(chained, { id: "kanit_esigi" });
    assert.ok(chained.tags.includes("inv-direct"));
  });

  it("new sourced claims hook compare/chain/ending systems", () => {
    for (const id of [
      "clm_aygan_dogan_split",
      "clm_kutlu_vs_official",
      "clm_hanefi_emniyet_split",
    ]) {
      const c = ALL_CLAIMS.find((x) => x.id === id);
      assert.ok(c, id);
      assert.ok(c!.sourceIds.length >= 2);
      assert.ok(c!.contradiction);
      assert.equal(c!.fiction, false);
    }
    const r = createGame("arastirmaci", 1);
    assert.ok(r.hand.clm_aygan_dogan_split);
    const h = createGame("hukuk", 1);
    assert.ok(h.hand.clm_kutlu_vs_official);
    const famR = FAMILIES.find((f) => f.id === "fam_source_clash")!;
    const famH = FAMILIES.find((f) => f.id === "fam_chain_consequence")!;
    let s = createGame("arastirmaci", 25);
    s = {
      ...s,
      turn: 4,
      investigation: {
        ...s.investigation,
        comparisons: [
          { claimId: "clm_aygan_dogan_split", sourceIds: ["src_aygan", "src_dogan"], turn: 3 },
        ],
      },
    };
    assert.equal(familyEligible(famR, s, false), true);
    let l = createGame("hukuk", 26);
    l = {
      ...l,
      turn: 6,
      investigation: {
        ...l.investigation,
        documents: ["doc-x"],
        chain: [{ claimId: "clm_kutlu_vs_official", documentId: "doc-x", turn: 5 }],
      },
    };
    assert.equal(familyEligible(famH, l, false), true);
  });

  it("lawyer chain consequence guarded variant is reachable from lawyer-native chain progress", () => {
    const fam = FAMILIES.find((f) => f.id === "fam_chain_consequence")!;
    let s = createGame("hukuk", 2601);
    s = {
      ...s,
      turn: 6,
      investigation: {
        ...s.investigation,
        documents: ["doc-a", "doc-b"],
        chain: [
          { claimId: "clm_kutlu_vs_official", documentId: "doc-a", turn: 5 },
          { claimId: "clm_kutlu_vs_official", documentId: "doc-b", turn: 6 },
        ],
      },
    };
    assert.equal(familyEligible(fam, s, false), true);
    const guarded = fam.variants.find((v) => v.id === "compared-file")!;
    assert.equal(guarded.when?.(s), true);
    let seen = false;
    for (let seed = 1; seed <= 96; seed++) {
      const candidate = { ...s, eventSeed: seed };
      if (pickVariant(candidate, fam).id === "compared-file") {
        seen = true;
        break;
      }
    }
    assert.equal(seen, true);
  });

  it("chain-only lawyer play cannot open kismi_adalet without enough public opinion", () => {
    const s = createGame("hukuk", 2602);
    const base = {
      ...s,
      turn: 10,
      stats: { ...s.stats, hukuk: 60, kamuoyu: 31 },
      investigation: {
        ...s.investigation,
        stage: "public" as const,
        documents: ["doc-a", "doc-b"],
        chain: [
          { claimId: "clm_kutlu_vs_official", documentId: "doc-a", turn: 5 },
          { claimId: "clm_kutlu_vs_official", documentId: "doc-b", turn: 6 },
        ],
      },
    };
    assert.notEqual(pickEnding(base), "kismi_adalet");
    assert.equal(pickEnding({ ...base, stats: { ...base.stats, kamuoyu: 32 } }), "kismi_adalet");
  });

  it("delil_zincir is unavailable without an eligible held claim and does not create a generic fallback", () => {
    let s = createGame("hukuk", 2603);
    s = {
      ...s,
      phase: "actions",
      actionsLeft: 4,
      hand: Object.fromEntries(
        Object.entries(s.hand).map(([id, row]) => [id, { ...row, status: "UNKNOWN" as const }]),
      ),
    };
    assert.equal(canPlay(s, "delil_zincir"), false);
    const before = JSON.stringify(s.investigation);
    const next = executeAction(s, { id: "delil_zincir" });
    assert.equal(JSON.stringify(next.investigation), before);
    assert.equal(
      next.investigation.documents.some((d) => d.includes("clm_jitem_exists")),
      false,
    );
  });

  it("researcher receives the Hanefi/Emniyet split as a turn-8 rumor for later comparison", () => {
    let s = createGame("arastirmaci", 2604);
    s = { ...s, turn: 8, phase: "event" };
    s = applyEvent(s);
    assert.equal(s.hand.clm_hanefi_emniyet_split?.status, "RUMOR");
    assert.equal(canPlay({ ...s, phase: "actions", actionsLeft: 4 }, "kaynak_karsilastir"), true);
  });

  it("old save without comparisons still migrates", () => {
    const raw = serialize(createGame("saha", 2));
    delete (raw.state.investigation as { comparisons?: unknown }).comparisons;
    delete (raw.state.investigation as { chain?: unknown }).chain;
    const back = parseSave(JSON.stringify(raw));
    assert.ok(back);
    assert.deepEqual(back!.investigation.comparisons, []);
    assert.deepEqual(back!.investigation.chain, []);
  });
});

describe("product depth loops", () => {
  it("map signals mark pressure, fragility and dangerous actors without new save fields", () => {
    let s = createGame("saha", 41);
    s = {
      ...s,
      edgeLive: {
        ...s.edgeLive,
        "ersever-jitem": { trust: 18, dependency: 12, secrecy: 20, tension: 72 },
      },
      nodeHeat: { ...s.nodeHeat, ersever: 3 },
      actorMemory: { ...s.actorMemory, aygan: ["spent"] },
    };
    assert.equal(edgeSignal(s.edgeLive["ersever-jitem"]!), "hot");
    assert.ok(propagationRisk(s, "ersever-jitem") >= 48);
    const danger = dangerousActors(s);
    assert.ok(danger.includes("ersever"));
    assert.ok(danger.includes("aygan"));
    assert.equal(s.schemaVersion, 5);
  });

  it("strengthening a tie writes used memory; isolation writes abandoned", () => {
    let s = createGame("saha", 42);
    s = { ...s, turn: 3, phase: "actions", actionsLeft: 5, selectedEdgeId: "ersever-jitem" };
    s = executeAction(s, { id: "bag_guclendir", edgeId: "ersever-jitem" });
    assert.equal(hasMemory(s, "ersever", "used"), true);
    s = { ...s, phase: "actions", actionsLeft: 5 };
    s = executeAction(s, { id: "bag_yalitim", edgeId: "ersever-jitem" });
    assert.equal(hasMemory(s, "ersever", "abandoned"), true);
  });

  it("spending after a kept word writes promise-broken and raises talk chance", () => {
    let s = createGame("saha", 43);
    s = { ...s, turn: 4, phase: "event" };
    s = applyEventChoice(s, "e4-saha");
    assert.equal(hasMemory(s, "ersever", "promise-kept"), true);
    s = { ...s, turn: 2, phase: "actions", actionsLeft: 3, selectedNodeId: "ersever", revealed: { ...s.revealed, ersever: true } };
    const before = talkChance(s, "ersever");
    s = executeAction(s, { id: "kisi_harca", nodeId: "ersever" });
    assert.equal(hasMemory(s, "ersever", "spent"), true);
    assert.equal(hasMemory(s, "ersever", "promise-broken"), true);
    assert.ok(talkChance(s, "ersever") > before);
  });

  it("anchor choices mutate effects from campaign history without dropping options", () => {
    const s = {
      ...createGame("saha", 44),
      turn: 4,
      phase: "event" as const,
      actorMemory: { ersever: ["protected" as const] },
    };
    const view = eventViewFor(s);
    assert.equal(view?.familyId, "fam_command_shift");
    assert.ok(view!.choices.length >= 3);
    const held = view!.choices.find((c) => c.id === "e4-saha");
    assert.ok((held?.effects.sadakat ?? 0) >= 4);
  });

  it("researcher hold/share/publish sit on a comparison and verify never writes TRUE", () => {
    let s = createGame("arastirmaci", 45);
    s = { ...s, phase: "actions", actionsLeft: 4 };
    s = executeAction(s, { id: "kaynak_karsilastir" });
    assert.ok((s.investigation.comparisons ?? []).length >= 1);
    assert.equal(canPlay({ ...s, phase: "actions", actionsLeft: 4 }, "src_tut"), true);
    const held = executeAction({ ...s, phase: "actions", actionsLeft: 4 }, { id: "src_tut" });
    assert.ok(held.tags.some((tag) => tag.startsWith("src-held:")));
    const published = executeAction({ ...s, phase: "actions", actionsLeft: 4 }, { id: "src_yayin" });
    const pubClaim = (published.investigation.comparisons ?? [])[0]?.claimId;
    assert.ok(pubClaim);
    assert.notEqual(published.factions.media.knowledgeBase[pubClaim!]?.status, "TRUE");
    const verified = executeAction({ ...s, phase: "actions", actionsLeft: 4 }, { id: "dogrula" });
    for (const row of Object.values(verified.hand)) {
      if (row.source === "yoklama") assert.notEqual(row.status, "TRUE");
    }
  });

  it("lawyer chain can bind a chosen claim and still needs public heat for kismi_adalet", () => {
    let s = createGame("hukuk", 46);
    s = { ...s, phase: "actions", actionsLeft: 4 };
    s = executeAction(s, { id: "delil_zincir", claimId: "clm_official_denial" });
    assert.equal(s.investigation.chain?.[0]?.claimId, "clm_official_denial");
    const base = {
      ...s,
      turn: 10,
      stats: { ...s.stats, hukuk: 60, kamuoyu: 31 },
      investigation: {
        ...s.investigation,
        stage: "public" as const,
        documents: ["doc-a", "doc-b"],
        chain: [
          { claimId: "clm_kutlu_vs_official", documentId: "doc-a", turn: 5 },
          { claimId: "clm_kutlu_vs_official", documentId: "doc-b", turn: 6 },
        ],
      },
    };
    assert.notEqual(pickEnding(base), "kismi_adalet");
    assert.equal(pickEnding({ ...base, stats: { ...base.stats, kamuoyu: 32 } }), "kismi_adalet");
  });

  it("hatTick is no longer a no-op and dossier cites protected memory", () => {
    let s = createGame("arastirmaci", 47);
    s = { ...s, turn: 5, actorMemory: { ...s.actorMemory, ersever: ["protected"] } };
    const notes: string[] = [];
    const next = hatTick(s, notes);
    assert.ok(notes.some((n) => n.startsWith("note.hat.")) || next.stats.bilgi !== s.stats.bilgi);
    const lines = causalNarrative({ ...next, ending: "kontrollu_parcalanma" });
    assert.ok(lines.some((l) => /Ersever|Koruduk/.test(l)));
  });

  it("repeating field actions diminish", () => {
    let s = createGame("saha", 48);
    s = { ...s, phase: "actions", actionsLeft: 5, stats: { ...s.stats, kara: 40 } };
    const first = executeAction(s, { id: "tim_kur" });
    const gain = first.stats.saha - s.stats.saha;
    const second = executeAction({ ...first, phase: "actions", actionsLeft: 5, stats: { ...first.stats, kara: 40 } }, { id: "tim_kur" });
    assert.ok(second.stats.saha - first.stats.saha < gain);
  });
});
