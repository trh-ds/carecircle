import { Nav } from '@/components/landing/nav';
import { Hero } from '@/components/landing/hero';
import { Problem } from '@/components/landing/problem';
import { Features } from '@/components/landing/features';
import { Agents } from '@/components/landing/agents';
import { OpenSource } from '@/components/landing/open-source';
import { Footer } from '@/components/landing/footer';

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <Nav />
      <Hero />
      <Problem />
      <Features />
      <Agents />
      <OpenSource />
      <Footer />
    </div>
  );
}
