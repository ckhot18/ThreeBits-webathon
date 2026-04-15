import { Outlet } from 'react-router-dom'

function RootLayout() {
  return (
    <div className="app-shell min-h-dvh bg-stone-100 text-slate-900">
      <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-stone-300 bg-white/85 px-4 py-4 text-center text-xs text-slate-500 backdrop-blur sm:text-sm">
        ShikayatTrack civic grievance system for faster reporting, tracking, and resolution.
      </footer>
    </div>
  )
}

export default RootLayout
