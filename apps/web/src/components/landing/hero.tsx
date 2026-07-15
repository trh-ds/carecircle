'use client';

import { motion } from 'framer-motion';
import { GithubIcon } from './icons';
import { BlurText } from '@/components/react-bits/blur-text';
import { StarBorder } from '@/components/react-bits/star-border';

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

          <BlurText
            text="Care doesn't have to fall on one person."
            delay={150}
            animateBy="words"
            direction="bottom"
            stepDuration={0.4}
            className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#fafafa] sm:text-6xl lg:text-7xl [&>span:nth-child(7)]:text-[#4d94ff] [&>span:nth-child(8)]:text-[#4d94ff] [&>span:nth-child(9)]:text-[#4d94ff]"
          />

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
            <StarBorder
              as="a"
              href="https://github.com/trh-ds/carecircle"
              color="#4d94ff"
              speed="5s"
              innerClassName="flex items-center gap-2 cursor-pointer hover:bg-[#111] transition-colors"
            >
              <GithubIcon />
              Self-host it
            </StarBorder>
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#050505] to-transparent" />
    </section>
  );
}