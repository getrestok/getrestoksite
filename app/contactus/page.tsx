"use client";

import { useState } from "react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot

  async function submit(e: any) {
    e.preventDefault();
    setOk("");
    setErr("");

    if (company.trim() !== "") {
      setOk("Thanks! Your message has been sent.");
      return;
    }

    if (!name) return setErr("Please enter your name.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setErr("Please enter a valid email.");
    if (!topic) return setErr("Please select a topic.");
    if (!message) return setErr("Please enter a message.");

    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, business, topic, message }),
      });

      if (!res.ok) throw new Error();

      setOk("Thanks! Your message has been sent.");
      setName("");
      setEmail("");
      setMessage("");
      setBusiness("");
      setTopic("");
    } catch {
      setErr("Failed to send message. Please try again.");
    }

    setLoading(false);
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-16">
      <div>
        <p className="text-slate-500">Restok Support</p>
        <h1 className="text-4xl font-bold mt-1">Contact Us</h1>
        <p className="text-slate-600 max-w-2xl mt-2">
          Have a question, feedback, or need help? Send us a message and we’ll get back to you.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-10">
        {/* FORM */}
        <div className="bg-white dark:bg-slate-800 border rounded-2xl p-6 shadow">
          <form onSubmit={submit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-sm">Your name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="font-medium text-sm">Email</label>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="font-medium text-sm">Business (optional)</label>
                <input
                  className="input"
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                />
              </div>

              <div>
                <label className="font-medium text-sm">Topic</label>
                <select
                  className="input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  <option value="">Select one…</option>
                  <option>General question</option>
                  <option>Billing / subscription</option>
                  <option>Technical issue</option>
                  <option>Feedback / feature request</option>
                  <option>Partnership / vendor</option>
                </select>
              </div>
            </div>

            <label className="font-medium text-sm block mt-4">Message</label>
            <textarea
              className="input min-h-[140px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {/* Honeypot */}
            <input
              className="hidden"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />

            <p className="text-xs text-slate-500 mt-2">
              Please don’t include sensitive information.
            </p>

            <div className="flex gap-3 mt-4">
              <button
                disabled={loading}
                className="bg-sky-600 text-white px-5 py-2 rounded-lg"
              >
                {loading ? "Sending…" : "Send message"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setName("");
                  setEmail("");
                  setMessage("");
                  setBusiness("");
                  setTopic("");
                  setErr("");
                  setOk("");
                }}
                className="border px-5 py-2 rounded-lg"
              >
                Clear
              </button>
            </div>

            {ok && (
              <div className="mt-3 text-green-600 text-sm bg-green-50 border border-green-300 p-3 rounded">
                {ok}
              </div>
            )}

            {err && (
              <div className="mt-3 text-red-600 text-sm bg-red-50 border border-red-300 p-3 rounded">
                {err}
              </div>
            )}
          </form>
        </div>

        {/* SIDEBAR */}
        <aside className="bg-white dark:bg-slate-800 border rounded-2xl p-6 shadow">
          <h2 className="font-semibold text-lg">Other ways to reach us</h2>

          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Email: <a className="text-sky-600" href="mailto:support@getrestok.com">support@getrestok.com</a>
          </p>

          <ul className="mt-4 space-y-4 text-sm">
            <li>
              <strong>Billing</strong>
              <p className="text-slate-500">Include the email used at checkout.</p>
            </li>

            <li>
              <strong>Bug reports</strong>
              <p className="text-slate-500">Tell us what you clicked & what happened.</p>
            </li>

            <li>
              <strong>Feature Requests</strong>
              <p className="text-slate-500">Tell us the problem you want solved.</p>
            </li>
          </ul>
        </aside>
      </div>
    </main>
  );
}

// Tailwind helper class if you want
// Add this somewhere global if you don't already have it
// .input { @apply w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-900; }