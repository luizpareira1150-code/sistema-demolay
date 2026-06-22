import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  hasEvents: boolean;
  showText?: boolean;
}

export default function ProgressBar({ value, hasEvents, showText = true }: ProgressBarProps) {
  if (!hasEvents) {
    return (
      <div className="w-full">
        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden" />
        {showText && (
          <p className="text-xs text-slate-500 font-medium mt-1">
            Sem eventos considerados
          </p>
        )}
      </div>
    );
  }

  // Color logic
  let barColor = 'bg-rose-500';
  let textColor = 'text-rose-600';
  let zoneLabel = 'Zona Vermelha';

  if (value > 70) {
    barColor = 'bg-emerald-500';
    textColor = 'text-emerald-700';
    zoneLabel = 'Zona Verde';
  } else if (value >= 60) {
    barColor = 'bg-amber-400';
    textColor = 'text-amber-700';
    zoneLabel = 'Zona Amarela';
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-semibold mb-1">
        <span className={`${textColor}`}>{zoneLabel}</span>
        <span className="text-slate-700">{value}%</span>
      </div>
      <div className="h-2.5 w-full bg-rose-500 rounded-full border border-slate-200/50 overflow-hidden flex">
        <div
          className="h-full bg-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
        <div
          className="h-full bg-rose-500 transition-all duration-500 ease-out"
          style={{ width: `${100 - Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
