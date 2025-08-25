export function ListAudienceBadge({ audience }: { audience: string }) {
  const color = audience === "public" ? "bg-green-100 text-green-700" :
                audience === "circle" ? "bg-blue-100 text-blue-700" : 
                "bg-gray-100 text-gray-700";
  
  const displayText = audience === "profile" ? "Private" : 
                     audience === "circle" ? "Circle" :
                     "Public";
  
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${color}`}>
      {displayText}
    </span>
  );
}