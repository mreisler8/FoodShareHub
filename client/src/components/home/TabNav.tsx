
interface TabNavProps {
  currentTab: "foryou" | "trending" | "nearby";
  setTab: (tab: "foryou" | "trending" | "nearby") => void;
}

export function TabNav({ currentTab, setTab }: TabNavProps) {
  const tabs = [
    { id: "foryou" as const, label: "For You" },
    { id: "trending" as const, label: "Trending Now" },
    { id: "nearby" as const, label: "Near You" },
  ];

  return (
    <div className="flex justify-around border-b bg-white">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`py-3 px-4 text-sm font-medium transition-colors flex-1 ${
            currentTab === tab.id
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
          onClick={() => setTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
