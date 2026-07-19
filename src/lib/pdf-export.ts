// Exporta um elemento DOM para PDF multi-página (A4 paisagem).
// Usa html-to-image (foreignObject/SVG) que suporta qualquer função de cor
// moderna (oklch/lab/color-mix), pois delega a renderização ao próprio navegador.
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export async function exportElementToPDF(el: HTMLElement, fileName = "dashboard.pdf") {
  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    backgroundColor: "#0a0a0f",
    cacheBust: true,
    skipFonts: false,
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Falha ao carregar imagem gerada"));
  });

  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (img.height * imgW) / img.width;

  if (imgH <= pageH) {
    pdf.addImage(dataUrl, "PNG", 0, 0, imgW, imgH);
  } else {
    let y = 0;
    let remaining = imgH;
    while (remaining > 0) {
      pdf.addImage(dataUrl, "PNG", 0, y, imgW, imgH);
      remaining -= pageH;
      if (remaining > 0) {
        pdf.addPage();
        y -= pageH;
      }
    }
  }
  pdf.save(fileName);
}
