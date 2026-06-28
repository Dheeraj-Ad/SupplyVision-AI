export default function SimulationLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="border-b border-slate-800 pb-6">
        <div className="h-7 bg-slate-800 rounded-xl w-44 mb-3" />
        <div className="h-4 bg-slate-800/50 rounded-lg w-80" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="h-80 bg-slate-800/40 rounded-2xl" />
        <div className="lg:col-span-2 h-80 bg-slate-800/40 rounded-2xl" />
      </div>
    </div>
  );
}
