import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Wind, Heart, Sparkles, Loader2 } from "lucide-react";

type UnloadResult = {
  todo_today: string[];
  let_go: string[];
  root_stress: string;
  grounding_statement: string;
};

const Index = () => {
  const [dump, setDump] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UnloadResult | null>(null);

  const handleUnload = async () => {
    if (dump.trim().length < 3) {
      toast.error("Write a little more first.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("unload", {
        body: { dump },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as UnloadResult);
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <header className="text-center mb-12">
          <h1 className="text-6xl md:text-7xl font-medium text-foreground mb-4">
            Unload<span className="text-primary">AI</span>
          </h1>
          <p className="text-lg text-muted-foreground italic">
            Empty your mind in 20 seconds.
          </p>
        </header>

        <section className="space-y-6">
          <div className="bg-card rounded-3xl p-2 shadow-[var(--shadow-card)] border border-border">
            <Textarea
              value={dump}
              onChange={(e) => setDump(e.target.value)}
              placeholder="Type everything in your head right now — worries, tasks, deadlines, feelings, things unsaid. Do not filter. Just dump it all."
              className="min-h-[260px] text-base md:text-lg leading-relaxed resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-6 placeholder:text-muted-foreground/70"
              disabled={loading}
            />
          </div>

          <Button
            onClick={handleUnload}
            disabled={loading}
            className="w-full h-16 text-lg font-medium rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[var(--shadow-soft)] transition-[var(--transition-smooth)] hover:scale-[1.01]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Clearing your mental load...
              </>
            ) : (
              "Unload My Mind"
            )}
          </Button>
        </section>

        {result && (
          <section id="results" className="mt-16 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ResultCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="What you need to do today"
            >
              <ol className="space-y-3">
                {result.todo_today.map((item, i) => (
                  <li key={i} className="flex gap-3 text-foreground/90">
                    <span className="font-medium text-primary shrink-0">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </ResultCard>

            <ResultCard
              icon={<Wind className="h-5 w-5" />}
              title="What you need to let go"
            >
              <ul className="space-y-3">
                {result.let_go.map((item, i) => (
                  <li key={i} className="flex gap-3 text-foreground/90">
                    <span className="text-primary shrink-0 mt-2">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </ResultCard>

            <ResultCard
              icon={<Heart className="h-5 w-5" />}
              title="What is really stressing you"
            >
              <p className="text-lg leading-relaxed text-foreground/90">
                {result.root_stress}
              </p>
            </ResultCard>

            <ResultCard
              icon={<Sparkles className="h-5 w-5" />}
              title="One thing to say to yourself right now"
              highlight
            >
              <p className="text-xl md:text-2xl leading-relaxed font-medium text-foreground" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                "{result.grounding_statement}"
              </p>
            </ResultCard>

            <Button
              onClick={() => {
                setResult(null);
                setDump("");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              variant="outline"
              className="w-full h-14 text-base font-medium rounded-2xl"
            >
              Reset
            </Button>
          </section>
        )}

        <footer className="text-center mt-20 text-sm text-muted-foreground/70">
          Breathe. You're doing fine.
        </footer>
      </div>
    </main>
  );
};

const ResultCard = ({
  icon,
  title,
  children,
  highlight = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
}) => (
  <article
    className={`rounded-3xl p-7 md:p-8 border transition-[var(--transition-smooth)] ${
      highlight
        ? "bg-accent border-primary/30 shadow-[var(--shadow-soft)]"
        : "bg-card border-border shadow-[var(--shadow-card)]"
    }`}
  >
    <div className="flex items-center gap-2 mb-4 text-primary">
      {icon}
      <h2 className="text-sm font-medium uppercase tracking-wider">{title}</h2>
    </div>
    {children}
  </article>
);

export default Index;
