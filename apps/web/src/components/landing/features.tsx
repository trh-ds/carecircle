'use client';

import { cn } from '@/lib/cn';
import { Section, FadeUp } from './motion';
import { FEATURES } from './constants';
import { BORDER_COLOR_MAP } from './types';

export function Features() {
  return (
    <Section id="features" className="border-t border-white/[0.04]">
      <FadeUp className="mb-16 text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#4d94ff]">
          What it does
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[#fafafa] sm:text-4xl">
          Coordination, not diagnosis
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[#888]">
          Everything a family needs to stay on the same page. Built for the people doing the work — not a replacement for doctors.
        </p>
      </FadeUp>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <FadeUp key={f.label}>
            <div
              className={cn(
                'rounded-xl border p-6 transition-colors duration-200',
                BORDER_COLOR_MAP[f.color],
                'bg-white/[0.01] hover:bg-white/[0.02]',
              )}
            >
              <h4 className="font-[family-name:var(--font-display)] text-base font-medium text-[#fafafa]">
                {f.label}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-[#888]">
                {f.desc}
              </p>
            </div>
          </FadeUp>
        ))}
      </div>
    </Section>
  );
}
