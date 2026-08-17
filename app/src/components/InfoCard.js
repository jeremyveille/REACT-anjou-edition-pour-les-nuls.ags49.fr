import React from "react";
import { Sparkles, ChevronRight, HelpCircle } from "lucide-react";

export default function InfoCard({ onLearnMore }) {

  return (
    <div
      id="anjou-info-card"
      className="info-card-left h-full flex flex-col justify-between"
    >
      {/* Upper image with custom literary focus */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-900 group">
        <img
          src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop"
          alt="Anjou Edition - Livres"
          className="w-full h-full object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
        
        {/* Floating badge */}
        <span className="absolute top-3 left-3 bg-[#1e3a8a] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Espace Littéraire
        </span>
      </div>

      {/* Primary content area */}
      <div className="p-6 md:p-8 flex-grow flex flex-col justify-between text-white">
        <div>
          <h3 className="text-xl md:text-2xl font-bold mb-3 info-title leading-tight">
            Le service Anjou Edition est activé
          </h3>
          
          <p className="text-slate-200 text-sm md:text-base leading-relaxed font-light mb-6">
            Vous bénéficiez d'un espace de gestion pour créer, organiser et publier vos contenus littéraires. Accédez en toute simplicité à vos livres électroniques, galeries de poésies et outils pédagogiques.
          </p>
        </div>

        {/* Link footer */}
        <button
          id="btn-info-learn-more"
          onClick={onLearnMore}
          className="group/btn mt-auto w-full md:w-auto inline-flex items-center justify-between bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-medium text-sm px-4 py-2.5 rounded-lg border border-white/20 transition-all duration-300 backdrop-blur-sm self-start cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            Pour en savoir plus
          </span>
          <ChevronRight className="w-4 h-4 text-white/70 group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Technical bottom indicator decoration */}
      <div className="bg-slate-950/50 px-6 py-2.5 text-[11px] font-mono text-slate-400 border-t border-white/5 flex justify-between items-center">
        <span>ID Client: AE-29381</span>
        <span className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Actif
        </span>
      </div>
    </div>
  );
}
