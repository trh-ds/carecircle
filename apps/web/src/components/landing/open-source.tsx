'use client';

import { Section, FadeUp } from './motion';
import { ShieldIcon, GithubIcon } from './icons';

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
        <div className="mt-8 flex items-center justify-center gap-4">
          <a
            href="https://github.com/trh-ds/carecircle"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#fafafa] px-8 text-sm font-medium text-[#050505] transition-all duration-150 hover:bg-white/90 active:scale-[0.97]"
          >
            <GithubIcon />
            View on GitHub
          </a>
        </div>
      </FadeUp>
    </Section>
  );
}
