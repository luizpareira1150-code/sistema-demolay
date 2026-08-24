import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  bgColor?: string;
  iconColor?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  bgColor = 'bg-white',
  iconColor = 'text-slate-900 bg-slate-100'
}: StatCardProps) {
  return (
    <div className={`p-6 rounded-xl border border-slate-200/80 shadow-xs flex items-start gap-4 ${bgColor} transition duration-200 hover:shadow-md hover:border-slate-300`}>
      <div className={`p-3 rounded-lg ${iconColor} flex items-center justify-center shrink-0`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider truncate">
          {title}
        </p>
        <h3 className="text-2xl font-extrabold text-slate-900 mt-1 font-display">
          {value}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
