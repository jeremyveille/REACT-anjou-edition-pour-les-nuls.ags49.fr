import React from "react";
import { ShieldCheck, Database, CheckCircle2, ChevronRight, HelpCircle, Layers } from "lucide-react";

export default function InfoCard({ onLearnMore }) {
  return (
    <div
      id="anjou-info-card"
      className="ae-card ae-admin-status-card"
    >
      <div className="ae-status-card-header">
        <div className="ae-status-card-title-group">
          <div className="ae-status-icon-badge" aria-hidden="true">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="ae-status-card-title">Service Anjou Édition</h3>
            <span className="ae-status-card-subtitle">Plateforme d'administration</span>
          </div>
        </div>
        <span className="ae-status-pill ae-status-pill--active">
          <span className="ae-status-dot-pulse" aria-hidden="true"></span>
          Statut : Actif
        </span>
      </div>

      <div className="ae-status-indicators-list">
        <div className="ae-status-item">
          <div className="ae-status-item-left">
            <Database size={15} className="ae-status-item-icon text-emerald-600" aria-hidden="true" />
            <span className="ae-status-item-label">Cloud Firestore</span>
          </div>
          <span className="ae-status-item-value text-emerald-700 font-semibold">
            <CheckCircle2 size={13} className="ae-status-check-icon text-emerald-600" aria-hidden="true" />
            Actif
          </span>
        </div>

        <div className="ae-status-item">
          <div className="ae-status-item-left">
            <Layers size={15} className="ae-status-item-icon text-blue-600" aria-hidden="true" />
            <span className="ae-status-item-label">Accès éditeur</span>
          </div>
          <span className="ae-status-item-value text-slate-700 font-medium">
            Outils de publication
          </span>
        </div>

        <div className="ae-status-item">
          <div className="ae-status-item-left">
            <span className="ae-status-item-icon-tag" aria-hidden="true">ID</span>
            <span className="ae-status-item-label">Instance système</span>
          </div>
          <span className="ae-status-item-value text-slate-600 font-mono text-xs">
            AE-29381 (v2.4)
          </span>
        </div>
      </div>

      {onLearnMore && (
        <div className="ae-status-card-footer">
          <button
            id="btn-info-learn-more"
            type="button"
            onClick={onLearnMore}
            className="ae-status-learn-more-btn"
            title="Consulter les informations sur le service Anjou Édition"
          >
            <span className="ae-flex-center-gap-2">
              <HelpCircle size={15} className="text-blue-600" aria-hidden="true" />
              <span>En savoir plus</span>
            </span>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
