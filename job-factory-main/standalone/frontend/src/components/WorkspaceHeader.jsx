import React from "react";
import { Building2, LogOut, Moon, Sun } from "lucide-react";

export default function WorkspaceHeader({ user, portalName, portalHint, accentClassName, onLogout, isDarkMode, onToggleTheme }) {
  return (
    <header className={`sticky top-0 z-30 border-b px-6 py-5 backdrop-blur ${isDarkMode ? 'border-white/10 bg-slate-950/70' : 'border-slate-200/40 bg-white/90'}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] ${accentClassName}`}>
              {portalName}
            </div>
            <div className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-300/30 bg-slate-200/70 text-slate-700'}`}>
              FactoryFlow AI
            </div>
          </div>
          <h1 className={`mt-3 text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{portalHint}</h1>
          <p className={`mt-2 max-w-3xl text-sm leading-7 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            AI-guided manufacturing requests are validated against live stock and confirmed through secure verification codes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`hidden items-center gap-3 rounded-3xl border px-4 py-3 lg:flex ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200/40 bg-slate-100/70'}`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-white/8 text-slate-100' : 'bg-slate-200 text-slate-700'}`}>
              <Building2 size={16} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.name}</p>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {user.companyName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10' : 'border-slate-200/40 bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
            {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10' : 'border-slate-200/40 bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
