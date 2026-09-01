import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { useAgencyLogos } from "../context/LogosContext";

// Domaine web des agences connues → sert à récupérer le logo
// automatiquement (aucun upload nécessaire). L'utilisateur peut quand
// même téléverser sa propre image, qui a la priorité.
const AGENCY_DOMAINS = {
  FICOBA: "ficoba.ch",
  "One Placement": "oneplacement.ch",
  "OKJob Genève": "okjob.ch",
  "OKJob Lausanne": "okjob.ch",
  Assisteo: "assisteo.ch",
  "Medicalis Genève": "medicalis.ch",
};

// Sources de logo essayées dans l'ordre, jusqu'à ce qu'une charge.
function sourcesFor(domain) {
  if (!domain) return [];
  return [
    `https://logo.clearbit.com/${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?sz=128&domain=${domain}`,
  ];
}

// Logo d'une agence d'intérim : image téléversée par l'utilisateur si
// elle existe, sinon logo web automatique, sinon icône neutre.
export default function AgencyLogo({ employeur, size = 20, className = "" }) {
  const { logos } = useAgencyLogos();
  const uploaded = employeur ? logos[employeur] : null;
  const sources = uploaded ? [] : sourcesFor(AGENCY_DOMAINS[employeur]);

  const [i, setI] = useState(0);
  useEffect(() => setI(0), [employeur, uploaded]);

  const src = uploaded || sources[i] || null;

  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => {
          if (!uploaded) setI((n) => n + 1);
        }}
        className={`shrink-0 rounded-[4px] object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <Briefcase
      size={Math.round(size * 0.8)}
      className={`shrink-0 text-slate-400 dark:text-slate-500 ${className}`}
    />
  );
}
