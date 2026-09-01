// Redimensionne une image (fichier choisi par l'utilisateur) en une
// petite vignette carrée-ish et renvoie une data URL PNG, prête à être
// stockée en base. Garde le ratio, borne le plus grand côté à `max`.
export function fileToLogoDataUrl(file, max = 128) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Choisis un fichier image."));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error("Image trop lourde (max 4 Mo)."));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Impossible de traiter l'image."));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch {
        reject(new Error("Impossible de traiter l'image."));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Fichier image illisible."));
    };
    img.src = url;
  });
}
