import Image from "next/image";

export default function Home() {
  return (
    <main className="antialiased text-slate-800 bg-white">
      {/* NAV */}
      <header className="border-b py-4">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          <a className="flex items-center gap-3" href="#">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white font-semibold">
              SP
            </div>
            <div>
              <div className="font-semibold">StockPilot</div>
              <div className="text-xs text-slate-500 -mt-1">Smart restock reminders</div>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="/login" className="text-sky-600 font-medium">Log in</a>
            <a
              href="/signup"
              className="ml-2 inline-block bg-sky-600 text-white px-4 py-2 rounded-lg shadow"
            >
              Get Started
            </a>
          </nav>

          <div className="md:hidden">
            <button aria-label="menu" className="p-2 text-2xl">☰</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Text */}
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Never run out of supplies again.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              StockPilot tracks your recurring business supplies and reminds the right people 
              when it's time to reorder — before you run out.
            </p>

            <div className="mt-6 flex gap-3">
              <a href="/signup" className="bg-sky-600 text-white px-5 py-3 rounded-lg shadow hover:opacity-95">
                Get Started
              </a>
              <a href="#pricing" className="px-5 py-3 rounded-lg border border-slate-200">
                Pricing
              </a>
            </div>

            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
              <li>✅ Email & SMS reminders</li>
              <li>✅ Team access & multi-location</li>
              <li>✅ Smart prediction system</li>
              <li>✅ CSV export & analytics</li>
            </ul>
          </div>

          {/* Dashboard mockup */}
          <div className="rounded-2xl p-6 bg-[radial-gradient(circle,rgba(26,115,232,0.06)_0%,transparent_60%)]">
            <div className="bg-white rounded-xl shadow-lg p-4 max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">Warehouse</div>
                  <div className="font-semibold">Office Supplies</div>
                </div>
                <div className="text-xs text-slate-400">Updated 2h ago</div>
              </div>

              {/* item bars */}
              <div className="mt-4">
                <ItemBar label="Paper Towels" status="Low — 2 days" percent={20} color="bg-amber-400" />
                <ItemBar label="Printer Toner" status="OK — 21 days" percent={60} color="bg-green-400" />
                <ItemBar label="Hand Soap" status="Due — today" percent={10} color="bg-red-400" />
              </div>

              <div className="mt-4 flex justify-between items-center text-sm">
                <div className="text-slate-500">Next: Paper Towels</div>
                <button className="bg-sky-600 text-white px-3 py-1 rounded">Reorder</button>
              </div>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section id="how" className="mt-16">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            <Step num="1" title="Add items" desc="Add the supplies your business uses regularly." />
            <Step num="2" title="Set cadence" desc="Tell StockPilot how long each item lasts, or let it learn." />
            <Step num="3" title="Get reminded" desc="Receive automatic reminders before anything runs out." />
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="mt-16">
          <h2 className="text-2xl font-semibold">Features</h2>
          <p className="mt-2 text-slate-600">Built for teams who want simplicity and reliability.</p>

          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Feature title="Automatic Restock Alerts" desc="Daily checks and reminders before an item runs out." />
            <Feature title="Smart Predictions" desc="Usage-based predictions for reorder timing." />
            <Feature title="Team Access" desc="Invite staff and collaborate across your organization." />
            <Feature title="Supplier Tracking" desc="Keep supplier info next to every item." />
            <Feature title="Multi-location" desc="Manage multiple business locations easily." />
            <Feature title="Reports & Export" desc="CSV exports and light analytics." />
          </div>
        </section>

        {/* BEFORE & AFTER */}
        <section className="mt-16 bg-slate-50 p-8 rounded-lg">
          <h2 className="text-2xl font-semibold">Before & After</h2>

          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <Card title="Before StockPilot" items={["Missed orders & last-minute rush", "Spreadsheets that get out of date", "Lost time tracking suppliers"]} />
            <Card title="After StockPilot" items={["Automated reminders before items run out", "Centralized cadence data", "Faster reorders and less waste"]} />
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="mt-16">
          <h2 className="text-2xl font-semibold">Pricing</h2>
          <p className="mt-2 text-slate-600">One simple paid plan. No free tiers.</p>

          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <PriceCard
              label="Standard"
              price="$9/mo"
              desc="Unlimited items • SMS & Push • Team Access"
              button={{ label: "Subscribe", href: "/signup", primary: true }}
            />
            <PriceCard
              label="Business"
              price="Custom"
              desc="Multi-location • Dedicated support"
              button={{ label: "Contact Sales", href: "/contact" }}
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 text-center py-10 bg-gradient-to-r from-sky-50 to-white rounded-lg">
          <h3 className="text-2xl font-semibold">Stop guessing when to reorder.</h3>
          <p className="mt-2 text-slate-600">Let StockPilot watch your supplies so you can focus on running your business.</p>
          <div className="mt-4">
            <a href="/signup" className="bg-sky-600 text-white px-6 py-3 rounded-lg">
              Subscribe Now
            </a>
          </div>
        </section>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-8 mt-16">
        <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-3 gap-6 text-sm text-slate-600">
          <div>
            <div className="font-semibold">StockPilot</div>
            <div className="mt-2">Smart restock reminders for small businesses.</div>
          </div>

          <div>
            <div className="font-semibold">Product</div>
            <ul className="mt-2 space-y-2">
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold">Company</div>
            <ul className="mt-2 space-y-2">
              <li><a href="#">About</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 mt-8 text-center text-xs text-slate-400">
          © 2025 StockPilot — Built with care.
        </div>
      </footer>
    </main>
  );
}

/* ------------------------------
   SMALL COMPONENTS
------------------------------ */

function ItemBar({ label, status, percent, color }: any) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>{label}</div>
        <div className="font-medium text-slate-800">{status}</div>
      </div>
      <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-2 ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

function Step({ num, title, desc }: any) {
  return (
    <div className="p-6 rounded-lg border">
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
    <div className="p-6 rounded-lg border">
      <div className="font-semibold">{title}</div>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </div>
  );
}

function Card({ title, items }: any) {
  return (
    <div className="p-6 rounded border bg-white">
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
    <div className="p-6 rounded-lg border text-center shadow-lg">
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
    </div>
  );
}
