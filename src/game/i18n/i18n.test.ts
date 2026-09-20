import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actionsEn, en } from "./en.ts";
import { actionsTr, tr } from "./tr.ts";
import { flattenKeys } from "./format.ts";
import { actionCopy, choiceCopy, eventCopy, familyVariantCopy, t, logLine } from "./copy.ts";
import { detectLocale } from "./locale.ts";
import { createGame, executeAction, canPlay, apFor, resolveTurn } from "../engine.ts";
import { parseSave, serialize } from "../sim/save.ts";
import { SAVE_KEY, SCHEMA_VERSION } from "../types.ts";
import { ALL_CLAIMS } from "../db/catalog.ts";
import { CHOICES_I18N, EVENTS_I18N, ENDINGS_I18N } from "./content.ts";
import { EVENT_CHOICES, EVENTS, ENDINGS, ACTIONS } from "../data.ts";
import { affiliationLine, copyForAction, playerFog } from "./interactive.ts";
import { hatBlocks } from "../sim/hats.ts";
import { causalNarrative } from "../sim/recap.ts";
import { nodeWhy } from "../sim/inspect.ts";

describe("i18n parity", () => {
  it("tr and en share the same keys", () => {
    const a = flattenKeys(tr).sort();
    const b = flattenKeys(en).sort();
    assert.deepEqual(b, a);
  });

  it("every action has interactive copy in both languages", () => {
    for (const a of ACTIONS) {
      assert.ok(actionsTr[a.id]?.label, a.id);
      assert.ok(actionsEn[a.id]?.label, a.id);
      assert.ok(actionsTr[a.id].shortExplanation);
      assert.ok(actionsEn[a.id].expectedEffect);
      assert.notEqual(actionsEn[a.id].label, actionsTr[a.id].label, a.id);
    }
  });

  it("events and choices have EN that is not a word-for-word dump", () => {
    for (const e of EVENTS) {
      const row = EVENTS_I18N[e.id];
      assert.ok(row, e.id);
      assert.ok(row.title.en.length > 2);
      assert.notEqual(row.body.en, row.body.tr);
    }
    for (const list of Object.values(EVENT_CHOICES)) {
      for (const c of list) {
        assert.ok(CHOICES_I18N[c.id], c.id);
      }
    }
    for (const id of Object.keys(ENDINGS)) {
      assert.ok(ENDINGS_I18N[id]);
    }
  });
});

describe("locale does not live in save", () => {
  it("switching language does not change seed, events or checksum fields", () => {
    const a = createGame("saha", 77);
    const payload = JSON.stringify(serialize(a));
    const back = parseSave(payload);
    assert.equal(back!.worldSeed, 77);
    assert.equal(back!.schemaVersion, SCHEMA_VERSION);
    assert.equal(SAVE_KEY, "jitem-derin-ag-v3");
    assert.equal(a.eventSeed, back!.eventSeed);
    assert.equal(detectLocale(), "tr");
    assert.equal(t("en", "meta.title"), "Deep Network");
    assert.equal(t("tr", "meta.title"), "Derin Ağ");
    const again = JSON.stringify(serialize(a));
    assert.equal(payload, again);
  });

  it("replay carries semantic ids not translated sentences as keys", () => {
    let s = createGame("saha", 3);
    s = { ...s, phase: "actions", actionsLeft: 5 };
    s = executeAction(s, { id: "dosya_oku" });
    assert.equal(s.decisions.at(-1)?.id, "dosya_oku");
    assert.equal(s.decisions.at(-1)?.kind, "action");
  });
});

describe("knowledge-aware copy does not leak", () => {
  it("does not name a rival desk when the player only has rumor", () => {
    const s = createGame("saha", 4);
    const line = affiliationLine(s, "eymur", "tr");
    assert.equal(line.includes("MİT’e bilgi veriyor"), false);
    assert.ok(line.length > 8);
  });

  it("fog of unknown claim stays unknown", () => {
    const s = createGame("saha", 4);
    assert.equal(playerFog(s, "clm_abas_jitem"), "UNKNOWN");
  });
});

describe("researcher and hukuk hats", () => {
  it("researcher cannot run field ops and can compare sources", () => {
    const s = createGame("arastirmaci", 9);
    assert.equal(apFor("arastirmaci"), 4);
    assert.equal(hatBlocks("arastirmaci", "tim_kur"), true);
    s.phase = "actions";
    s.actionsLeft = 4;
    assert.equal(canPlay(s, "tim_kur"), false);
    assert.equal(canPlay(s, "kaynak_karsilastir"), true);
    const next = executeAction(s, { id: "kaynak_karsilastir" });
    assert.ok(next.stats.bilgi >= s.stats.bilgi);
  });

  it("hukuk can run evidence chain and not field ops", () => {
    let s = createGame("hukuk", 11);
    s = { ...s, phase: "actions", actionsLeft: 4 };
    assert.equal(canPlay(s, "saha_op"), false);
    assert.equal(canPlay(s, "delil_zincir"), true);
    s = executeAction(s, { id: "delil_zincir" });
    assert.ok(s.investigation.documents.length >= 1);
  });

  it("migrates unknown hat to saha and keeps new hats", () => {
    const raw = serialize(createGame("hukuk", 2));
    const back = parseSave(JSON.stringify(raw));
    assert.equal(back!.hat, "hukuk");
    const stripped = parseSave(JSON.stringify({ version: 5, schemaVersion: 5, state: { hat: "wizard", turn: 1, stats: { giz: 50 } } }));
    assert.equal(stripped!.hat, "saha");
    assert.equal(stripped!.schemaVersion, 5);
  });
});

describe("new claim chains bind to systems", () => {
  it("adds sourced claims hooked to event/faction/investigation/ending", () => {
    const ids = ["clm_ersever_tapes", "clm_abas_watch_withdrawn", "clm_kocadag_catli_precrash", "clm_eymur_emniyet_warn", "clm_tbmm_commission"];
    for (const id of ids) {
      const c = ALL_CLAIMS.find((x) => x.id === id);
      assert.ok(c, id);
      assert.ok(c!.sourceIds.length);
      assert.ok(c!.contradiction);
    }
    const s = createGame("arastirmaci", 1);
    assert.ok(s.hand.clm_jitem_founding_date);
  });
});

describe("interactive copy shape", () => {
  it("protect copy answers what/why/if", () => {
    const s = createGame("saha", 2);
    const copy = copyForAction("kisi_koru", "tr", s);
    assert.ok(copy.shortExplanation && copy.whyItMatters && copy.expectedEffect);
    const enCopy = copyForAction("kisi_koru", "en", s);
    assert.match(enCopy.shortExplanation ?? "", /loyalty|talk/i);
  });

  it("event copy helper returns both languages", () => {
    assert.equal(eventCopy("tr", "e1")?.title, "Fiilî oluşum");
    assert.ok(eventCopy("en", "e1")?.title);
    assert.ok(choiceCopy("en", "e1-saha")?.label);
  });

  it("map inspect re-renders in EN without rewriting save", () => {
    const s = createGame("saha", 2);
    const trLine = nodeWhy(s, "jitem", "tr");
    const enLine = nodeWhy(s, "jitem", "en");
    assert.match(trLine, /bağ|ısı|ELİNDE|dosya/i);
    assert.match(enLine, /ties|heat|IN HAND|file/i);
    assert.notEqual(trLine, enLine);
  });
});

describe("ending causal is decision-based", () => {
  it("returns at least one causal line", () => {
    const s = createGame("idari", 5);
    const lines = causalNarrative({ ...s, ending: "kontrollu_parcalanma" });
    assert.ok(lines.length >= 1);
    const enLines = causalNarrative({ ...s, ending: "kontrollu_parcalanma" }, "en");
    assert.notEqual(enLines[0], lines[0]);
  });
});

describe("resolution notes are semantic keys", () => {
  it("never exposes a Turkish family fallback in English", () => {
    const raw = "OYUNSAL REKONSTRÜKSİYON: İdari masa doğuşu dosyadan görür.";
    const rendered = familyVariantCopy("en", raw, "addendum");
    assert.match(rendered, /GAMEPLAY RECONSTRUCTION/);
    assert.equal(rendered.includes("OYUNSAL"), false);
    const note = logLine("en", "family.variant|family=fam_formation|variant=idari|fallback=Türkçe%20not");
    assert.equal(note.includes("Türkçe"), false);
  });

  it("stores keys not translated sentences and EN render differs", () => {
    let s = createGame("saha", 1);
    s = { ...s, phase: "actions", actionsLeft: 5 };
    s = executeAction(s, { id: "bag_guclendir", edgeId: "ersever-jitem" });
    s = executeAction(s, { id: "dosya_oku" });
    s = resolveTurn(s);
    assert.ok(s.lastResolution.length >= 1);
    assert.ok(s.lastResolution.some((n) => n.startsWith("note.")));
    const key = s.lastResolution.find((n) => n.startsWith("note."))!;
    const trLine = logLine("tr", key);
    const enLine = logLine("en", key);
    assert.notEqual(trLine, enLine);
    assert.equal(enLine.startsWith("note."), false);
  });
});
