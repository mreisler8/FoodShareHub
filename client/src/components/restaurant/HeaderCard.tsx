import { MapPin, UtensilsCrossed } from "lucide-react";

interface HeaderCardProps {
  name: string;
  cuisine: string;
  location: string;
  address?: string;
}

export function HeaderCard({ name, cuisine, location, address }: HeaderCardProps) {
  return (
    <div className="rounded-xl shadow-sm bg-white p-4 space-y-2">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
        {name}
      </h1>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <UtensilsCrossed className="h-4 w-4" />
          <span>{cuisine}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          <span>{location}</span>
        </div>
      </div>
      {address && address !== location && (
        <p className="text-xs text-muted-foreground">{address}</p>
      )}
    </div>
  );
}