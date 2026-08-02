import { useState } from 'react';
import {
  ArrowUpRight,
  MapPin,
  Clock,
  Flame,
  Globe,
  Zap,
  HeartHandshake,
  Footprints,
  TrendingUp,
  Plane,
  Laptop,
  PiggyBank,
  Dumbbell,
  PartyPopper,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEPARTMENTS = ['All', 'Engineering', 'Authentication', 'Design', 'Operations', 'Marketing'];

const ROLES = [
  { id: 1, title: 'Senior Backend Engineer — Pricing Engine', dept: 'Engineering', location: 'New York, NY', type: 'Full-time', hot: true },
  { id: 2, title: 'Staff iOS Engineer', dept: 'Engineering', location: 'Remote (US)', type: 'Full-time', hot: false },
  { id: 3, title: 'Machine Learning Engineer — Fraud & Fakes', dept: 'Engineering', location: 'New York, NY', type: 'Full-time', hot: true },
  { id: 4, title: 'Lead Sneaker Authenticator', dept: 'Authentication', location: 'Jersey City, NJ', type: 'Full-time', hot: true },
  { id: 5, title: 'Authentication Specialist — Jordan & Nike', dept: 'Authentication', location: 'Los Angeles, CA', type: 'Full-time', hot: false },
  { id: 6, title: 'Authentication Specialist — New Balance & Asics', dept: 'Authentication', location: 'Jersey City, NJ', type: 'Full-time', hot: false },
  { id: 7, title: 'Senior Product Designer — Seller Experience', dept: 'Design', location: 'Remote (US)', type: 'Full-time', hot: false },
  { id: 8, title: 'Brand Designer — Drops & Campaigns', dept: 'Design', location: 'New York, NY', type: 'Full-time', hot: true },
  { id: 9, title: 'Warehouse Operations Manager', dept: 'Operations', location: 'Jersey City, NJ', type: 'Full-time', hot: false },
  { id: 10, title: 'Logistics Coordinator — International', dept: 'Operations', location: 'London, UK', type: 'Full-time', hot: false },
  { id: 11, title: 'Head of Community & Events', dept: 'Marketing', location: 'New York, NY', type: 'Full-time', hot: true },
  { id: 12, title: 'Social Media Lead — Drops Coverage', dept: 'Marketing', location: 'Los Angeles, CA', type: 'Full-time', hot: false },
];

const PERKS = [
  { icon: Footprints, title: 'Quarterly kick stipend', body: '$600 every quarter to spend on the marketplace. Yes, it stacks.' },
  { icon: Plane, title: 'Drop-day flexibility', body: 'Big release at 10am? Calendar blocks are sacred. Camp out guilt-free.' },
  { icon: PiggyBank, title: 'Equity for everyone', body: 'Every full-time hire gets ownership. The flip should pay you too.' },
  { icon: Laptop, title: 'Remote-first, lab optional', body: 'Work from anywhere in the US/UK, or post up at our NYC + LA studios.' },
  { icon: ShieldCheck, title: 'Full health coverage', body: '100% premiums covered — medical, dental, vision, and mental health.' },
  { icon: Dumbbell, title: 'Movement budget', body: '$150/month for gym, run club, skate sessions, whatever keeps you moving.' },
  { icon: PartyPopper, title: 'Annual SoleHouse Summit', body: 'The whole company, one city, three days. Last year: Tokyo during Air Max Day.' },
  { icon: HeartHandshake, title: 'Family-first leave', body: '20 weeks parental leave, fully paid. Plus baby’s first pair on us.' },
];

const VALUES = [
  {
    num: '01',
    title: 'Authenticity is the product',
    body: 'We verify 14,000 pairs a day by hand and by model. One fake through the door breaks trust we spent years earning. We obsess over every stitch, every box label, every data point.',
  },
  {
    num: '02',
    title: 'Move at drop speed',
    body: 'When a surprise shock-drop hits, traffic 40x’s in ninety seconds. We build, decide, and ship like the SNKRS calendar is watching — because it is.',
  },
  {
    num: '03',
    title: 'The culture comes first',
    body: 'We came from the line outside the store, the trade subreddits, the consignment counters. We build for the community we belong to, not just the metrics.',
  },
];

function Marquee() {
  const items = [
    'NOW HIRING', 'AUTHENTICATED IN-HAND', '14K PAIRS / DAY', 'NYC · LA · LDN · TYO',
    'NO FAKES, EVER', 'BUILT BY COLLECTORS', 'EST. 2019', 'WE BUY GRAILS',
  ];
  const row = [...items, ...items, ...items];
  return (
    <div className="overflow-hidden bg-[#D8FF3E] border-y-2 border-black py-3 select-none">
      <div className="marquee-track flex whitespace-nowrap">
        {row.map((t, i) => (
          <span key={i} className="mx-6 flex items-center gap-6 text-black font-bold tracking-[0.18em] text-sm">
            {t} <span className="inline-block w-2 h-2 bg-black rotate-45" />
          </span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [dept, setDept] = useState('All');
  const filtered = dept === 'All' ? ROLES : ROLES.filter((r) => r.dept === dept);

  return (
    <div className="min-h-screen bg-[#F2EFE6] text-black antialiased" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .display { font-family: 'Anton', sans-serif; letter-spacing: -0.01em; }
            .marquee-track { animation: marquee 28s linear infinite; }
            @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
            .grain::after {
              content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
              background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");
            }
            .role-row:hover .role-arrow { transform: translate(4px, -4px); }
            .role-row:hover { background: #000; color: #F2EFE6; }
            .role-row:hover .role-meta { color: #D8FF3E; }
            ::selection { background: #D8FF3E; color: #000; }
          `,
        }}
      />

      {/* NAV */}
      <header className="sticky top-0 z-50 bg-[#F2EFE6]/90 backdrop-blur-sm border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black flex items-center justify-center">
              <Footprints size={16} className="text-[#D8FF3E]" />
            </div>
            <span className="display text-xl tracking-wide">SOLEHOUSE</span>
            <span className="ml-2 text-xs font-bold bg-black text-[#D8FF3E] px-2 py-0.5">CAREERS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
            <a href="#roles" className="hover:underline underline-offset-4">Open roles</a>
            <a href="#culture" className="hover:underline underline-offset-4">Culture</a>
            <a href="#perks" className="hover:underline underline-offset-4">Perks</a>
            <a
              href="#roles"
              className="bg-black text-white px-4 py-2 flex items-center gap-1.5 hover:bg-[#D8FF3E] hover:text-black transition-colors border-2 border-black"
            >
              See {ROLES.length} jobs <ArrowUpRight size={16} />
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative grain border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-20">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] animate-pulse" />
              <span className="text-sm font-bold tracking-[0.2em]">{ROLES.length} OPEN ROLES · 4 CITIES + REMOTE</span>
            </div>
            <h1 className="display text-[15vw] md:text-[8.5rem] leading-[0.9] uppercase">
              Work where
              <br />
              the culture
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">trades.</span>
                <span className="absolute left-0 bottom-2 md:bottom-4 w-full h-[0.35em] bg-[#D8FF3E] -z-0" />
              </span>
            </h1>
            <div className="mt-10 grid md:grid-cols-12 gap-8 items-end">
              <p className="md:col-span-5 text-lg md:text-xl font-medium leading-relaxed">
                SoleHouse is the marketplace where 4.2 million collectors buy, sell, and authenticate the
                sneakers that matter. We're hiring engineers, authenticators, designers, and operators who
                live for drop day.
              </p>
              <div className="md:col-span-7 flex flex-wrap gap-3 md:justify-end">
                {['Engineering', 'Authentication', 'Design', 'Operations', 'Marketing'].map((d) => (
                  <a
                    key={d}
                    href="#roles"
                    onClick={() => setDept(d)}
                    className="border-2 border-black px-4 py-2 text-sm font-bold hover:bg-black hover:text-[#D8FF3E] transition-colors"
                  >
                    {d} ↗
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* hero image strip */}
        <div className="max-w-7xl mx-auto px-6 pb-16 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            'photo-1552346154-21d32810aba3',
            'photo-1600185365926-3a2ce3cdb9eb',
            'photo-1595950653106-6c9ebd614d3a',
            'photo-1556906781-9a412961c28c',
          ].map((id, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
              className={`relative border-2 border-black overflow-hidden ${i % 2 === 1 ? 'md:translate-y-6' : ''}`}
            >
              <img
                src={`https://images.unsplash.com/${id}?w=600&h=700&fit=crop`}
                alt="Sneakers at SoleHouse"
                className="w-full h-48 md:h-64 object-cover hover:scale-105 transition-transform duration-500"
              />
            </motion.div>
          ))}
        </div>
      </section>

      <Marquee />

      {/* STATS */}
      <section className="border-b-2 border-black bg-black text-[#F2EFE6]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
          {[
            { k: '$1.4B', v: 'GMV traded last year', icon: TrendingUp },
            { k: '14,000', v: 'Pairs authenticated daily', icon: ShieldCheck },
            { k: '312', v: 'Teammates worldwide', icon: Globe },
            { k: '90 sec', v: 'Avg. time to 40x traffic on a shock drop', icon: Zap },
          ].map((s, i) => (
            <div key={s.k} className={`p-8 ${i !== 3 ? 'md:border-r-2' : ''} ${i < 2 ? 'border-b-2 md:border-b-0' : ''} border-[#F2EFE6]/20`}>
              <s.icon size={20} className="text-[#D8FF3E] mb-4" />
              <div className="display text-4xl md:text-5xl text-[#D8FF3E]">{s.k}</div>
              <div className="mt-2 text-sm text-[#F2EFE6]/70 font-medium">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* VALUES */}
      <section id="culture" className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-12">
            <h2 className="display text-5xl md:text-7xl uppercase leading-none">
              How we<br />operate
            </h2>
            <span className="hidden md:block text-sm font-bold tracking-[0.2em] text-black/50">THE HOUSE RULES</span>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-black border-2 border-black">
            {VALUES.map((v) => (
              <div key={v.num} className="bg-[#F2EFE6] p-8 group hover:bg-[#D8FF3E] transition-colors duration-300">
                <div className="display text-6xl text-black/15 group-hover:text-black/30 transition-colors">{v.num}</div>
                <h3 className="mt-6 text-xl font-bold">{v.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-black/70 group-hover:text-black/80">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OPEN ROLES */}
      <section id="roles" className="border-b-2 border-black scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <h2 className="display text-5xl md:text-7xl uppercase leading-none">
              Open<br />roles
            </h2>
            <div className="flex flex-wrap gap-2">
              {DEPARTMENTS.map((d) => {
                const count = d === 'All' ? ROLES.length : ROLES.filter((r) => r.dept === d).length;
                const active = dept === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDept(d)}
                    className={`px-4 py-2 text-sm font-bold border-2 border-black transition-colors ${
                      active ? 'bg-black text-[#D8FF3E]' : 'bg-transparent hover:bg-[#D8FF3E]'
                    }`}
                  >
                    {d} <span className={active ? 'text-[#D8FF3E]/70' : 'text-black/40'}>({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-2 border-black divide-y-2 divide-black bg-[#F2EFE6]">
            <AnimatePresence mode="popLayout">
              {filtered.map((r) => (
                <motion.a
                  layout
                  key={r.id}
                  href="#"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="role-row group flex items-center justify-between gap-4 px-6 py-5 transition-colors duration-200"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg md:text-xl truncate">{r.title}</h3>
                      {r.hot && (
                        <span className="hidden sm:flex items-center gap-1 text-[11px] font-bold bg-[#FF4D00] text-white px-2 py-0.5 shrink-0">
                          <Flame size={11} /> URGENT
                        </span>
                      )}
                    </div>
                    <div className="role-meta mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium text-black/60 transition-colors">
                      <span className="flex items-center gap-1.5"><Zap size={13} /> {r.dept}</span>
                      <span className="flex items-center gap-1.5"><MapPin size={13} /> {r.location}</span>
                      <span className="flex items-center gap-1.5"><Clock size={13} /> {r.type}</span>
                    </div>
                  </div>
                  <ArrowUpRight size={28} className="role-arrow shrink-0 transition-transform duration-200" />
                </motion.a>
              ))}
            </AnimatePresence>
          </div>

          <p className="mt-6 text-sm font-medium text-black/60">
            Don't see your lane? Email <span className="font-bold underline underline-offset-2">talent@solehouse.com</span> with
            your portfolio and the grail you'd never sell.
          </p>
        </div>
      </section>

      {/* PERKS */}
      <section id="perks" className="border-b-2 border-black bg-black text-[#F2EFE6]">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-12">
            <h2 className="display text-5xl md:text-7xl uppercase leading-none text-[#D8FF3E]">
              The<br />package
            </h2>
            <span className="hidden md:block text-sm font-bold tracking-[0.2em] text-[#F2EFE6]/40">BENEFITS &amp; PERKS</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#F2EFE6]/20 border border-[#F2EFE6]/20">
            {PERKS.map((p) => (
              <div key={p.title} className="bg-black p-7 hover:bg-[#111] transition-colors">
                <p.icon size={22} className="text-[#D8FF3E]" />
                <h3 className="mt-5 font-bold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#F2EFE6]/60">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="grain relative">
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          <h2 className="display uppercase text-[12vw] md:text-8xl leading-[0.92]">
            Stop reselling<br />
            on the side.<br />
            <span className="bg-[#D8FF3E] px-3">Do it for a living.</span>
          </h2>
          <a
            href="#roles"
            className="mt-12 inline-flex items-center gap-2 bg-black text-white border-2 border-black px-8 py-4 text-lg font-bold hover:bg-[#D8FF3E] hover:text-black transition-colors"
          >
            Browse all {ROLES.length} roles <ArrowUpRight size={20} />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t-2 border-black">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black flex items-center justify-center">
              <Footprints size={13} className="text-[#D8FF3E]" />
            </div>
            <span className="display tracking-wide">SOLEHOUSE</span>
            <span className="text-black/50">© 2025</span>
          </div>
          <div className="flex gap-6 text-black/60">
            <a href="#" className="hover:text-black">Marketplace</a>
            <a href="#" className="hover:text-black">Authentication</a>
            <a href="#" className="hover:text-black">Instagram</a>
            <a href="#" className="hover:text-black">Equal opportunity</a>
          </div>
        </div>
      </footer>
    </div>
  );
}