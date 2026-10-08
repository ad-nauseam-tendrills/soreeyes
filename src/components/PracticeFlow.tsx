"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveAttempt, setPrinted } from "@/app/actions";
import { PrintScaleNote, SheetFigure } from "@/components/SheetFigure";
import { ReferenceViewer, type ReferenceOption } from "@/components/ReferenceViewer";
import { ValueKey } from "@/components/ValueKey";
import { ERROR_GROUPS, ERROR_LABELS, RATING_LABELS } from "@/lib/labels";
import { printHref, type SheetView } from "@/lib/print-href";
import type { ErrorCategory, ExerciseStatus, ExerciseType, Rating, ScaleDirection } from "@/lib/types";

export interface ResolvedSheetViews {
  display: SheetView[];
  /** Printed sources + blank targets. */
  required: SheetView[];
  /** Keys the book needs during setup (printed with the job, never shown on screen early). */
  setupKeys: SheetView[];
  /** Hidden until Check My Work. */
  checkKeys: SheetView[];
  reused: { sheet: SheetView; from: string }[];
}

export interface PracticeProps {
  exerciseId: string;
  title: string;
  numberLabel: string;
  sectionTitle: string;
  courseTitle: string;
  typeLabel: string;
  type: ExerciseType;
  citation: string;
  instructionCitation: string;
  summary: string;
  instructions: string[];
  checkingInstructions: string[];
  rotationNote?: string;
  minutes: string;
  recommended: string;
  mastery: string;
  notes: string[];
  scaleLabel?: string;
  materials: { id: string; name: string; optional: boolean; owned: boolean }[];
  sheets: { default?: ResolvedSheetViews; constrict?: ResolvedSheetViews; dilate?: ResolvedSheetViews };
  printed: Record<string, boolean>;
  status: ExerciseStatus;
  statusLabel: string;
  locked: boolean;
  lockReason?: string;
  attemptCount: number;
  nextReview?: string;
  recent: { id: string; label: string; rating: string; errors: string[]; notes: string; duration: string }[];
  showTimer: boolean;
  parent?: { id: string; label: string };
  supplementals: { id: string; label: string; status: string; locked: boolean }[];
  /** Reference-photo drills (Portrait Value): choices and the value-key levels. */
  reference?: { options: ReferenceOption[]; keyLevels: 2 | 3 };
}

type Stage = "brief" | "attempt" | "check" | "saved";

interface Draft {
  stage: "attempt" | "check";
  startedAt: string;
  accumulatedMs: number;
  runningSince: number | null;
  finishedAt?: string;
  revealed: boolean;
  direction?: ScaleDirection;
  referenceId?: string;
}

const draftKey = (id: string) => `sore-eyes:draft:${id}`;

function loadDraft(id: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(id));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function saveDraft(id: string, d: Draft | null) {
  try {
    if (d) localStorage.setItem(draftKey(id), JSON.stringify(d));
    else localStorage.removeItem(draftKey(id));
  } catch {
    /* private mode etc. — the attempt still works, it just won't survive a reload */
  }
}

function fmtClock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const SAVED_MESSAGES: Record<Rating, string> = {
  accurate: "Recorded. Accurate — keep repeating it until it feels ordinary.",
  mostly: "Recorded. Close. Note what drifted and lean against it next time.",
  rework:
    "Recorded. You found something specific to work on — that is exactly the feedback this exercise exists to give. It's waiting in your Needs Attention list.",
};

export function PracticeFlow(props: PracticeProps) {
  const router = useRouter();
  const isFinal = Boolean(props.sheets.constrict);
  const [direction, setDirection] = useState<ScaleDirection>("constrict");
  const [referenceId, setReferenceId] = useState<string | undefined>(props.reference?.options[0]?.id);
  const reference = props.reference?.options.find((o) => o.id === referenceId) ?? props.reference?.options[0];
  const sheets = (isFinal ? props.sheets[direction] : props.sheets.default)!;

  const [stage, setStage] = useState<Stage>("brief");
  const [startedAt, setStartedAt] = useState<string>("");
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<string>("");
  const [revealed, setRevealed] = useState(false);
  const [timerVisible, setTimerVisible] = useState(props.showTimer);
  const [now, setNow] = useState(() => Date.now());
  const [saved, setSaved] = useState<{ rating: Rating; attemptNumber: number; statusLabel: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Restore an in-progress attempt after a reload (per device).
  useEffect(() => {
    const d = loadDraft(props.exerciseId);
    if (!d || props.locked) return;
    setStage(d.stage);
    setStartedAt(d.startedAt);
    setAccumulatedMs(d.accumulatedMs);
    setRunningSince(d.runningSince);
    setFinishedAt(d.finishedAt ?? "");
    setRevealed(d.revealed);
    if (d.direction) setDirection(d.direction);
    if (d.referenceId) setReferenceId(d.referenceId);
  }, [props.exerciseId, props.locked]);

  useEffect(() => {
    if (stage === "attempt" || stage === "check") {
      saveDraft(props.exerciseId, { stage, startedAt, accumulatedMs, runningSince, finishedAt, revealed, direction, referenceId });
    }
  }, [props.exerciseId, stage, startedAt, accumulatedMs, runningSince, finishedAt, revealed, direction, referenceId]);

  useEffect(() => {
    if (runningSince === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [runningSince]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stage]);

  const elapsedMs = accumulatedMs + (runningSince !== null ? now - runningSince : 0);

  const start = () => {
    const t = Date.now();
    setStartedAt(new Date(t).toISOString());
    setAccumulatedMs(0);
    setRunningSince(t);
    setNow(t);
    setRevealed(false);
    setStage("attempt");
    window.scrollTo({ top: 0 });
  };
  const pause = () => {
    if (runningSince === null) return;
    setAccumulatedMs((a) => a + Date.now() - runningSince);
    setRunningSince(null);
  };
  const resume = () => {
    const t = Date.now();
    setRunningSince(t);
    setNow(t);
  };
  const finish = () => {
    pause();
    setFinishedAt(new Date().toISOString());
    setStage("check");
    window.scrollTo({ top: 0 });
  };
  const abandon = () => {
    saveDraft(props.exerciseId, null);
    setStage("brief");
    setRunningSince(null);
  };

  const onSaved = useCallback(
    (r: { rating: Rating; attemptNumber: number; statusLabel: string }) => {
      saveDraft(props.exerciseId, null);
      setSaved(r);
      setStage("saved");
      window.scrollTo({ top: 0 });
      router.refresh();
    },
    [props.exerciseId, router],
  );

  return (
    <article>
      <header className="mb-8">
        <p className="eyebrow">
          {props.typeLabel} · {props.sectionTitle}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-3xl outline-none sm:text-4xl">
          {props.numberLabel} · {props.title}
        </h1>
        <p className="mt-2 text-sm text-graphite">{props.citation}</p>
        <p className="mt-1 text-sm">
          <span className="text-pencil">Status: </span>
          {props.statusLabel}
          {props.attemptCount > 0 && <span className="text-pencil"> · {props.attemptCount} attempts so far</span>}
          {props.nextReview && <span className="text-pencil"> · next review {props.nextReview}</span>}
        </p>
      </header>

      {stage === "brief" && (
        <Brief
          {...props}
          sheets={sheets}
          isFinal={isFinal}
          direction={direction}
          setDirection={setDirection}
          referenceChoice={reference}
          setReferenceId={setReferenceId}
          onStart={start}
        />
      )}

      {stage === "attempt" && (
        <section aria-labelledby="attempt-h">
          <h2 id="attempt-h" className="sr-only">
            Attempt in progress
          </h2>
          <div className="no-print sticky top-0 z-10 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="flex items-baseline gap-3 text-sm text-graphite">
              {timerVisible ? (
                <span className="font-serif text-xl tabular-nums text-ink" aria-live="off">
                  {fmtClock(elapsedMs)}
                </span>
              ) : (
                <span>Timer hidden</span>
              )}
              <button type="button" className="link text-xs" onClick={() => setTimerVisible((v) => !v)}>
                {timerVisible ? "Hide timer" : "Show timer"}
              </button>
              {runningSince === null && <span className="text-xs">Paused</span>}
            </div>
            <div className="flex gap-2">
              {runningSince === null ? (
                <button type="button" className="btn" onClick={resume}>
                  Resume
                </button>
              ) : (
                <button type="button" className="btn" onClick={pause}>
                  Pause
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={finish}>
                Finish Attempt
              </button>
            </div>
          </div>

          {props.rotationNote && <p className="mb-4 text-sm text-graphite">↻ {props.rotationNote}</p>}
          {props.scaleLabel && <p className="mb-4 font-serif text-lg">Target scale: {props.scaleLabel}</p>}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-8">
              {reference ? (
                <>
                  <ReferenceViewer option={reference} size="tall" />
                  {sheets.display.length > 0 && (
                    <details className="border-t border-rule pt-3">
                      <summary className="cursor-pointer text-sm text-graphite">Her demo stages for this drill</summary>
                      <div className="mt-4 space-y-6">
                        {sheets.display.map((s) => (
                          <SheetFigure key={s.id} view={s} />
                        ))}
                      </div>
                    </details>
                  )}
                </>
              ) : (
                sheets.display.map((s) => <SheetFigure key={s.id} view={s} size="tall" />)
              )}
              {sheets.display.length === 0 && !reference && (
                <p className="text-graphite">Work from your setup — there&apos;s no printed sheet for this one.</p>
              )}
            </div>
            <details className="self-start border-t border-rule pt-3 lg:sticky lg:top-24" open>
              <summary className="cursor-pointer eyebrow">Steps</summary>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-[0.95rem]">
                {props.instructions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-pencil">Checking information stays hidden until you finish.</p>
              <button type="button" className="link mt-4 text-xs" onClick={abandon}>
                Discard this attempt
              </button>
            </details>
          </div>
        </section>
      )}

      {stage === "check" && (
        <CheckAndRate
          {...props}
          sheets={sheets}
          isFinal={isFinal}
          direction={direction}
          referenceChoice={reference}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          startedAt={startedAt}
          finishedAt={finishedAt}
          durationSec={Math.round(elapsedMs / 1000)}
          onSaved={onSaved}
        />
      )}

      {stage === "saved" && saved && (
        <section aria-labelledby="saved-h" className="max-w-2xl">
          <h2 id="saved-h" className="text-2xl">
            Attempt #{saved.attemptNumber} saved
          </h2>
          <p className="mt-3 font-serif text-lg">{SAVED_MESSAGES[saved.rating]}</p>
          <p className="mt-3 text-sm text-graphite">This exercise is now: {saved.statusLabel}.</p>
          <p className="mt-2 text-sm text-pencil">Label and keep the sheet — you&apos;ll look back at it.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/">
              Back to Today
            </Link>
            <button type="button" className="btn" onClick={() => setStage("brief")}>
              Practice again
            </button>
            <Link className="btn btn-quiet" href="/history">
              History
            </Link>
          </div>
        </section>
      )}
    </article>
  );
}

// ───────────────────────────── Brief ─────────────────────────────

function Brief(
  props: PracticeProps & {
    sheets: ResolvedSheetViews;
    isFinal: boolean;
    direction: ScaleDirection;
    setDirection: (d: ScaleDirection) => void;
    referenceChoice?: ReferenceOption;
    setReferenceId: (id: string) => void;
    onStart: () => void;
  },
) {
  const { sheets } = props;
  const printJob = [...sheets.required, ...sheets.setupKeys];
  const printIds = printJob.map((s) => s.id);
  const allPrinted = printIds.length > 0 && printIds.every((id) => props.printed[id]);
  const [pending, startTransition] = useTransition();
  const neededMaterials = props.materials.filter((m) => !m.optional);
  const optionalMaterials = props.materials.filter((m) => m.optional);

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-8">
        <section>
          <h2 className="eyebrow">Goal</h2>
          <p className="mt-2 font-serif text-xl leading-snug">{props.summary}</p>
          {props.scaleLabel && <p className="mt-2 font-serif text-lg text-sienna">Target scale: {props.scaleLabel}</p>}
          <p className="mt-3 text-sm text-graphite">
            {props.minutes} · {props.courseTitle}
          </p>
        </section>

        {props.reference && (
          <section>
            <h2 className="eyebrow">Reference</h2>
            <label className="mt-2 block text-sm">
              <span className="sr-only">Choose a reference photo</span>
              <select
                className="field"
                value={props.referenceChoice?.id}
                onChange={(e) => props.setReferenceId(e.target.value)}
              >
                {props.reference.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-1 text-xs text-pencil">
              Add your own on the{" "}
              <Link className="link" href="/references">
                References
              </Link>{" "}
              page. The value key for checking is made from whichever you choose.
            </p>
          </section>
        )}

        {props.isFinal && (
          <fieldset>
            <legend className="eyebrow">Direction for this attempt</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["constrict", "dilate"] as const).map((d) => (
                <label key={d} className={`btn ${props.direction === d ? "btn-primary" : "btn-quiet"}`}>
                  <input
                    type="radio"
                    name="direction"
                    value={d}
                    className="sr-only"
                    checked={props.direction === d}
                    onChange={() => props.setDirection(d)}
                  />
                  {d === "constrict" ? "Constrict ½ (from Enlarged)" : "Dilate 2× (from Reduced)"}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <section>
          <h2 className="eyebrow">Steps</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            {props.instructions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {props.rotationNote && <p className="mt-3 text-sm text-graphite">↻ {props.rotationNote}</p>}
          <p className="mt-3 text-xs text-pencil">Full instructions: {props.instructionCitation}</p>
        </section>

        {props.recent.length > 0 && (
          <section>
            <h2 className="eyebrow">Before you start — look back</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {props.recent.map((r) => (
                <li key={r.id}>
                  <span className="text-pencil">{r.label}:</span> {r.rating}
                  {r.errors.length > 0 && <> — {r.errors.join(", ")}</>}
                  {r.notes && <span className="block italic text-graphite">“{r.notes}”</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="eyebrow">Materials</h2>
          <ul className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {neededMaterials.map((m) => (
              <li key={m.id}>
                <span aria-hidden="true">{m.owned ? "✓" : "–"}</span> {m.name}
              </li>
            ))}
          </ul>
          {optionalMaterials.map((m) => (
            <p key={m.id} className="mt-1 text-xs text-pencil">
              Optional: {m.name}
            </p>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="eyebrow">What to print</h2>
          {printJob.length === 0 && sheets.reused.length === 0 && (
            <p className="text-sm text-graphite">Nothing to print for this one.</p>
          )}
          {printJob.length > 0 && (
            <ul className="space-y-1 text-sm">
              {printJob.map((s) => (
                <li key={s.id}>
                  <span aria-hidden="true">{props.printed[s.id] ? "✓ " : "· "}</span>
                  {s.citation}
                  {props.printed[s.id] && <span className="sr-only"> (printed)</span>}
                </li>
              ))}
            </ul>
          )}
          {sheets.setupKeys.length > 0 && (
            <p className="text-xs text-graphite">
              The book uses the key during setup (mark top and bottom only), so it&apos;s included in the print job. Put it
              away face down before drawing.
            </p>
          )}
          {sheets.reused.map((r) => (
            <p key={r.sheet.id} className="text-sm">
              Reuse your saved <strong>{r.sheet.label}</strong> from {r.from} ({r.sheet.citation}).{" "}
              <a className="link" href={printHref([r.sheet.id], r.sheet.label)} target="_blank" rel="noopener">
                Reprint
              </a>
            </p>
          ))}
          {sheets.checkKeys.length > 0 && (
            <p className="text-xs text-pencil">The checking key stays hidden until you finish the attempt.</p>
          )}
          {printJob.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                className="btn"
                href={printHref(printIds, `${props.numberLabel} required sheets`)}
                target="_blank"
                rel="noopener"
              >
                {printJob.length > 1 ? "Print Required Sheets" : "Print Exercise"}
              </a>
              <button
                type="button"
                className="btn btn-quiet"
                disabled={pending}
                aria-pressed={allPrinted}
                onClick={() => startTransition(() => setPrinted(printIds, !allPrinted))}
              >
                {allPrinted ? "✓ Printed — undo" : "Mark as printed"}
              </button>
            </div>
          )}
          {printJob.length > 0 && <PrintScaleNote />}
        </section>

        <section className="text-sm text-graphite">
          <h2 className="eyebrow">Practice guidance</h2>
          <p className="mt-2">{props.recommended}</p>
          <p className="mt-1">{props.mastery}</p>
          {props.notes.map((n, i) => (
            <p key={i} className="mt-1">
              {n}
            </p>
          ))}
        </section>

        {(props.parent || props.supplementals.length > 0) && (
          <section className="text-sm">
            <h2 className="eyebrow">Related</h2>
            {props.parent && (
              <p className="mt-2">
                Supplement to{" "}
                <Link className="link" href={`/exercise/${props.parent.id}`}>
                  {props.parent.label}
                </Link>
              </p>
            )}
            <ul className="mt-2 space-y-1">
              {props.supplementals.map((s) => (
                <li key={s.id}>
                  {s.locked ? (
                    <span className="text-pencil">{s.label}</span>
                  ) : (
                    <Link className="link" href={`/exercise/${s.id}`}>
                      {s.label}
                    </Link>
                  )}{" "}
                  <span className="text-pencil">· Supplemental practice · {s.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="pt-2">
          {props.locked ? (
            <p className="border border-rule bg-card p-4 text-sm">
              <span aria-hidden="true">🔒︎ </span>Locked — {props.lockReason ?? "opens later in the course"}. Mastery before
              moving on is part of the method.
            </p>
          ) : (
            <button type="button" className="btn btn-primary w-full px-10 py-4 text-lg sm:w-auto" onClick={props.onStart}>
              Start Attempt
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {props.referenceChoice && <ReferenceViewer option={props.referenceChoice} />}
        {props.referenceChoice && sheets.display.length > 0 && <h2 className="eyebrow pt-4">Her demo stages</h2>}
        {sheets.display.map((s) => (
          <SheetFigure key={s.id} view={s} />
        ))}
        {sheets.required
          .filter((r) => !sheets.display.some((d) => d.id === r.id) && !(props.reference && r.id.startsWith("lref-")))
          .map((s) => (
            <SheetFigure key={s.id} view={s} size="thumb" />
          ))}
      </div>
    </div>
  );
}

// ───────────────────────── Check & rate ─────────────────────────

async function downscaleToJpeg(file: File, maxSide = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
  );
}

function CheckAndRate(
  props: PracticeProps & {
    sheets: ResolvedSheetViews;
    isFinal: boolean;
    direction: ScaleDirection;
    referenceChoice?: ReferenceOption;
    revealed: boolean;
    onReveal: () => void;
    startedAt: string;
    finishedAt: string;
    durationSec: number;
    onSaved: (r: { rating: Rating; attemptNumber: number; statusLabel: string }) => void;
  },
) {
  const { sheets } = props;
  const hasKey = sheets.checkKeys.length > 0 || Boolean(props.referenceChoice);
  const [rating, setRating] = useState<Rating | null>(null);
  const [errors, setErrors] = useState<Set<ErrorCategory>>(new Set());
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => () => void (photoUrl && URL.revokeObjectURL(photoUrl)), [photoUrl]);

  const toggle = (c: ErrorCategory) =>
    setErrors((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const keyIds = useMemo(() => sheets.checkKeys.map((k) => k.id), [sheets.checkKeys]);

  const submit = () => {
    if (!rating) {
      setError("Choose how it went first.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("exerciseId", props.exerciseId);
    fd.set("startedAt", props.startedAt);
    fd.set("finishedAt", props.finishedAt || new Date().toISOString());
    fd.set("durationSec", String(props.durationSec));
    fd.set("rating", rating);
    errors.forEach((c) => fd.append("errors", c));
    fd.set("notes", notes);
    if (props.isFinal) fd.set("direction", props.direction);
    if (props.referenceChoice) fd.set("referenceId", props.referenceChoice.id);
    if (photo) fd.set("photo", new File([photo], "attempt.jpg", { type: "image/jpeg" }));
    startTransition(async () => {
      const res = await saveAttempt(fd);
      if (res.ok) props.onSaved({ rating, attemptNumber: res.attemptNumber, statusLabel: res.statusLabel });
      else setError(res.error);
    });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-labelledby="check-h" className="space-y-5">
        <h2 id="check-h" className="text-2xl">
          Check your work
        </h2>
        <p className="text-sm text-graphite">
          Attempt finished in {Math.max(1, Math.round(props.durationSec / 60))} min. Now compare honestly — the errors you
          find are the useful part.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          {props.checkingInstructions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>

        {hasKey && !props.revealed && (
          <button type="button" className="btn btn-primary" onClick={props.onReveal}>
            Check My Work — show{" "}
            {props.referenceChoice ? "the value key" : sheets.checkKeys.map((k) => k.label).join(", ")}
          </button>
        )}
        {hasKey && props.revealed && props.referenceChoice && props.reference && (
          <ValueKey src={props.referenceChoice.src} levels={props.reference.keyLevels} />
        )}
        {hasKey && props.revealed && sheets.checkKeys.length > 0 && (
          <div className="space-y-4">
            {sheets.checkKeys.map((k) => (
              <SheetFigure key={k.id} view={k} />
            ))}
            <a className="btn btn-quiet" href={printHref(keyIds, `${props.numberLabel} key`)} target="_blank" rel="noopener">
              Print key
            </a>
          </div>
        )}
        {!hasKey && sheets.display.length > 0 && (
          <details className="border-t border-rule pt-3">
            <summary className="cursor-pointer text-sm text-graphite">
              The source is your check reference — show it again
            </summary>
            <div className="mt-4 space-y-6">
              {sheets.display.map((s) => (
                <SheetFigure key={s.id} view={s} />
              ))}
            </div>
          </details>
        )}
      </section>

      <section aria-labelledby="rate-h" className="space-y-6">
        <h2 id="rate-h" className="text-2xl">
          How did it go?
        </h2>
        <fieldset>
          <legend className="sr-only">Result</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(["accurate", "mostly", "rework"] as const).map((r) => (
              <label
                key={r}
                className={`btn justify-start sm:justify-center ${rating === r ? "btn-primary" : ""}`}
              >
                <input
                  type="radio"
                  name="rating"
                  value={r}
                  checked={rating === r}
                  onChange={() => setRating(r)}
                  className="sr-only"
                />
                <span aria-hidden="true">{rating === r ? "●" : "○"}</span>
                {RATING_LABELS[r]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="eyebrow">What kind of error? (any that apply)</legend>
          <div className="mt-3 space-y-3">
            {ERROR_GROUPS.map((g) => (
              <div key={g.title || "other"} className="flex flex-wrap gap-2">
                {g.items.map((c) => {
                  const on = errors.has(c);
                  return (
                    <label
                      key={c}
                      className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-sm border px-3 text-sm ${
                        on ? "border-ink bg-ink text-paper" : "border-rule bg-card text-graphite"
                      }`}
                    >
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(c)} />
                      <span aria-hidden="true">{on ? "✓" : "+"}</span>
                      {ERROR_LABELS[c]}
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="eyebrow">Notes (optional)</span>
          <textarea
            className="field mt-2 min-h-24"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Angles consistently too steep."
            maxLength={5000}
          />
        </label>

        <div>
          <span className="eyebrow">Photo of your drawing (optional)</span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="btn btn-quiet cursor-pointer">
              {photo ? "Replace photo" : "Add photo"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={async (ev) => {
                  const f = ev.target.files?.[0];
                  if (!f) return;
                  try {
                    const blob = await downscaleToJpeg(f);
                    setPhoto(blob);
                    setPhotoUrl((old) => {
                      if (old) URL.revokeObjectURL(old);
                      return URL.createObjectURL(blob);
                    });
                  } catch {
                    setError("Couldn't read that image.");
                  }
                }}
              />
            </label>
            {photoUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="Selected photo of your drawing" className="h-20 w-auto border border-rule" />
                <button
                  type="button"
                  className="link text-xs"
                  onClick={() => {
                    setPhoto(null);
                    setPhotoUrl(null);
                  }}
                >
                  Remove
                </button>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-pencil">Stored privately with your history; never public.</p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-ochre">
            {error}
          </p>
        )}
        <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={pending} onClick={submit}>
          {pending ? "Saving…" : "Save Attempt"}
        </button>
      </section>
    </div>
  );
}
