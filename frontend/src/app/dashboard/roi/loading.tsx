export default function ROILoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="border-b border-slate-800 pb-6">
        <div className="h-7 bg-slate-800 rounded-xl w-64 mb-3" />
        <div className="h-4 bg-slate-800/50 rounded-lg w-96" />
      </div>
      <div className="h-28 bg-emerald-900/10 border border-emerald-900/20 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[0,1,2,3].map(i => <div key={i} className="h-36 bg-slate-800/40 rounded-2xl" />)}
      </div>
      <div className="h-64 bg-slate-800/40 rounded-2xl" />
    </div>
  );
}
