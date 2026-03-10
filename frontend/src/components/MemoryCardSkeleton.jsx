import React from 'react';

const MemoryCardSkeleton = () => {
  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-full" />
          <div>
            <div className="skeleton w-24 h-4 mb-2" />
            <div className="skeleton w-16 h-3" />
          </div>
        </div>
        <div className="skeleton w-8 h-8 rounded-lg" />
      </div>

      {/* Title */}
      <div className="skeleton w-3/4 h-6 mb-4" />

      {/* Content */}
      <div className="space-y-2 mb-4">
        <div className="skeleton w-full h-4" />
        <div className="skeleton w-full h-4" />
        <div className="skeleton w-2/3 h-4" />
      </div>

      {/* Tags */}
      <div className="flex gap-2 mb-4">
        <div className="skeleton w-16 h-6 rounded-full" />
        <div className="skeleton w-20 h-6 rounded-full" />
        <div className="skeleton w-14 h-6 rounded-full" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
        <div className="skeleton w-12 h-5" />
        <div className="skeleton w-12 h-5" />
        <div className="skeleton w-12 h-5" />
      </div>
    </div>
  );
};

export default MemoryCardSkeleton;