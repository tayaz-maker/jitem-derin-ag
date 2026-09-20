import { ALL_CLAIMS, SOURCE_BY_ID } from "@/game/db";
import { claimWhy, t, useLocale } from "@/game/i18n";
import { evidenceTone } from "@/game/evidence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ClaimDrawer({
  claimId,
  onClose,
}: {
  claimId: string;
  onClose: () => void;
}) {
  const locale = useLocale((s) => s.locale);
  const claim = ALL_CLAIMS.find((c) => c.id === claimId);
  if (!claim) return null;
  const src = claim.sourceIds[0] ? SOURCE_BY_ID[claim.sourceIds[0]] : undefined;

  return (
    <aside
      className="rounded-md border border-olive/40 bg-surface p-3"
      role="dialog"
      aria-label={t(locale, "claim.title")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="scan font-mono text-[10px] text-olive">{t(locale, "claim.title")}</p>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px]" onClick={onClose}>
          {t(locale, "claim.close")}
        </Button>
      </div>
      <h3 className="mt-1 text-sm font-medium text-paper">{claim.title}</h3>
      <div className="mt-2 space-y-2 text-xs leading-relaxed text-muted">
        <div>
          <p className="text-paper">{t(locale, "claim.sourceSays")}</p>
          <p>{claim.statement}</p>
          {src ? (
            <p className="mt-1 text-[11px] text-subtle">
              {src.author} · {src.title}
              {src.location ? ` · ${src.location}` : ""}
              {src.year ? ` · ${src.year}` : ""}
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-paper">{t(locale, "claim.contra")}</p>
          <p>{claim.contradiction || t(locale, "claim.none")}</p>
        </div>
        <div>
          <p className="text-paper">{t(locale, "claim.level")}</p>
          <Badge tone={evidenceTone(claim.evidence)}>{claim.evidence}</Badge>
        </div>
        <div>
          <p className="text-paper">{t(locale, "claim.whyGame")}</p>
          <p>{claimWhy(locale, claim.id) || claim.developerNotes || claim.statement}</p>
        </div>
      </div>
    </aside>
  );
}
