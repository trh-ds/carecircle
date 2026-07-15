'use client';

import { GithubIcon } from './icons';
import { NAV_ITEMS } from './constants';

export function Nav() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/[0.04] bg-[#050505]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[#fafafa]">
          carecircle
        </span>
        <div className="hidden items-center gap-8 sm:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-[#888] transition-colors duration-150 hover:text-[#fafafa]"
            >
              {item.label}
            </a>
          ))}
        </div>
        <a
          href="https://github.com/trh-ds/carecircle"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border border-white/[0.08] px-4 py-2 text-sm text-[#aaa] transition-all duration-150 hover:border-white/[0.15] hover:text-[#fafafa] active:scale-[0.97]"
        >
          <GithubIcon />
          <span className="hidden sm:inline">GitHub</span>
        </a>
      </div>
    </nav>
  );
}
