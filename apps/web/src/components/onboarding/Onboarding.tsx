'use client';

import { useState, useEffect } from 'react';
import { Layers, MousePointerClick, MessageSquare, X } from 'lucide-react';

const STORAGE_KEY = 'codeview-onboarding-seen';

const STEPS = [
  {
    icon: Layers,
    title: 'These boxes are parts of your app',
    description: 'Each group represents a layer of your architecture — UI screens, API endpoints, database models, and utilities. The lines show how they connect.',
  },
  {
    icon: MousePointerClick,
    title: 'Click to select, then ask Claude',
    description: 'Click any component to see its details. Select multiple components, type your question, and copy the context to paste into Claude Code.',
  },
  {
    icon: MessageSquare,
    title: 'Toggle Technical for code-level detail',
    description: 'By default you see plain English descriptions. Toggle "Technical" in the toolbar to see file paths, types, and framework-specific labels.',
  },
];

export function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Step indicator */}
        <div className="flex gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-blue-500' : 'w-1.5 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
          <Icon size={20} className="text-blue-400" />
        </div>

        {/* Content */}
        <h2 className="text-lg font-bold tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {current.title}
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          {current.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={next}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            {step < STEPS.length - 1 ? 'Next' : 'Get started'}
          </button>
        </div>
      </div>
    </div>
  );
}
