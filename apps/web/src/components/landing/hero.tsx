'use client';

import { motion } from 'framer-motion';
import { GithubIcon } from './icons';

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center px-6 pt-16">
      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#3dd68c]" />
            <span className="text-xs text-[#888]">Open source & self-hosted</span>
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#fafafa] sm:text-6xl lg:text-7xl">
            Care doesn&apos;t have to fall on{' '}
            <span className="text-[#4d94ff]">one person</span>.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#888] sm:text-xl">
            An open-source platform that helps distributed families coordinate care.
            AI agents handle the remembering, the flagging, and the summarizing —
            so the person who always carried it can finally breathe.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#features"
              className="inline-flex h-12 items-center rounded-xl bg-[#fafafa] px-8 text-sm font-medium text-[#050505] transition-all duration-150 hover:bg-white/90 active:scale-[0.97]"
            >
              See how it works
            </a>
            <a
              href="https://github.com/trh-ds/carecircle"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/[0.08] px-8 text-sm font-medium text-[#ccc] transition-all duration-150 hover:border-white/[0.15] hover:text-[#fafafa] active:scale-[0.97]"
            >
              <GithubIcon />
              Self-host it
            </a>
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#050505] to-transparent" />
    </section>
  );
}
