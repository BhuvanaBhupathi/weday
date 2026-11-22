'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Network,
  Code2,
  GitBranch,
  X,
  Radio,
  CheckCircle2,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react';
import ParticleDrift from '../components/ui/particle-drift';
import DecryptedText from '../components/ui/decrypted-text';
import ScrollReveal from '../components/ui/scroll-reveal';
import { api } from '../lib/api';

const ROTATING_WORDS = [
  { text: 'plan', duration: 2600 },
  { text: 'visualise', duration: 2000 },
  { text: 'edit', duration: 2000 },
  { text: 'deliver', duration: 2000 },
];

export default function LandingPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [wordIndex, setWordIndex] = useState(0);
  const [user, setUser] = useState<any | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isDevLoginOpen, setIsDevLoginOpen] = useState(false);
  const [devUsername, setDevUsername] = useState('friday-admin');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const current = ROTATING_WORDS[wordIndex];
    const timer = setTimeout(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, current.duration);

    return () => clearTimeout(timer);
  }, [wordIndex]);

  useEffect(() => {
    const saved = localStorage.getItem('friday-theme') as 'dark' | 'light' | null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    checkAuth();
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('friday-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  async function checkAuth() {
    try {
      const me = await api.get('/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    }
  }

  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await api.post('/auth/dev-login', { username: devUsername });
      setUser(res.user);
      setIsDevLoginOpen(false);
      window.location.href = '/workspace';
    } catch (err: any) {
      alert(`Login failed: ${err.message}`);
    } finally {
      setLoggingIn(false);
    }
  }

  const isDark = theme === 'dark';

  return (
    <div
      className={`relative min-h-screen w-full font-sans overflow-x-hidden flex flex-col justify-between select-none transition-colors duration-500 ${
        isDark ? 'bg-[#030307] text-white' : 'bg-[#FAF9FF] text-[#09090D]'
      }`}
    >
      {/* 1. Full Page Particle Drift Background */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <ParticleDrift
          mode={theme}
          className={`w-full h-full transition-opacity duration-500 ${
            isDark ? 'opacity-85' : 'opacity-90'
          }`}
        />
      </div>

      {/* Subtle Ambient Vignette & Gradient Overlays */}
      <div
        className={`absolute inset-0 pointer-events-none z-10 transition-all duration-500 ${
          isDark
            ? 'bg-gradient-to-t from-[#030307] via-transparent to-transparent opacity-80'
            : 'bg-gradient-to-t from-[#FAF9FF] via-transparent to-transparent opacity-70'
        }`}
      />
      <div
        className={`absolute inset-0 pointer-events-none z-10 transition-all duration-500 ${
          isDark
            ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#030307]/30 to-[#030307]'
            : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#FAF9FF]/40 to-[#FAF9FF]'
        }`}
      />

      {/* 2. Navbar at Top */}
      <header className="relative z-30 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        {/* Logo: "fri" in Inconsolata Black 900 */}
        <Link href="/" className="group flex items-center space-x-1.5 focus:outline-none">
          <span
            className={`font-inconsolata font-black text-3xl tracking-tighter transition-colors ${
              isDark
                ? 'text-white group-hover:text-[#C4B5FD]'
                : 'text-[#09090D] group-hover:text-[#7C3AED]'
            }`}
          >
            WE
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full animate-pulse transition-colors ${
              isDark
                ? 'bg-[#C4B5FD] shadow-[0_0_8px_#C4B5FD]'
                : 'bg-[#7C3AED] shadow-[0_0_8px_#7C3AED]'
            }`}
          />
        </Link>

        {/* Navigation Links: home, about, login */}
        <nav className="flex items-center space-x-8 text-sm font-semibold">
          <Link
            href="/"
            className={`transition-colors tracking-wide ${
              isDark
                ? 'text-white hover:text-[#C4B5FD]'
                : 'text-[#09090D] hover:text-[#7C3AED]'
            }`}
          >
            home
          </Link>
          <button
            onClick={() => setIsAboutOpen(true)}
            className={`transition-colors tracking-wide focus:outline-none ${
              isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-[#09090D]'
            }`}
          >
            about
          </button>
          {user ? (
            <Link
              href="/workspace"
              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all ${
                isDark
                  ? 'bg-[#C4B5FD]/15 text-[#DDD6FE] border border-[#C4B5FD]/30 hover:bg-[#C4B5FD]/25 shadow-[0_0_15px_rgba(196,181,253,0.15)]'
                  : 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/30 hover:bg-[#7C3AED]/20 shadow-sm'
              }`}
            >
              workspace ({user.username})
            </Link>
          ) : (
            <a
              href="http://localhost:4000/api/auth/github"
              className={`transition-colors tracking-wide ${
                isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-[#09090D]'
              }`}
            >
              login
            </a>
          )}
        </nav>
      </header>

      {/* 3. Hero Section (Left-Aligned, Massive Typography) */}
      <main className="relative z-20 w-full flex-1 flex flex-col items-start justify-start px-6 pt-10 sm:pt-14 md:pt-16 pb-24 text-left">
        {/* Section 1: Hero (Full viewport presentation, top-anchored for rock-solid stability) */}
        <div className="w-full max-w-6xl mx-auto min-h-[85vh] flex flex-col justify-start pt-8 sm:pt-14 md:pt-20">
          {/* Dynamic Decrypted Lifecycle Text directly above "friday" (locked height, zero jerk) */}
          <div className="w-full h-16 sm:h-20 md:h-24 lg:h-28 mb-1 sm:mb-2 flex items-end justify-start text-left overflow-hidden">
            <DecryptedText
              key={ROTATING_WORDS[wordIndex].text}
              text={ROTATING_WORDS[wordIndex].text}
              speed={75}
              maxIterations={14}
              sequential={true}
              revealDirection="start"
              useOriginalCharsOnly={false}
              animateOn="auto"
              className={`font-mono font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight lowercase select-none leading-none inline-block align-bottom transition-colors ${
                isDark ? 'text-[#C4B5FD]' : 'text-[#7C3AED]'
              }`}
              encryptedClassName={`font-mono font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight lowercase select-none leading-none inline-block align-bottom opacity-40 transition-colors ${
                isDark ? 'text-[#A78BFA]' : 'text-[#8B5CF6]'
              }`}
            />
          </div>

          {/* Brand: "WEday" */}
          <h1
            className={`w-full font-inconsolata font-black text-left text-8xl sm:text-9xl md:text-[11rem] lg:text-[14rem] tracking-tighter leading-[0.88] select-none transition-colors ${
              isDark
                ? 'text-white selection:bg-[#A78BFA] selection:text-black'
                : 'text-[#09090D] selection:bg-[#7C3AED] selection:text-white'
            }`}
          >
            WEday
          </h1>
          <p className={`mt-3 font-mono text-sm sm:text-base tracking-wide ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Collaborative Software Development Workspace(week end day)
          </p>

          {/* Buttons placed directly below "friday" (Left-aligned) */}
          <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-start gap-4">
            {/* Enter Workspace Button */}
            <Link
              href="/workspace"
              className={`px-8 py-4 rounded-full font-black tracking-wide text-sm flex items-center justify-center space-x-2.5 transition-all transform hover:-translate-y-0.5 ${
                isDark
                  ? 'bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] hover:from-[#6D28D9] hover:to-[#8B5CF6] text-white shadow-[0_0_35px_rgba(139,92,246,0.45)] hover:shadow-[0_0_45px_rgba(139,92,246,0.65)]'
                  : 'bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#8B5CF6] hover:from-[#5B21B6] hover:to-[#7C3AED] text-white shadow-[0_4px_25px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_35px_rgba(124,58,237,0.5)]'
              }`}
            >
              <span>Enter Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* GitHub Login Button with GitHub Logo inside */}
            <a
              href="http://localhost:4000/api/auth/github"
              className={`px-7 py-4 rounded-full font-black tracking-wide text-sm flex items-center justify-center space-x-3 transition-all transform hover:-translate-y-0.5 border ${
                isDark
                  ? 'bg-white text-[#030307] hover:bg-[#F5F3FF] border-white/20 shadow-[0_0_30px_rgba(196,181,253,0.25)] hover:shadow-[0_0_45px_rgba(196,181,253,0.4)]'
                  : 'bg-[#09090D] text-white hover:bg-[#181825] border-black/20 shadow-[0_4px_25px_rgba(9,9,13,0.25)] hover:shadow-[0_6px_30px_rgba(124,58,237,0.3)]'
              }`}
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>Login with GitHub</span>
            </a>

            {/* Pioneer Dev Login Button */}
            <button
              onClick={() => setIsDevLoginOpen(true)}
              className={`text-xs font-mono py-2.5 px-4 rounded-full border backdrop-blur-sm transition-all ${
                isDark
                  ? 'text-slate-400 hover:text-[#C4B5FD] border-white/10 hover:border-[#C4B5FD]/40 bg-white/[0.02]'
                  : 'text-slate-600 hover:text-[#7C3AED] border-[#DDD6FE] hover:border-[#7C3AED]/40 bg-white/70 shadow-sm'
              }`}
            >
              {user ? `Dev: ${user.username}` : 'Pioneer Dev Login'}
            </button>
          </div>
        </div>

        {/* Section 2: Tagline with ScrollReveal (in left alignment, revealed on scroll) */}
        <div className="w-full max-w-6xl mx-auto pt-44 sm:pt-60 pb-36 text-left">
          <ScrollReveal
            baseOpacity={0.1}
            enableBlur={true}
            baseRotation={3}
            blurStrength={4}
            containerClassName="text-left my-0"
            textClassName={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-[#09090D]'
            }`}
          >
            the living plan for software.
          </ScrollReveal>

          {/* Subtitle / Essence */}
          <p
            className={`mt-6 text-lg sm:text-xl max-w-2xl leading-relaxed font-normal transition-colors ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            A persistent environment connecting planning, visual design, architecture,
            code discussions, and GitHub workflows.
          </p>

          {/* Feature Highlights Pills (Left-aligned) */}
          <div
            className={`mt-10 flex flex-wrap items-center justify-start gap-3 max-w-3xl text-xs transition-colors ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <div
              className={`px-3.5 py-1.5 rounded-full border backdrop-blur-sm flex items-center space-x-2 ${
                isDark
                  ? 'bg-white/[0.02] border-[#C4B5FD]/15'
                  : 'bg-white/80 border-[#DDD6FE] shadow-sm'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#C4B5FD]' : 'bg-[#7C3AED]'}`} />
              <span>PRD Versioning & AI Blueprints</span>
            </div>
            <div
              className={`px-3.5 py-1.5 rounded-full border backdrop-blur-sm flex items-center space-x-2 ${
                isDark
                  ? 'bg-white/[0.02] border-[#C4B5FD]/15'
                  : 'bg-white/80 border-[#DDD6FE] shadow-sm'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#DDD6FE]' : 'bg-[#8B5CF6]'}`} />
              <span>Interactive Architecture Graph</span>
            </div>
            <div
              className={`px-3.5 py-1.5 rounded-full border backdrop-blur-sm flex items-center space-x-2 ${
                isDark
                  ? 'bg-white/[0.02] border-[#C4B5FD]/15'
                  : 'bg-white/80 border-[#DDD6FE] shadow-sm'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#A78BFA]' : 'bg-[#6D28D9]'}`} />
              <span>Code-Anchored Discussions</span>
            </div>
            <div
              className={`px-3.5 py-1.5 rounded-full border backdrop-blur-sm flex items-center space-x-2 ${
                isDark
                  ? 'bg-white/[0.02] border-[#C4B5FD]/15'
                  : 'bg-white/80 border-[#DDD6FE] shadow-sm'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#8B5CF6]' : 'bg-[#A78BFA]'}`} />
              <span>Strict Concern Quality Gate</span>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Footer */}
      <footer
        className={`relative z-30 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs border-t transition-colors ${
          isDark
            ? 'text-slate-500 border-white/5'
            : 'text-slate-500 border-[#E2E0EE]'
        }`}
      >
        <div className="flex items-center space-x-2">
          <span
            className={`font-inconsolata font-black text-sm tracking-tight ${
              isDark ? 'text-slate-400' : 'text-slate-700'
            }`}
          >
            WE
          </span>
          <span>&copy; {new Date().getFullYear()} WEday - Collaborative Software Development Workspace(week end day). All rights reserved.</span>
        </div>
        <div className="flex items-center space-x-4 font-mono text-[11px]">
          <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
            Supabase + Upstash Active
          </span>
          <span>&bull;</span>
          <Link
            href="/workspace"
            className={`hover:underline ${
              isDark ? 'text-[#C4B5FD]' : 'text-[#7C3AED]'
            }`}
          >
            Workspace
          </Link>
        </div>
      </footer>

      {/* 5. Theme Toggle Button on Bottom Right */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle Theme"
        className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-3.5 py-2 rounded-full backdrop-blur-xl transition-all duration-300 transform hover:scale-105 shadow-xl cursor-pointer ${
          isDark
            ? 'bg-[#0A0814]/90 text-[#C4B5FD] border border-[#A78BFA]/30 hover:border-[#C4B5FD] hover:bg-[#120F24] shadow-[0_0_25px_rgba(167,139,250,0.25)]'
            : 'bg-white/95 text-[#7C3AED] border border-[#DDD6FE] hover:border-[#7C3AED] hover:bg-white shadow-[0_4px_20px_rgba(124,58,237,0.18)]'
        }`}
      >
        {isDark ? (
          <>
            <Sun className="w-4 h-4 text-[#DDD6FE]" />
            <span className="text-xs font-mono font-medium tracking-wide">light</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-xs font-mono font-medium tracking-wide">dark</span>
          </>
        )}
      </button>

      {/* About Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`w-full max-w-xl p-8 rounded-2xl border shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-200 ${
              isDark
                ? 'bg-[#0A0814]/95 border-[#A78BFA]/30 text-white'
                : 'bg-white/95 border-[#DDD6FE] text-[#09090D]'
            }`}
          >
            <button
              onClick={() => setIsAboutOpen(false)}
              className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-200 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <span
                className={`font-inconsolata font-black text-3xl tracking-tight ${
                  isDark ? 'text-white' : 'text-[#09090D]'
                }`}
              >
                fri
              </span>
              <span
                className={`text-xs font-mono uppercase px-2 py-0.5 rounded border ${
                  isDark
                    ? 'bg-violet-950/60 text-[#C4B5FD] border-violet-800/60'
                    : 'bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]'
                }`}
              >
                Philosophy & Architecture
              </span>
            </div>

            <div
              className={`space-y-4 text-xs leading-relaxed font-sans ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              <p>
                <strong className={isDark ? 'text-white font-semibold' : 'text-[#09090D] font-bold'}>
                  WEday
                </strong>{' '}
                is not another chat tool or disconnected code editor. It is a{' '}
                <em>project-centric collaborative software development workspace</em> designed
                around the core principle:
              </p>
              <div
                className={`p-3.5 rounded-xl border font-mono text-[11px] text-center ${
                  isDark
                    ? 'bg-white/[0.03] border-white/10 text-[#C4B5FD]'
                    : 'bg-[#F5F3FF] border-[#DDD6FE] text-[#7C3AED]'
                }`}
              >
                Requirement → Architecture → Code → Discussions → Commits
              </div>
              <ul className="space-y-2 pt-1">
                <li className="flex items-start space-x-2">
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      isDark ? 'text-[#C4B5FD]' : 'text-[#7C3AED]'
                    }`}
                  />
                  <span>
                    <strong className={isDark ? 'text-slate-200' : 'text-[#09090D]'}>
                      Persistent Project Memory:
                    </strong>{' '}
                    Every commit traces to an architectural node, and every node traces to a PRD requirement.
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      isDark ? 'text-[#DDD6FE]' : 'text-[#8B5CF6]'
                    }`}
                  />
                  <span>
                    <strong className={isDark ? 'text-slate-200' : 'text-[#09090D]'}>
                      Code Anchoring:
                    </strong>{' '}
                    Discussions anchor directly to code fingerprints so insights never get lost across refactors.
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      isDark ? 'text-[#A78BFA]' : 'text-[#6D28D9]'
                    }`}
                  />
                  <span>
                    <strong className={isDark ? 'text-slate-200' : 'text-[#09090D]'}>
                      Concern Quality Gates:
                    </strong>{' '}
                    Strict verification lifecycle ensures unresolved questions never slip into production.
                  </span>
                </li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsAboutOpen(false)}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors ${
                  isDark
                    ? 'bg-[#7C3AED] hover:bg-[#6D28D9]'
                    : 'bg-[#7C3AED] hover:bg-[#6D28D9]'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dev Login Modal */}
      {isDevLoginOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`w-full max-w-sm p-6 rounded-2xl border shadow-2xl relative space-y-4 ${
              isDark
                ? 'bg-[#0A0814]/95 border-[#A78BFA]/30 text-white'
                : 'bg-white/95 border-[#DDD6FE] text-[#09090D]'
            }`}
          >
            <button
              onClick={() => setIsDevLoginOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold flex items-center space-x-2">
              <Sparkles
                className={`w-4 h-4 ${isDark ? 'text-[#C4B5FD]' : 'text-[#7C3AED]'}`}
              />
              <span>Pioneer Dev Login</span>
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              One-click local authentication without requiring external GitHub App OAuth configuration.
            </p>

            <form onSubmit={handleDevLogin} className="space-y-3 pt-2">
              <div>
                <label
                  className={`block text-[11px] font-mono mb-1 ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  Developer Username
                </label>
                <input
                  type="text"
                  value={devUsername}
                  onChange={(e) => setDevUsername(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none font-mono ${
                    isDark
                      ? 'bg-[#030307] border-[#231F3D] text-white focus:border-[#C4B5FD]'
                      : 'bg-white border-[#DDD6FE] text-[#09090D] focus:border-[#7C3AED]'
                  }`}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] hover:from-[#6D28D9] hover:to-[#7C3AED] text-xs font-bold text-white shadow-lg shadow-purple-500/20 transition-all"
              >
                {loggingIn ? 'Authenticating...' : 'Enter Workspace'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
