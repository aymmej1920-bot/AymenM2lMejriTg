import React from 'react';

interface SkeletonLoaderProps {
  count?: number; // Number of skeleton items to render
  height?: string; // Height of each skeleton item, e.g., 'h-8', 'h-12'
  className?: string; // Additional Tailwind CSS classes for the skeleton item
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ count = 1, height = 'h-8', className = '' }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 animate-pulse rounded-md ${height} ${className}`}
        ></div>
      ))}
    </div>
  );
};

export default SkeletonLoader;