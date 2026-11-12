import Link from "next/link";

// Figma "Union" / "Ellipse 9" colour for the hero decorations.
const DECOR_COLOR = "#5677FF";

// Four stacked zigzag lines, matching the Figma "Group 24/25" decoration.
function Zigzag({ className }: { className?: string }) {
  const lines = [0, 17, 34, 51];
  const points = (offset: number) =>
    Array.from({ length: 8 }, (_, i) => `${i * 18 - 6},${offset + (i % 2 ? 4 : 22)}`).join(" ");

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 80"
      fill="none"
      stroke={DECOR_COLOR}
      strokeWidth="6"
      className={className}
    >
      {lines.map((offset) => (
        <polyline key={offset} points={points(offset)} />
      ))}
    </svg>
  );
}

export default function OnboardingPage() {
  return (
    <main className="flex min-h-dvh justify-center bg-white">
      <div className="flex min-h-dvh w-full max-w-md flex-col">
        {/* Blue hero: 552 / 844 of the Figma frame; grows on taller screens */}
        <section className="relative min-h-105 flex-1 overflow-hidden bg-accent">
          <Zigzag className="absolute -left-1 top-26.5 w-30" />
          <Zigzag className="absolute -right-1 bottom-12 w-30" />
          {/* Ring, partly off the top-right corner */}
          <svg
            aria-hidden="true"
            viewBox="0 0 88 88"
            className="absolute -right-6 -top-11 w-22"
          >
            <circle cx="44" cy="44" r="35" fill="none" stroke={DECOR_COLOR} strokeWidth="18" />
          </svg>
        </section>

        {/* White panel: 292px in Figma (24 + 36 + 16 + 36 + 100 + 48 + 32) */}
        <section className="bg-white px-6 pt-6 pb-8">
          <h1 className="text-2xl leading-9 font-semibold text-black">
            Manage What To Do
          </h1>
          <p className="mt-4 max-w-76.75 text-xs leading-4.5 text-muted">
            The best way to manage what you have to do, don&apos;t forget your
            plans
          </p>
          <Link
            href="/home"
            className="mt-25 flex h-12 items-center justify-center bg-accent text-base leading-5 font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Get Started
          </Link>
        </section>
      </div>
    </main>
  );
}
