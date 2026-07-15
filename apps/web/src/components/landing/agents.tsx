'use client';

import { cn } from '@/lib/cn';
import { Section, FadeUp } from './motion';
import { AGENTS } from './constants';
import { COLOR_MAP, BORDER_COLOR_MAP, GLOW_MAP } from './types';
import { SparkleIcon } from './icons';

export function Agents() {
  return (
    <Section id="agents" className="border-t border-white/[0.04]">
      <FadeUp className="mb-16 text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#3dd68c]">
          AI that helps
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[#fafafa] sm:text-4xl">
          Agents that do the remembering
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[#888]">
          Three specialized AI agents run on your own infrastructure. They structure, flag, and summarize — never diagnose. Every health-adjacent suggestion points back to a real doctor.
        </p>
      </FadeUp>

      <div className="grid gap-6 md:grid-cols-3">
        {AGENTS.map((a) => (
          <FadeUp key={a.title}>
            <div
              className={cn(
                'group relative rounded-2xl border p-8 transition-all duration-200',
                BORDER_COLOR_MAP[a.color],
                'bg-white/[0.01] hover:bg-white/[0.02]',
                GLOW_MAP[a.color],
              )}
            >
              <div className="mb-5 flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border bg-white/[0.02]', BORDER_COLOR_MAP[a.color], COLOR_MAP[a.color])}>
                  <SparkleIcon />
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-medium text-[#fafafa]">
                  {a.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[#888]">
                {a.desc}
              </p>
            </div>
          </FadeUp>
        ))}
      </div>
    </Section>
  );
}
