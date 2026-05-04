import { useEffect, useRef, useState } from "react";
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
  Loader2,
  Zap,
  HeartHandshake,
  Moon,
  ArrowRight,
  RotateCcw,
  Wrench,
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
};

type Screen = "entry" | "person" | "results" | "shift";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("entry");
  const [load, setLoad] = useState(5);
  const [dump, setDump] = useState("");
  const [person, setPerson] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UnloadResult | null>(null);
  const [endLoad, setEndLoad] = useState(5);
  const [shiftSubmitted, setShiftSubmitted] = useState(false);

  const handleBegin = () => {
    if (dump.trim().length < 10) {
      toast.error("Write a little more — even one paragraph helps.");
      return;
    }
    setScreen("person");
  };

  const handlePersonContinue = async () => {
    if (person.trim().length < 1) {
      toast.error("Type one name — anyone who matters.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("unload", {
        body: { dump, load, person: person.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as UnloadResult);
      setEndLoad(Math.max(1, load - 2));
      setScreen("results");
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong. Try again.");
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen w-full px-5 py-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        <header className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-medium text-foreground mb-3">
            Unload<span className="text-primary">AI</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground italic">
            From overwhelmed to clear in 5 minutes.
          </p>
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

        {screen === "person" && (
          <PersonScreen
            person={person}
            setPerson={setPerson}
            loading={loading}
            onContinue={handlePersonContinue}
          />
        )}

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

        <footer className="text-center mt-16 text-sm text-muted-foreground/70">
          Breathe. You're doing fine.
        </footer>
      </div>
    </main>
  );
};

/* ---------------- SCREEN 1 ---------------- */
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
  <section className="space-y-8 animate-in fade-in duration-500">
    <div className="bg-card rounded-3xl p-6 md:p-7 border border-border shadow-[var(--shadow-card)]">
      <div className="flex items-baseline justify-between mb-4">
        <label className="text-sm font-medium text-foreground/80">
          How full is your mental load right now?
        </label>
        <span className="text-2xl font-medium text-primary">{load}</span>
      </div>
      <Slider
        value={[load]}
        onValueChange={(v) => setLoad(v[0])}
        min={1}
        max={10}
        step={1}
        className="my-2"
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        <span>1 · light</span>
        <span>10 · overflowing</span>
      </div>
    </div>

    <div className="bg-card rounded-3xl p-2 shadow-[var(--shadow-card)] border border-border">
      <Textarea
        value={dump}
        onChange={(e) => setDump(e.target.value)}
        placeholder="Type everything in your head — worries, deadlines, feelings, things unsaid, people you miss, fears. No filter. Just dump it all."
        className="min-h-[280px] text-base md:text-lg leading-relaxed resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-6 placeholder:text-muted-foreground/60"
      />
    </div>

    <Button
      onClick={onBegin}
      className="w-full h-16 text-lg font-medium rounded-2xl shadow-[var(--shadow-soft)] transition-[var(--transition-smooth)] hover:scale-[1.01]"
    >
      Begin My Reset
      <ArrowRight className="ml-2 h-5 w-5" />
    </Button>
  </section>
);

/* ---------------- SCREEN 2 ---------------- */
const PersonScreen = ({
  person,
  setPerson,
  loading,
  onContinue,
}: {
  person: string;
  setPerson: (s: string) => void;
  loading: boolean;
  onContinue: () => void;
}) => (
  <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="bg-warm rounded-3xl p-8 md:p-12 border border-warm text-center shadow-[var(--shadow-warm)]">
      <Heart className="h-8 w-8 text-warm-accent mx-auto mb-5" />
      <p
        className="text-2xl md:text-3xl leading-relaxed text-warm-foreground"
        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
      >
        Before we clear your mind — think of one person whose face makes everything worth it. Type their name.
      </p>
    </div>

    <Input
      value={person}
      onChange={(e) => setPerson(e.target.value)}
      placeholder="Their name…"
      className="h-16 text-lg text-center rounded-2xl border-border bg-card shadow-[var(--shadow-card)]"
      autoFocus
      disabled={loading}
      onKeyDown={(e) => e.key === "Enter" && !loading && onContinue()}
    />

    <Button
      onClick={onContinue}
      disabled={loading}
      className="w-full h-16 text-lg font-medium rounded-2xl shadow-[var(--shadow-soft)] transition-[var(--transition-smooth)] hover:scale-[1.01]"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Reading every word…
        </>
      ) : (
        <>
          Continue
          <ArrowRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  </section>
);

/* ---------------- SCREEN 3 + 4 ---------------- */
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
    <div className="text-center">
      <span className="inline-block bg-accent text-accent-foreground px-5 py-2 rounded-full text-sm font-medium border border-border">
        Detected: {result.situation_tag}
      </span>
    </div>

    <ResultCard
      icon={<CheckCircle2 className="h-5 w-5" />}
      title="What you need to do today"
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

    <ResultCard icon={<Wind className="h-5 w-5" />} title="What you need to let go">
      <ul className="space-y-3">
        {result.let_go.map((item, i) => (
          <li key={i} className="flex gap-3 text-foreground/90">
            <span className="text-primary shrink-0 mt-2">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </ResultCard>

    <ResultCard icon={<Heart className="h-5 w-5" />} title="What is really stressing you">
      <p className="text-lg leading-relaxed text-foreground/90">{result.root_stress}</p>
    </ResultCard>

    <ResultCard
      icon={<Zap className="h-5 w-5" />}
      title="What to open right now"
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
      title={`For you — and ${person}`}
      tone="warm"
    >
      <p
        className="text-lg md:text-xl leading-relaxed text-warm-foreground"
        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
      >
        {result.person_message}
      </p>
    </ResultCard>

    <ResultCard icon={<Moon className="h-5 w-5" />} title="Your next 24 hours">
      <div className="space-y-4 text-foreground/90">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Tonight</p>
          <p>{result.recovery_plan.tonight}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Tomorrow morning
          </p>
          <p>{result.recovery_plan.tomorrow_morning}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Tomorrow afternoon
          </p>
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
        if (!cancel) setError(e?.message || "Could not load breakdowns.");
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
        <h2 className="text-sm font-medium uppercase tracking-wider">How To Actually Do It</h2>
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-info-foreground/70 text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Building your step-by-step playbook…
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
        <h2 className="text-sm font-medium uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </article>
  );
};

/* ---------------- 3-MINUTE RESET ---------------- */
const ThreeMinuteReset = ({
  groundingQuestion,
  intention,
  onComplete,
}: {
  groundingQuestion: string;
  intention: string;
  onComplete: () => void;
}) => {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0); // 0 = idle, 1-3 = steps
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [breathPhase, setBreathPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    if (step === 0) return;
    setSecondsLeft(60);
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  // Breath cycle for step 1
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
        <h2 className="text-sm font-medium uppercase tracking-wider">Your 3 minute reset</h2>
      </div>

      {step === 0 && (
        <>
          <p className="text-foreground/80 mb-6">
            Three gentle steps. About a minute each. Just follow along.
          </p>
          <Button
            onClick={() => setStep(1)}
            className="w-full h-14 text-base font-medium rounded-2xl"
          >
            Start
          </Button>
        </>
      )}

      {step >= 1 && (
        <div className="text-center py-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-6">
            Step {step} of 3 · {secondsLeft}s
          </p>

          {step === 1 && (
            <div className="flex flex-col items-center gap-6 py-4">
              <div
                className="rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center"
                style={{
                  width: breathPhase === "in" ? 220 : 120,
                  height: breathPhase === "in" ? 220 : 120,
                  transition: "all 4s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <span
                  className="text-lg font-medium text-primary"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {breathPhase === "in" ? "Breathe in" : "Breathe out"}
                </span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-warm border border-warm rounded-2xl p-7 my-4">
              <p className="text-xs uppercase tracking-wider text-warm-accent mb-3">Sit with this</p>
              <p
                className="text-xl md:text-2xl leading-relaxed text-warm-foreground"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {groundingQuestion}
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="bg-action border border-action rounded-2xl p-7 my-4">
              <p className="text-xs uppercase tracking-wider text-action-foreground mb-3">
                Your intention
              </p>
              <p
                className="text-xl md:text-2xl leading-relaxed text-action-foreground"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {intention}
              </p>
            </div>
          )}

          <Button
            onClick={next}
            disabled={secondsLeft > 0}
            className="w-full h-14 text-base font-medium rounded-2xl mt-6"
          >
            {secondsLeft > 0
              ? `Wait ${secondsLeft}s`
              : step === 3
              ? "See your shift"
              : "Next"}
          </Button>
        </div>
      )}
    </div>
  );
};

/* ---------------- SCREEN 5 ---------------- */
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
        <h2
          className="text-2xl md:text-3xl mb-2 text-foreground"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          You started at {startLoad}.
        </h2>
        <p className="text-muted-foreground mb-8">Where are you now?</p>

        <div className="flex items-baseline justify-between mb-3">
          <span className="text-sm text-foreground/70">Now</span>
          <span className="text-3xl font-medium text-primary">{endLoad}</span>
        </div>
        <Slider
          value={[endLoad]}
          onValueChange={(v) => setEndLoad(v[0])}
          min={1}
          max={10}
          step={1}
          disabled={submitted}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>1 · light</span>
          <span>10 · overflowing</span>
        </div>

        {!submitted ? (
          <Button onClick={onSubmit} className="w-full h-14 text-base rounded-2xl mt-8">
            Submit
          </Button>
        ) : (
          <div className="mt-8 bg-warm border border-warm rounded-2xl p-6 text-center">
            <p
              className="text-xl md:text-2xl text-warm-foreground leading-relaxed"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {diff > 0
                ? `You moved from ${startLoad} to ${endLoad}. That shift is real. You did that.`
                : diff === 0
                ? `You stayed at ${endLoad} — and that's okay. You showed up. That counts.`
                : `Some days the load grows before it lifts. You did the brave thing by looking at it.`}
            </p>
          </div>
        )}
      </div>

      {submitted && (
        <>
          <div className="text-center px-4">
            <p className="text-sm text-muted-foreground/80 leading-relaxed">
              Without UnloadAI — 2 hours of spiraling.
              <br />
              With UnloadAI — 5 minutes to clarity.
            </p>
          </div>

          <Button
            onClick={onReset}
            variant="outline"
            className="w-full h-14 text-base font-medium rounded-2xl"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            New Reset
          </Button>
        </>
      )}
    </section>
  );
};

export default Index;
