import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

const STAGES = [
  { key: 'created',  label: 'Created',  test: () => true },
  { key: 'approved', label: 'Approved', test: (ad) => !!ad.approvedAt },
  {
    key: 'paid',
    label: 'Paid',
    test: (ad) => ad.payments?.some(p => p.paidAt) || ad.payments?.some(p => p.status === 'confirmed')
  },
  {
    key: 'live',
    label: 'Live',
    test: (ad) => ['live', 'paused', 'expired'].includes(ad.status) && !!ad.startDate
  },
  {
    key: 'complete',
    label: 'Complete',
    test: (ad) => ad.status === 'expired' && !!ad.startDate
  }
];

function getStepperState(ad) {
  if (ad.status === 'rejected') {
    return { mode: 'branch', label: 'Rejected', variant: 'danger' };
  }
  if (ad.payments?.some(p => p.status === 'rejected')) {
    return { mode: 'branch', label: 'Payment Failed', variant: 'danger' };
  }
  if (ad.status === 'expired' && !ad.startDate) {
    return { mode: 'branch', label: 'Rejected', variant: 'danger' };
  }

  let currentStep = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (STAGES[i].test(ad)) {
      currentStep = i;
    }
  }

  return {
    mode: 'stepper',
    currentStep,
    isPaused: ad.status === 'paused'
  };
}

export default function AdStepper({ ad }) {
  const state = getStepperState(ad);

  if (state.mode === 'branch') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-900/50 whitespace-nowrap">
        <X className="w-3 h-3" />
        {state.label}
      </span>
    );
  }

  const { currentStep, isPaused } = state;

  return (
    <div className="flex items-center gap-0.5">
      {STAGES.map((stage, i) => {
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;
        const isPending = i > currentStep;
        const isLiveStage = stage.key === 'live';

        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center gap-0.5 relative">
              <div
                className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0
                  ${isCompleted ? 'bg-emerald-500 text-white' : ''}
                  ${isActive ? 'bg-primary text-white ring-2 ring-primary/30' : ''}
                  ${isPending ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500' : ''}
                `}
                title={stage.label}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={`
                  text-[8px] font-semibold leading-none whitespace-nowrap
                  ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : ''}
                  ${isActive ? 'text-primary font-bold' : ''}
                  ${isPending ? 'text-slate-400 dark:text-slate-500' : ''}
                `}
              >
                {stage.label}
              </span>
              {isLiveStage && isPaused && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white dark:border-dark-card" title="Paused" />
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={`
                  w-3 h-0.5 mt-[-10px] shrink-0 rounded-full
                  ${i < currentStep ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
      {isPaused && (
        <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50">
          <AlertTriangle className="w-2.5 h-2.5" />
          Paused
        </span>
      )}
    </div>
  );
}
