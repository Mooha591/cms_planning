// Médaillon logo "K" (KyzenDay), dégradé teal → bleu ciel
export default function Logo({ size = 28 }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-sky-500 font-extrabold leading-none text-teal-950 shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      aria-hidden="true"
    >
      K
    </span>
  );
}
