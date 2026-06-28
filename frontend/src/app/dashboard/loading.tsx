export default function DashboardLoading() {
  return (
    <div className="space-y-6 lg:space-y-8 animate-pulse">
      <div className="border-b border-slate-800 pb-6">
        <div className="h-7 bg-slate-800 rounded-xl w-56 mb-3" />
        <div className="h-4 bg-slate-800/50 rounded-lg w-80" />
      </div>
      <div className="h-24 bg-slate-800/40 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <div key={i} className="h-28 bg-slate-800/40 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-64 bg-slate-800/40 rounded-2xl" />
        <div className="h-64 bg-slate-800/40 rounded-2xl" />
      </div>
    </div>
  );
}
