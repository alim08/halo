import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-surface font-sans">
      {/* ── Fixed Top Nav ── */}
      <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-surface/80 px-8 py-4 backdrop-blur-md lg:px-16">
        <Link href="/" className="text-2xl font-black text-violet-600">
          Halo
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/discover"
            className="text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
          >
            Discover
          </Link>
          <Link
            href="/matches"
            className="text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
          >
            Matches
          </Link>
          <Link
            href="/profile"
            className="text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
          >
            Profile
          </Link>
        </div>

        <Link
          href="/register"
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Get Started
        </Link>
      </nav>

      {/* ── Hero Section ── */}
      <section className="mx-auto max-w-7xl px-8 pb-24 pt-32 lg:px-16 lg:pt-40">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left column */}
          <div>
            <span className="inline-block rounded-full bg-primary-container/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              A Values-First Connection Space
            </span>

            <h1 className="mt-6 text-5xl font-black leading-[1.05] tracking-tight text-on-surface lg:text-7xl">
              Dating with
              <br />
              Intent.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-on-surface-variant">
              Halo matches you on what truly matters — shared values, authentic
              conversation, and emotional compatibility. No swiping. Just real
              connection.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-on-primary shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[20px]">
                  arrow_forward
                </span>
                Get Started
              </Link>
              <Link
                href="/values"
                className="inline-flex items-center gap-2 rounded-xl border border-outline px-8 py-4 text-base font-semibold text-on-surface transition-colors hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">
                  favorite
                </span>
                Our Values
              </Link>
            </div>
          </div>

          {/* Right column — 2x2 image grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-primary via-primary-container to-secondary" />
            <div className="aspect-[4/5] translate-y-8 rounded-3xl bg-gradient-to-tr from-secondary-container via-primary-container to-primary" />
            <div className="aspect-[4/5] -translate-y-8 rounded-3xl bg-gradient-to-bl from-tertiary-container via-primary to-secondary" />
            <div className="aspect-[4/5] rounded-3xl bg-gradient-to-tl from-primary-container via-secondary to-primary" />
          </div>
        </div>
      </section>

      {/* ── Bento Safety Grid ── */}
      <section className="bg-surface-container-lowest py-24">
        <div className="mx-auto max-w-7xl px-8 lg:px-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-secondary">
            Trust &amp; Protection
          </p>
          <h2 className="mt-3 text-3xl font-black text-on-surface lg:text-5xl">
            Approach to Emotional Safety
          </h2>

          <div className="mt-14 grid gap-4 md:grid-cols-4">
            {/* Verified Identity — spans 2 cols */}
            <div className="flex flex-col justify-between rounded-3xl bg-surface-container p-8 md:col-span-2">
              <div>
                <span className="material-symbols-outlined mb-4 block text-[40px] text-primary">
                  verified_user
                </span>
                <h3 className="text-xl font-bold text-on-surface">
                  Verified Identity
                </h3>
                <p className="mt-2 max-w-sm leading-relaxed text-on-surface-variant">
                  Every member passes multi-step identity verification so you
                  always know who you are talking to.
                </p>
              </div>
            </div>

            {/* Proactive Boundaries */}
            <div className="flex flex-col justify-between rounded-3xl bg-surface-container p-8">
              <div>
                <span className="material-symbols-outlined mb-4 block text-[40px] text-primary">
                  shield
                </span>
                <h3 className="text-xl font-bold text-on-surface">
                  Proactive Boundaries
                </h3>
                <p className="mt-2 leading-relaxed text-on-surface-variant">
                  Set your comfort zones upfront. Halo respects and enforces
                  them automatically.
                </p>
              </div>
            </div>

            {/* Intentional Matching — primary bg */}
            <div className="flex flex-col justify-between rounded-3xl bg-primary p-8 text-on-primary">
              <div>
                <span className="material-symbols-outlined mb-4 block text-[40px] text-on-primary">
                  handshake
                </span>
                <h3 className="text-xl font-bold">Intentional Matching</h3>
                <p className="mt-2 leading-relaxed text-on-primary/80">
                  Algorithmic matching rooted in shared values, not superficial
                  metrics. Quality over quantity.
                </p>
              </div>
            </div>

            {/* Zero-Tolerance Safety */}
            <div className="flex flex-col justify-between rounded-3xl bg-surface-container p-8">
              <div>
                <span className="material-symbols-outlined mb-4 block text-[40px] text-primary">
                  gpp_good
                </span>
                <h3 className="text-xl font-bold text-on-surface">
                  Zero-Tolerance Safety
                </h3>
                <p className="mt-2 leading-relaxed text-on-surface-variant">
                  AI-powered moderation and instant reporting keep the
                  community safe around the clock.
                </p>
              </div>
            </div>

            {/* Editorial image placeholder — spans 2 cols */}
            <div className="flex items-end rounded-3xl bg-gradient-to-br from-primary-container via-secondary to-primary p-8 md:col-span-2 md:min-h-[240px]">
              <p className="text-lg font-semibold text-on-primary/90">
                Built with care, designed for trust.
              </p>
            </div>

            {/* Extra card to fill row */}
            <div className="flex flex-col justify-between rounded-3xl bg-surface-container p-8">
              <div>
                <span className="material-symbols-outlined mb-4 block text-[40px] text-primary">
                  visibility_off
                </span>
                <h3 className="text-xl font-bold text-on-surface">
                  Blind Profiles
                </h3>
                <p className="mt-2 leading-relaxed text-on-surface-variant">
                  Photos reveal gradually as conversations deepen. Substance
                  first.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-8 md:grid-cols-4 lg:px-16">
          {[
            { value: "10k+", label: "Values Explored" },
            { value: "85%", label: "Match Success" },
            { value: "100%", label: "Verified Members" },
            { value: "24/7", label: "Support" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-4xl font-black text-primary lg:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium text-on-surface-variant">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-outline-variant bg-surface px-8 py-12 lg:px-16">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <span className="text-2xl font-black text-violet-600">Halo</span>

          <div className="flex items-center gap-6 text-sm text-on-surface-variant">
            <Link href="/legal" className="hover:text-primary transition-colors">
              Legal
            </Link>
            <Link href="/help" className="hover:text-primary transition-colors">
              Help
            </Link>
            <Link
              href="/privacy"
              className="hover:text-primary transition-colors"
            >
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms
            </Link>
          </div>

          <p className="text-sm text-on-surface-variant">
            &copy; {new Date().getFullYear()} Halo. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
