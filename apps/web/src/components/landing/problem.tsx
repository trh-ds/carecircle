'use client';

import { cn } from '@/lib/cn';
import { Section, FadeUp } from './motion';
import { PROBLEMS } from './constants';
import { COLOR_MAP, BORDER_COLOR_MAP } from './types';

export function Problem() {
  return (
    <Section id="problem">
      <FadeUp className="mb-16 text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[#ff5757]">
          The problem
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[#fafafa] sm:text-4xl">
          Sound familiar?
        </h2>
      </FadeUp>

      <div className="grid gap-6 md:grid-cols-3">
        {PROBLEMS.map((p) => (
          <FadeUp key={p.title}>
            <div
              className={cn(
                'group rounded-2xl border p-8 transition-colors duration-200',
                BORDER_COLOR_MAP[p.color],
                'bg-white/[0.01] hover:bg-white/[0.02]',
              )}
            >
              <div className={cn('mb-4', COLOR_MAP[p.color])}>
                <p.icon />
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-medium text-[#fafafa]">
                {p.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#888]">
                {p.body}
              </p>
            </div>
          </FadeUp>
        ))}
      </div>
    </Section>
  );
}
