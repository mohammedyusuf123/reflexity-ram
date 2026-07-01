import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SectionLabel from "@/components/SectionLabel";
import { useSEO } from "@/lib/seo";

export default function PolicyPage({ num, label, title, intro, sections, testId }) {
  useSEO({ title: title, description: intro?.slice(0, 160) });
  return (
    <>
      <Header />
      <main className="page" data-testid={testId || "policy-page"}>
        <div className="container-tight pt-12 pb-16">
          <SectionLabel num={num}>{label}</SectionLabel>
          <h1 className="display-2 display-grad mt-4 mb-5">{title}</h1>
          {intro && (
            <p className="text-neutral-400 max-w-2xl leading-relaxed text-[15px]">
              {intro}
            </p>
          )}

          <div className="mt-10 grid gap-8 max-w-3xl">
            {sections.map((s, i) => (
              <section key={i} className="fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
                <h2 className="text-xl font-semibold tracking-tight text-white mb-3">
                  {s.heading}
                </h2>
                <div className="text-neutral-400 leading-relaxed text-[14.5px] space-y-3">
                  {s.body.map((p, j) =>
                    typeof p === "string" ? (
                      <p key={j}>{p}</p>
                    ) : (
                      <ul key={j} className="list-disc pl-5 space-y-1.5 marker:text-neutral-600">
                        {p.list.map((li, k) => (
                          <li key={k}>{li}</li>
                        ))}
                      </ul>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
