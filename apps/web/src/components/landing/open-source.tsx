'use client';

import { Section, FadeUp } from './motion';
import { ShieldIcon, GithubIcon } from './icons';
import { CountUp } from '@/components/react-bits/count-up';
import { StarBorder } from '@/components/react-bits/star-border';

const STATS = [
  { to: 3, label: 'AI agents', color: 'text-[#4d94ff]' },
  { to: 7, label: 'MVP features', color: 'text-[#3dd68c]' },
  { to: 1, label: 'docker-compose up', color: 'text-[#ff5757]' },
  { to: 0, label: 'vendor lock-in', color: 'text-[#fafafa]' },
] as const;

export function OpenSource() {
  return (
    <Section id="open" className="border-t border-white/[0.04]">
      <FadeUp className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-[#3dd68c]">
          <ShieldIcon />
        </div>
        <h2 className="mt-8 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[#fafafa] sm:text-4xl">
          Open source. Self-hosted. Yours.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[#888]">
          No vendor lock-in. No one else&apos;s server sees your family&apos;s data.
          Run it on your own hardware, or deploy to a $5 VPS. MIT licensed.
        </p>

        {/* Stats with CountUp */}
        <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-8 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${s.color}`}>
                <CountUp to={s.to} duration={1.5} />
              </div>
              <div className="mt-1 text-xs text-[#555]">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-center gap-4">
          <StarBorder
            as="a"
            href="https://github.com/trh-ds/carecircle"
            color="#3dd68c"
            speed="5s"
            innerClassName="flex items-center gap-2 cursor-pointer hover:bg-[#111] transition-colors"
          >
            <GithubIcon />
            View on GitHub
          </StarBorder>
        </div>
      </FadeUp>
    </Section>
  );
}