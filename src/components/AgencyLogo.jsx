import { Briefcase } from "lucide-react";
import { useAgencyLogos } from "../context/LogosContext";

// Logo d'une agence d'intérim : l'image uploadée si elle existe, sinon
// une icône neutre.
export default function AgencyLogo({ employeur, size = 20, className = "" }) {
  const { logos } = useAgencyLogos();
  const src = employeur ? logos[employeur] : null;

  if (src) {
    return (
      <img
        src={src}
        alt=""
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
