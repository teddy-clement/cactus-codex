export default function AmbientOrbs() {
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-green-500/10 blur-[120px] rounded-full" />
      <div className="absolute top-1/3 right-0 w-64 h-64 bg-emerald-400/[0.08] blur-[100px] rounded-full" />
      <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-cyan-500/[0.06] blur-[140px] rounded-full -translate-x-1/2" />
    </div>
  )
}
