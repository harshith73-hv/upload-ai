import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  Wind,
  Heart,
  Sparkles,
  Zap,
  HeartHandshake,
  Moon,
  ArrowRight,
  RotateCcw,
  Wrench,
  Phone,
  Loader2,
} from "lucide-react";

type UnloadResult = {
  situation_tag: string;
  todo_today: string[];
  let_go: string[];
  root_stress: string;
  open_now: string[];
  person_message: string;
  recovery_plan: {
    tonight: string;
    tomorrow_morning: string;
    tomorrow_afternoon: string;
  };
  grounding_question: string;
  intention: string;
  crisis_detected?: boolean;
};

type Screen = "entry" | "person" | "results" | "shift";

const CRISIS_PATTERNS = [
  "nobody would miss me",
  "want it to stop",
  "don't want to be here",
  "dont want to be here",
  "made my decision",
  "last time",
  "everyone would be better off",
  "ending it",
  "can't do this anymore",
  "cant do this anymore",
  "no point",
];

const detectCrisisLocal = (text: string) => {
  const lower = text.toLowerCase();
  return CRISIS_PATTERNS.some((p) => lower.includes(p));
};

const Index = () => {
  const [screen, setScreen] = useState<Screen>("entry");
  const [load, setLoad] = useState(5);
  const [dump, setDump] = useState("");
  const [person, setPerson] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UnloadResult | null>(null);
  const [endLoad, setEndLoad] = useState(5);
  const [shiftSubmitted, setShiftSubmitted] = useState(false);
  const [crisisOpen, setCrisisOpen] = useState(false);

  const handleBegin = () => {
    if (dump.trim().length < 10) {
      toast("saathi is here. type anything — even one word about what is weighing on you.", { duration: 4000 });
      return;
    }
    if (detectCrisisLocal(dump)) setCrisisOpen(true);
    setScreen("person");
  };

  const handlePersonContinue = async () => {
    if (person.trim().length < 1) {
      toast.error("type one name — anyone who matters.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("unload", {
        body: { dump, load, person: person.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = data as UnloadResult;
      setResult(res);
      if (res.crisis_detected) setCrisisOpen(true);
      setEndLoad(Math.max(1, load - 2));
      setScreen("results");
    } catch (e: any) {
      toast.error(e?.message || "something went wrong. try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setScreen("entry");
    setLoad(5);
    setDump("");
    setPerson("");
    setResult(null);
    setEndLoad(5);
    setShiftSubmitted(false);
    setCrisisOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen w-full px-5 py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <header className="mb-12">
          <div className="flex items-center gap-2.5">
            <span className="block h-2 w-2 rounded-full bg-sage dot-pulse" />
            <span className="font-ui text-xs uppercase tracking-[0.18em] text-foreground/70">
              saathi is with you
            </span>
          </div>
          <div className="mt-10 text-center">
            <h1 className="font-serif-s text-6xl md:text-7xl text-foreground">saathi</h1>
            <p className="font-serif-s italic text-lg md:text-xl text-foreground/70 mt-2">
              your companion through everything
            </p>
          </div>
        </header>

        {screen === "entry" && (
          <EntryScreen
            load={load}
            setLoad={setLoad}
            dump={dump}
            setDump={setDump}
            onBegin={handleBegin}
          />
        )}

        {screen === "person" && !loading && (
          <PersonScreen
            person={person}
            setPerson={setPerson}
            onContinue={handlePersonContinue}
          />
        )}

        {screen === "person" && loading && <SaathiLoading />}

        {screen === "results" && result && (
          <ResultsScreen
            result={result}
            person={person}
            onContinueToShift={() => setScreen("shift")}
          />
        )}

        {screen === "shift" && result && (
          <ShiftScreen
            startLoad={load}
            endLoad={endLoad}
            setEndLoad={setEndLoad}
            submitted={shiftSubmitted}
            onSubmit={() => setShiftSubmitted(true)}
            onReset={reset}
          />
        )}

        <footer className="text-center mt-20 mb-4">
          <p className="font-serif-s italic text-foreground/50 text-sm">
            saathi is always here. you are never alone.
          </p>
        </footer>
      </div>

      {crisisOpen && <CrisisOverlay onClose={() => setCrisisOpen(false)} />}
    </main>
  );
};

/* ---------------- ENTRY ---------------- */
const EntryScreen = ({
  load,
  setLoad,
  dump,
  setDump,
  onBegin,
}: {
  load: number;
  setLoad: (n: number) => void;
  dump: string;
  setDump: (s: string) => void;
  onBegin: () => void;
}) => (
  <section className="space-y-10 animate-in fade-in duration-700">
    <div className="px-1">
      <div className="flex items-baseline justify-between mb-3">
        <label className="font-ui text-xs uppercase tracking-[0.15em] text-foreground/60">
          how full is your mental load right now
        </label>
        <span className="font-serif-s text-3xl text-primary">{load}</span>
      </div>
      <Slider
        value={[load]}
        onValueChange={(v) => setLoad(v[0])}
        min={1}
        max={10}
        step={1}
      />
    </div>

    <Textarea
      value={dump}
      onChange={(e) => setDump(e.target.value)}
      placeholder="what is weighing on you right now? say it however it comes out. broken sentences are fine. one word is fine. everything is fine here."
      className="min-h-[340px] text-base md:text-lg leading-[1.9] resize-none border-0 bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none p-2 placeholder:text-foreground/35 placeholder:italic placeholder:font-serif-s text-foreground/90"
      style={{ boxShadow: "none" }}
    />

    <button
      onClick={onBegin}
      className="w-full text-center py-6 font-serif-s italic text-xl md:text-2xl text-primary soft-pulse hover:opacity-100 transition-opacity"
    >
      when you are ready — saathi will listen ›
    </button>
  </section>
);

/* ---------------- PERSON ---------------- */
const PersonScreen = ({
  person,
  setPerson,
  onContinue,
}: {
  person: string;
  setPerson: (s: string) => void;
  onContinue: () => void;
}) => (
  <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div
      className="rounded-[2rem] p-10 md:p-14 text-center relative overflow-hidden"
      style={{ backgroundColor: "hsl(19 56% 59% / 0.15)" }}
    >
      <div className="flex justify-center mb-8">
        <div className="relative h-24 w-24 flex items-center justify-center">
          <div className="absolute inset-0 saathi-orb saathi-breathing" />
          <div className="absolute inset-2 rounded-full bg-warm-solid opacity-40 blur-md saathi-breathing" />
        </div>
      </div>
      <p
        className="font-serif-s italic text-warm-foreground leading-relaxed"
        style={{ fontSize: "28px", lineHeight: 1.4 }}
      >
        before saathi can truly help — think of one person whose face makes everything worth it. type their name.
      </p>
    </div>

    <div className="mt-8 space-y-5">
      <Input
        value={person}
        onChange={(e) => setPerson(e.target.value)}
        placeholder="their name…"
        className="h-16 text-lg text-center rounded-2xl border-border bg-card font-serif-s italic"
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && onContinue()}
      />
      <Button
        onClick={onContinue}
        className="w-full h-14 font-ui text-base rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
      >
        continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  </section>
);

/* ---------------- LOADING ---------------- */
const LOADING_LINES = [
  "saathi is reading every word…",
  "saathi is understanding your weight…",
  "saathi is here with you…",
];
const SaathiLoading = () => {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % LOADING_LINES.length), 2200);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => setRevealed((r) => (r >= 3 ? 3 : r + 1)), 1100);
    return () => clearInterval(id);
  }, []);
  const words = ["your words", "your weight", "your moment"];
  return (
    <section className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-700">
      <div className="relative h-64 w-64 flex items-center justify-center mb-8">
        <div className="absolute inset-0 saathi-orb saathi-breathing" />
        <div
          className="absolute inset-6 bg-warm-solid opacity-50 blur-xl saathi-breathing"
          style={{ animationDelay: "-2s" }}
        />
      </div>
      <p className="font-serif-s italic text-2xl text-foreground/85 mb-6">saathi is reading you</p>
      <div className="flex flex-col items-center gap-1.5 min-h-[80px]">
        {words.map((w, i) => (
          <span
            key={i}
            className={`font-serif-s italic text-foreground/60 text-base transition-opacity duration-700 ${
              i < revealed ? "opacity-100" : "opacity-0"
            }`}
          >
            — {w} —
          </span>
        ))}
      </div>
      <p className="sr-only">{LOADING_LINES[idx]}</p>
    </section>
  );
};

/* ---------------- RESULTS ---------------- */
const ResultsScreen = ({
  result,
  person,
  onContinueToShift,
}: {
  result: UnloadResult;
  person: string;
  onContinueToShift: () => void;
}) => (
  <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="pl-4 border-l-2 border-primary">
      <p className="font-ui text-xs uppercase tracking-[0.18em] text-foreground/70">
        SAATHI UNDERSTANDS: {result.situation_tag}
      </p>
    </div>

    <ResultCard
      icon={<CheckCircle2 className="h-5 w-5" />}
      title="what saathi sees you need"
      tone="action"
    >
      <ol className="space-y-3">
        {result.todo_today.map((item, i) => (
          <li key={i} className="flex gap-3 text-foreground/90">
            <span className="font-medium shrink-0 text-action-foreground">{i + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </ResultCard>

    <ResultCard icon={<Wind className="h-5 w-5" />} title="what saathi says you can release">
      <ul className="space-y-3">
        {result.let_go.map((item, i) => (
          <li key={i} className="flex gap-3 text-foreground/90">
            <span className="text-primary shrink-0 mt-2">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </ResultCard>

    <ResultCard icon={<Heart className="h-5 w-5" />} title="what is really happening beneath this">
      <p className="text-lg leading-relaxed text-foreground/90 font-serif-s italic">
        {result.root_stress}
      </p>
    </ResultCard>

    <ResultCard
      icon={<Zap className="h-5 w-5" />}
      title="what saathi suggests right now"
      tone="action"
    >
      <ul className="space-y-3">
        {result.open_now.map((item, i) => (
          <li key={i} className="flex gap-3 text-foreground/90">
            <span className="text-action-foreground shrink-0 mt-2">→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </ResultCard>

    <ResultCard
      icon={<HeartHandshake className="h-5 w-5" />}
      title={`a message from saathi — for you and ${person}`}
      tone="warm"
    >
      <p className="font-serif-s text-xl md:text-2xl leading-relaxed text-warm-foreground italic">
        {result.person_message}
      </p>
    </ResultCard>

    <ResultCard icon={<Moon className="h-5 w-5" />} title="saathi's gentle plan for you">
      <div className="space-y-4 text-foreground/90">
        <div>
          <p className="font-ui text-xs uppercase tracking-wider text-foreground/55 mb-1">tonight</p>
          <p>{result.recovery_plan.tonight}</p>
        </div>
        <div>
          <p className="font-ui text-xs uppercase tracking-wider text-foreground/55 mb-1">tomorrow morning</p>
          <p>{result.recovery_plan.tomorrow_morning}</p>
        </div>
        <div>
          <p className="font-ui text-xs uppercase tracking-wider text-foreground/55 mb-1">tomorrow afternoon</p>
          <p>{result.recovery_plan.tomorrow_afternoon}</p>
        </div>
      </div>
    </ResultCard>

    <TaskBreakdownSection tasks={result.todo_today} />

    <ThreeMinuteReset
      groundingQuestion={result.grounding_question}
      intention={result.intention}
      onComplete={onContinueToShift}
    />
  </section>
);

/* ---------------- TASK BREAKDOWN ---------------- */
type Breakdown = { task: string; estimate: string; steps: string[] };

const TaskBreakdownSection = ({ tasks }: { tasks: string[] }) => {
  const [loading, setLoading] = useState(true);
  const [breakdowns, setBreakdowns] = useState<Breakdown[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("task-breakdown", {
          body: { tasks, context: "" },
        });
        if (cancel) return;
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setBreakdowns((data as any).breakdowns || []);
      } catch (e: any) {
        if (!cancel) setError(e?.message || "could not load breakdowns.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [tasks]);

  return (
    <article className="bg-info border border-info rounded-3xl p-7 md:p-8 mt-2 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 mb-4 text-info-accent">
        <Wrench className="h-5 w-5" />
        <h2 className="font-ui text-sm font-medium uppercase tracking-wider">how to actually do it</h2>
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-info-foreground/70 text-sm py-4 font-serif-s italic">
          <Loader2 className="h-4 w-4 animate-spin" />
          building your step-by-step playbook…
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {breakdowns && breakdowns.length > 0 && (
        <Accordion type="multiple" className="space-y-3">
          {breakdowns.map((b, i) => (
            <AccordionItem
              key={i}
              value={`b-${i}`}
              className="bg-card border border-info rounded-2xl px-5 data-[state=open]:shadow-[var(--shadow-card)]"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex flex-col items-start text-left gap-1 pr-3">
                  <span className="text-base font-medium text-foreground">{b.task}</span>
                  <span className="text-xs text-info-accent font-medium">≈ {b.estimate}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ol className="space-y-3 pt-1 pb-2">
                  {b.steps.map((s, j) => (
                    <li key={j} className="flex gap-3 text-foreground/85 text-[15px] leading-relaxed">
                      <span className="text-info-accent shrink-0 font-medium">{j + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </article>
  );
};

const ResultCard = ({
  icon,
  title,
  children,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: "default" | "warm" | "action";
}) => {
  const styles =
    tone === "warm"
      ? "bg-warm border-warm shadow-[var(--shadow-warm)]"
      : tone === "action"
      ? "bg-action border-action shadow-[var(--shadow-card)]"
      : "bg-card border-border shadow-[var(--shadow-card)]";
  const iconColor =
    tone === "warm" ? "text-warm-accent" : tone === "action" ? "text-action-foreground" : "text-primary";
  return (
    <article
      className={`rounded-3xl p-7 md:p-8 border transition-[var(--transition-smooth)] ${styles}`}
    >
      <div className={`flex items-center gap-2 mb-4 ${iconColor}`}>
        {icon}
        <h2 className="font-ui text-sm font-medium uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </article>
  );
};

/* ---------------- BREATHE WITH SAATHI ---------------- */
const STEP_DURATIONS = { 1: 30, 2: 20, 3: 20 } as const;

const ThreeMinuteReset = ({
  groundingQuestion,
  intention,
  onComplete,
}: {
  groundingQuestion: string;
  intention: string;
  onComplete: () => void;
}) => {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [breathPhase, setBreathPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    if (step === 0) return;
    setSecondsLeft(STEP_DURATIONS[step]);
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step !== 1) return;
    setBreathPhase("in");
    const id = setInterval(() => {
      setBreathPhase((p) => (p === "in" ? "out" : "in"));
    }, 4000);
    return () => clearInterval(id);
  }, [step]);

  const next = () => {
    if (step === 3) {
      onComplete();
      return;
    }
    setStep((s) => ((s + 1) as 0 | 1 | 2 | 3));
  };

  return (
    <div className="bg-card rounded-3xl p-7 md:p-9 border border-border shadow-[var(--shadow-card)] mt-8">
      <div className="flex items-center gap-2 mb-2 text-primary">
        <Sparkles className="h-5 w-5" />
        <h2 className="font-ui text-sm font-medium uppercase tracking-wider">breathe with saathi</h2>
      </div>

      {step === 0 && (
        <>
          <p className="text-foreground/75 mb-6 font-serif-s italic text-lg">
            three short steps. 70 seconds total. just follow along.
          </p>
          <Button
            onClick={() => setStep(1)}
            className="w-full h-14 text-base font-medium rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            start
          </Button>
        </>
      )}

      {step >= 1 && (
        <div className="text-center py-4">
          <p className="font-ui text-xs uppercase tracking-wider text-foreground/55 mb-6">
            step {step} of 3 · {secondsLeft}s
          </p>

          {step === 1 && (
            <div className="flex flex-col items-center gap-6 py-4">
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: breathPhase === "in" ? 220 : 120,
                  height: breathPhase === "in" ? 220 : 120,
                  backgroundColor: "hsl(19 56% 59% / 0.18)",
                  border: "2px solid hsl(19 56% 59% / 0.45)",
                  transition: "all 4s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <span className="font-serif-s italic text-lg text-primary">
                  {breathPhase === "in" ? "with saathi" : "let it go"}
                </span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-warm border border-warm rounded-2xl p-7 my-4">
              <p className="font-ui text-xs uppercase tracking-wider text-warm-accent mb-3">sit with this</p>
              <p className="font-serif-s italic text-xl md:text-2xl leading-relaxed text-warm-foreground">
                {groundingQuestion}
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="bg-action border border-action rounded-2xl p-7 my-4">
              <p className="font-ui text-xs uppercase tracking-wider text-action-foreground mb-3">
                your intention
              </p>
              <p className="font-serif-s italic text-xl md:text-2xl leading-relaxed text-action-foreground">
                {intention}
              </p>
            </div>
          )}

          <Button
            onClick={next}
            disabled={secondsLeft > 0}
            className="w-full h-14 text-base font-medium rounded-2xl mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {secondsLeft > 0
              ? `wait ${secondsLeft}s`
              : step === 3
              ? "see your shift"
              : "next"}
          </Button>
        </div>
      )}
    </div>
  );
};

/* ---------------- SHIFT ---------------- */
const ShiftScreen = ({
  startLoad,
  endLoad,
  setEndLoad,
  submitted,
  onSubmit,
  onReset,
}: {
  startLoad: number;
  endLoad: number;
  setEndLoad: (n: number) => void;
  submitted: boolean;
  onSubmit: () => void;
  onReset: () => void;
}) => {
  const diff = startLoad - endLoad;
  return (
    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-card rounded-3xl p-8 md:p-10 border border-border shadow-[var(--shadow-card)]">
        <h2 className="font-serif-s text-2xl md:text-3xl mb-2 text-foreground italic">
          saathi has been with you through this.
        </h2>
        <p className="text-foreground/65 mb-8 font-serif-s italic">where are you now?</p>

        <div className="flex items-baseline justify-between mb-3">
          <span className="font-ui text-xs uppercase tracking-wider text-foreground/65">now</span>
          <span className="font-serif-s text-3xl text-primary">{endLoad}</span>
        </div>
        <Slider
          value={[endLoad]}
          onValueChange={(v) => setEndLoad(v[0])}
          min={1}
          max={10}
          step={1}
          disabled={submitted}
        />
        <div className="flex justify-between font-ui text-xs text-foreground/55 mt-2">
          <span>still heavy</span>
          <span>a little lighter</span>
        </div>

        {!submitted ? (
          <Button onClick={onSubmit} className="w-full h-14 text-base rounded-2xl mt-8 bg-primary text-primary-foreground hover:bg-primary/90">
            tell saathi where you are now
          </Button>
        ) : (
          <div className="mt-8 bg-warm border border-warm rounded-2xl p-6 text-center">
            <p className="font-serif-s italic text-xl md:text-2xl text-warm-foreground leading-relaxed">
              {diff > 0
                ? `you moved from ${startLoad} to ${endLoad}. that shift happened because you stayed. saathi is proud of you.`
                : diff === 0
                ? `you stayed at ${endLoad} — and that's okay. you showed up. saathi is proud of you.`
                : `some days the load grows before it lifts. you did the brave thing by looking at it. saathi is proud of you.`}
            </p>
          </div>
        )}
      </div>

      {submitted && (
        <>
          <Button
            onClick={onReset}
            variant="outline"
            className="w-full h-14 text-base font-medium rounded-2xl"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            new reset with saathi
          </Button>
        </>
      )}
    </section>
  );
};

/* ---------------- CRISIS OVERLAY ---------------- */
const HELPLINES = [
  { name: "iCall India", number: "9152987821" },
  { name: "Vandrevala Foundation", number: "1860-2662-345" },
  { name: "iMind", number: "9152987821" },
];

const CrisisOverlay = ({ onClose }: { onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-y-auto animate-in fade-in duration-500"
    style={{ backgroundColor: "hsl(19 56% 35% / 0.97)", backdropFilter: "blur(10px)" }}
  >
    <div className="max-w-xl w-full text-center py-8">
      <div className="flex justify-center mb-8">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 saathi-orb saathi-breathing" />
        </div>
      </div>
      <p className="font-serif-s italic text-warm-foreground text-2xl md:text-3xl leading-snug mb-10">
        saathi hears you. what you are feeling right now is real. and it is temporary. please stay with saathi for just five more minutes.
      </p>

      <div className="space-y-3 mb-8">
        {HELPLINES.map((h) => (
          <a
            key={h.name}
            href={`tel:${h.number.replace(/[^0-9]/g, "")}`}
            className="flex items-center justify-between gap-4 bg-card/95 hover:bg-card rounded-2xl p-5 text-left transition-colors border border-warm-border"
          >
            <div>
              <p className="font-serif-s text-lg text-foreground">{h.name}</p>
              <p className="font-ui text-sm text-foreground/70">{h.number}</p>
            </div>
            <span className="flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-2 font-ui text-sm">
              <Phone className="h-4 w-4" />
              call
            </span>
          </a>
        ))}
      </div>

      <button
        onClick={onClose}
        className="font-serif-s italic text-warm-foreground/80 hover:text-warm-foreground text-base underline-offset-4 hover:underline"
      >
        i'm here — let me stay with saathi
      </button>
    </div>
  </div>
);

export default Index;
