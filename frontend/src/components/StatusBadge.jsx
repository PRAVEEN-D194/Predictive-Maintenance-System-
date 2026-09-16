import React from 'react';

export const StatusBadge = ({ status, size = 'md' }) => {
  const normalized = (status || '').toLowerCase();
  
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-300';
  let dotColor = 'bg-slate-500';
  let label = status || 'Unknown';

  if (normalized === 'stopped') {
    colorStyles = 'bg-slate-100 text-slate-700 border-slate-300';
    dotColor = 'bg-slate-500';
    label = 'Stopped';
  } else if (normalized === 'working' || normalized === 'healthy' || normalized === 'running') {
    colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500';
    label = 'Running';
  } else if (normalized === 'warning') {
    colorStyles = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
    label = 'Warning';
  } else if (normalized === 'critical') {
    colorStyles = 'bg-rose-50 text-rose-800 border-rose-200';
    dotColor = 'bg-rose-500';
    label = 'Critical';
  } else if (normalized === 'failed' || normalized === 'not working') {
    colorStyles = 'bg-rose-950 text-rose-100 border-rose-800';
    dotColor = 'bg-rose-500';
    label = 'Failed';
  }

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : size === 'lg' 
    ? 'px-3.5 py-1.5 text-sm font-semibold' 
    : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${colorStyles} select-none`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${normalized === 'critical' ? 'animate-ping' : ''}`} />
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
