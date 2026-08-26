import React from 'react';

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-[#0f1628] border border-white/[0.06] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 bg-white/10 rounded" />
          <div className="h-6 w-6 bg-white/5 rounded-full" />
        </div>
        <div className="h-7 w-24 bg-white/15 rounded" />
        <div className="h-2.5 w-32 bg-white/5 rounded" />
      </div>
    ))}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="bg-[#0f1628] border border-white/[0.06] rounded-2xl p-4 space-y-4 animate-pulse">
    <div className="flex justify-between items-center pb-2 border-b border-white/5">
      <div className="h-4 w-36 bg-white/10 rounded" />
      <div className="h-4 w-20 bg-white/5 rounded" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <div className="h-3 w-1/4 bg-white/10 rounded" />
          <div className="h-3 w-1/6 bg-white/5 rounded" />
          <div className="h-3 w-1/6 bg-white/5 rounded" />
          <div className="h-3 w-1/4 bg-white/10 rounded" />
          <div className="h-3 w-1/6 bg-white/5 rounded" />
        </div>
      ))}
    </div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    <CardSkeleton count={4} />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TableSkeleton rows={5} />
      <TableSkeleton rows={5} />
    </div>
  </div>
);
