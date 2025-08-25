export function SkeletonFeedCard() {
  return (
    <div className="animate-pulse p-4 bg-white rounded-xl shadow-sm space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-48 bg-gray-200 rounded"></div>
    </div>
  );
}

export function SkeletonListCard() {
  return (
    <div className="animate-pulse p-4 bg-white rounded-xl shadow-sm space-y-3">
      <div className="flex items-center space-x-2">
        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
        <div className="flex-1 space-y-1">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="h-32 bg-gray-200 rounded"></div>
      <div className="flex justify-between">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    </div>
  );
}