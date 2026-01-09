"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";


// Simple scroll reveal wrapper
const Reveal = ({ children, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.5, delay }}
  >
    {children}
  </motion.div>
);

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const [appRedirecting, setAppRedirecting] = useState(false);

  useEffect(() => {
    // Detect Appilix wrapper by user agent and redirect into the app flow
    if (typeof navigator === "undefined") return;

    const ua = navigator.userAgent || "";
    const isAppilix = /\bappilix\b/i.test(ua) || /App\{.*?\}/.test(ua);
    if (!isAppilix) return;

    setAppRedirecting(true);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/dashboard");
      else router.replace("/login");
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // If the site is running as a homescreen/standalone app, redirect away from the marketing homepage
    if (typeof navigator === "undefined") return;

    try {
      const inStandalone = (window.navigator as any)?.standalone || window.matchMedia('(display-mode: standalone)').matches;
      if (!inStandalone) return;

      setAppRedirecting(true);
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) router.replace("/dashboard");
        else router.replace("/login");
      });

      return () => unsub();
    } catch (e) {
      // noop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  
  return (
    <main className="antialiased text-slate-800 bg-white">

      {appRedirecting && (
        <div className="fixed inset-0 z-50 bg-white/95 dark:bg-black/90 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-sky-600 border-t-transparent animate-spin" />
            <div className="text-sm text-slate-700 dark:text-slate-200">Opening app…</div>
          </div>
        </div>
      )}

      

      {/* NAV */}
      <motion.header
        className="border-b py-4 sticky top-0 bg-white/90 z-50 dark:bg-slate-900/90 backdrop-blur"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          

          <a href="/" className="flex items-center gap-3">
  <Image
    src="/logo.svg"
    alt="Restok logo"
    width={40}
    height={40}
    className="shrink-0"
    priority
  />

  <div>
    <div className="font-semibold text-slate-900 dark:text-white">
      Restok
    </div>
            <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 -mt-1">
              Your office, always stocked.
            </div>
  </div>
</a>

          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden text-2xl"
            aria-label="Open menu"
          >
            ☰
          </button>

          <nav className="hidden md:flex items-center gap-3 text-sm">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="/terms" className="hover:text-slate-900">Terms</a>
            <a href="/login" className="text-sky-600 font-medium">Log in</a>
            <a
              href="/signup"
              className="ml-2 inline-block bg-sky-600 text-white px-4 py-2 rounded-lg shadow"
            >
              Get Started
            </a>
          </nav>
        </div>
      </motion.header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <motion.div
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute top-0 left-0 right-0 bg-white dark:bg-slate-900 p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center gap-3">
                <Image src="/logo.svg" alt="Restok logo" width={36} height={36} className="shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Restok</div>
                </div>
              </a>

              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="text-2xl"
              >
                ✕
              </button>
            </div>

            <nav className="mt-6 flex flex-col gap-3 text-lg">
              <a href="#features" className="block py-2">Features</a>
              <a href="#how" className="block py-2">How it works</a>
              <a href="#pricing" className="block py-2">Pricing</a>
              <a href="/terms" className="block py-2">Terms</a>
              <a href="/login" className="block py-2 text-sky-600">Log in</a>
              <a href="/signup" className="block py-3 bg-sky-600 text-white text-center rounded-lg">Get Started</a>
            </nav>
          </motion.div>
        </div>
      )}

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid md:grid-cols-2 gap-10 items-center">

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Never forget to reorder the things your business depends on.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Restok helps small businesses keep track of anything they reorder regularly - using the vendors they already trust.
            </p>

            <div className="mt-6 flex gap-3">
              <motion.a
                href="/signup"
                whileHover={{ scale: 1.05 }}
                className="bg-sky-600 text-white px-5 py-3 rounded-lg shadow"
              >
                Get Started
              </motion.a>

              <motion.a
                href="#pricing"
                whileHover={{ scale: 1.05 }}
                className="px-5 py-3 rounded-lg border border-slate-200"
              >
                Pricing
              </motion.a>
            </div>

            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
              <li>✅ Email reminders</li>
              <li>✅ Team access & multi-location</li>
              <li>✅ Smart prediction system</li>
              <li>✅ CSV export & analytics</li>
            </ul>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-lg p-4 w-full max-w-md"
          >
            <DashboardMockup />
          </motion.div>

        </div>

        {/* HOW IT WORKS */}
        <section id="how" className="mt-16">
          <Reveal>
            <h2 className="text-2xl font-semibold">How it works</h2>
          </Reveal>

          <div className="mt-6 grid md:grid-cols-3 gap-6">
            <Reveal delay={0.1}><Step num="1" title="Add items" desc="Add the supplies your business uses regularly." /></Reveal>
            <Reveal delay={0.2}><Step num="2" title="Set cadence" desc="Tell Restok how long each item lasts, or let it learn." /></Reveal>
            <Reveal delay={0.3}><Step num="3" title="Get reminded" desc="Receive automatic reminders before anything runs out." /></Reveal>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="mt-16">
          <Reveal>
            <h2 className="text-2xl font-semibold">Features</h2>
            <p className="mt-2 text-slate-600">Built for teams who want simplicity and reliability.</p>
          </Reveal>

          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              ["Automatic Restock Alerts", "Daily checks and reminders before an item runs out."],
              ["Smart Predictions", "Usage-based predictions for reorder timing."],
              ["Team Access", "Invite staff and collaborate across your organization."],
              ["Supplier Tracking", "Keep supplier info next to every item."],
              ["Multi-location", "Manage multiple business locations easily."],
              ["Reports & Export", "CSV exports and light analytics."],
            ].map(([title, desc], i) => (
              <Reveal key={i} delay={i * 0.1}>
                <Feature title={title} desc={desc} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* BEFORE/AFTER */}
        <section className="mt-16 bg-slate-50 p-8 rounded-lg">
          <Reveal><h2 className="text-2xl font-semibold">Before & After</h2></Reveal>

          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <Reveal delay={0.1}><Card title="Before Restok" items={["Missed orders & last-minute rush", "Spreadsheets that get out of date", "Lost time tracking suppliers"]} /></Reveal>
            <Reveal delay={0.2}><Card title="After Restok" items={["Automated reminders before items run out", "Centralized cadence data", "Faster reorders and less waste"]} /></Reveal>
          </div>
        </section>

      {/* PRICING */}
<section id="pricing" className="mt-20">
  <Reveal>
    <h2 className="text-3xl font-bold text-center">Simple, transparent pricing</h2>
    <p className="mt-3 text-center text-slate-600 max-w-xl mx-auto">
      Choose the plan that fits your business today — upgrade anytime.
    </p>
  </Reveal>

  <div className="mt-12 grid gap-6 md:grid-cols-3">

    {/* BASIC */}
    <PricingTier
      name="Basic"
      price="$5.99"
      subtext="per month • $65 billed yearly ($5.42/mo)"
      features={[
        "Up to 5 items",
        "1 user",
        "1 location",
        "Email alerts",
        "Basic reports",
      ]}
      cta="Get Started"
      href="/signup?plan=basic"
    />

    {/* PRO (HIGHLIGHTED) */}
    <PricingTier
      name="Pro"
      price="$19"
      subtext="per month • $192 billed yearly ($16/mo)"
      features={[
        "10 items",
        "2 users",
        "2 locations",
        "Improved reports and metrics",
      ]}
      cta="Subscribe"
      href="/signup?plan=pro"
      featured
    />

    {/* PREMIUM */}
    <PricingTier
      name="Premium"
      price="$39"
      subtext="per month • $396 billed yearly ($33/mo)"
      features={[
        "Unlimited items",
        "Unlimited users",
        "Unlimited locations",
        "SMS Alerts",
        "Advanced reports and metrics",
        "Priority onboarding and support",
      ]}
      cta="Subscribe"
      href="/signup?plan=premium"
    />
  </div>

  {/* ENTERPRISE */}
  <div className="mt-10 max-w-3xl mx-auto">
    <div className="border rounded-xl p-6 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold">Enterprise</h3>
        <p className="text-sm text-slate-600 mt-1">
          Custom pricing, unlimited locations, dedicated support.
        </p>
      </div>
      <a
        href="/"
        className="px-5 py-2 rounded-lg border bg-white hover:bg-slate-100"
      >
        Coming soon! ETA Q1 2026
      </a>
    </div>
  </div>
</section>

        {/* CTA */}
        <Reveal>
          <section className="mt-16 text-center py-10 bg-gradient-to-r from-sky-50 to-white rounded-lg">
            <h3 className="text-2xl font-semibold">Stop guessing when to reorder.</h3>
            <p className="mt-2 text-slate-600">
              Let Restok watch your supplies so you can focus on running your business.
            </p>
            <div className="mt-4">
              <a href="/signup" className="bg-sky-600 text-white px-6 py-3 rounded-lg">
                Subscribe Now
              </a>
            </div>
          </section>
        </Reveal>
      </section>

      {/* FOOTER */}
      <Reveal>
        <footer className="border-t py-8 mt-16">
          <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-3 gap-6 text-sm text-slate-600">
            <div>
              <div className="font-semibold">Restok</div>
              <div className="mt-2">Smart restock reminders for small businesses.</div>
            </div>
            <div>
              <div className="font-semibold">Product</div>
              <ul className="mt-2 space-y-2">
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="/terms">Terms and Policies</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold">Company</div>
              <ul className="mt-2 space-y-2">
                <li><a href="/about">About</a></li>
                <li><a href="/contact-us">Contact Us</a></li>
              </ul>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-6 mt-8 text-center text-xs text-slate-400">
            © 2026 <a href="https://www.issioffice.com">Inner Space Systems Inc.</a> — All rights reserved 
          </div>
        </footer>
      </Reveal>
    </main>
  );
}

/* -------------------------------------------------------
   SUB-COMPONENTS  
------------------------------------------------------- */

function DashboardMockup() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">Warehouse</div>
          <div className="font-semibold">Office Supplies</div>
        </div>
        <div className="text-xs text-slate-400">Updated 2h ago</div>
      </div>

      {/* Items */}
      <ItemBar label="Paper Towels" status="Low — 2 days" percent={20} color="bg-amber-400" />
      <ItemBar label="Printer Toner" status="OK — 21 days" percent={60} color="bg-green-400" />
      <ItemBar label="Hand Soap" status="Due — today" percent={10} color="bg-red-400" />

      <div className="mt-4 flex justify-between items-center text-sm">
        <div className="text-slate-500">Next: Paper Towels</div>
        <button className="bg-sky-600 text-white px-3 py-1 rounded">Reorder</button>
      </div>
    </>
  );
}

function PricingTier({
  name,
  price,
  subtext,
  features,
  cta,
  href,
  featured = false,
}: any) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`rounded-2xl border p-8 shadow-sm bg-white flex flex-col ${
        featured
          ? "border-sky-500 ring-2 ring-sky-100"
          : "border-slate-200"
      }`}
    >
      {featured && (
        <span className="mb-3 inline-block text-xs font-semibold text-sky-600 bg-sky-50 px-3 py-1 rounded-full self-start">
          Most Popular
        </span>
      )}

      <h3 className="text-xl font-semibold">{name}</h3>

      <div className="mt-4">
        <span className="text-4xl font-extrabold">{price}</span>
        <span className="text-slate-500 ml-1">/mo</span>
      </div>

      <p className="mt-1 text-sm text-slate-500">{subtext}</p>

      <ul className="mt-6 space-y-3 text-sm text-slate-600">
        {features.map((f: string, i: number) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-sky-600">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <a
        href={href}
        className={`mt-8 inline-block text-center px-5 py-3 rounded-lg font-medium ${
          featured
            ? "bg-sky-600 text-white hover:bg-sky-700"
            : "bg-slate-100 text-slate-800 hover:bg-slate-200"
        }`}
      >
        {cta}
      </a>
    </motion.div>
  );
}

function ItemBar({ label, status, percent, color }: any) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>{label}</div>
        <div className="font-medium text-slate-800">{status}</div>
      </div>
      <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-2 ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function Step({ num, title, desc }: any) {
  return (
    <div className="p-6 rounded-lg border bg-white shadow-sm">
      <div className="w-12 h-12 rounded-md bg-sky-50 flex items-center justify-center text-sky-600 font-semibold">
        {num}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </div>
  );
}

function Feature({ title, desc }: any) {
  return (
    <div className="p-6 rounded-lg border bg-white shadow-sm hover:shadow-md transition">
      <div className="font-semibold">{title}</div>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </div>
  );
}

function Card({ title, items }: any) {
  return (
    <div className="p-6 rounded border bg-white shadow-sm">
      <h4 className="font-semibold">{title}</h4>
      <ul className="mt-3 text-sm text-slate-600 space-y-2">
        {items.map((i: string, idx: number) => (
          <li key={idx}>• {i}</li>
        ))}
      </ul>
    </div>
  );
}

function PriceCard({ label, price, desc, button }: any) {
  return (
    <motion.div
      className="p-6 rounded-lg border text-center shadow-sm bg-white"
      whileHover={{ scale: 1.03 }}
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-extrabold">{price}</div>
      <div className="mt-2 text-sm text-slate-600">{desc}</div>

      <a
        href={button.href}
        className={`mt-4 inline-block px-4 py-2 rounded ${
          button.primary
            ? "bg-sky-600 text-white"
            : "bg-slate-100 text-slate-700"
        }`}
      >
        {button.label}
      </a>
    </motion.div>
  );
}
