export default function SuppliersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="border-b border-slate-800 pb-6 flex justify-between items-start">
        <div>
          <div className="h-7 bg-slate-800 rounded-xl w-48 mb-3" />
          <div className="h-4 bg-slate-800/50 rounded-lg w-72" />
        </div>
        <div className="h-10 w-36 bg-slate-800/50 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <div key={i} className="h-20 bg-slate-800/40 rounded-xl" />)}
      </div>
      <div className="bg-slate-800/40 rounded-2xl overflow-hidden">
        <div className="h-12 bg-slate-800/60" />
        {[0,1,2,3,4].map(i => <div key={i} className="h-16 border-t border-slate-800/30" />)}
      </div>
    </div>
  );
}
