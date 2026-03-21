import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

/** Options communes : sans lecture des @font-face distants (Google Fonts → cssRules bloqué en cross-origin). */
const ticketImageOptions = {
  cacheBust: true,
  backgroundColor: '#ffffff',
  skipFonts: true,
}

/**
 * @param {HTMLElement} element
 * @param {string} [filename]
 */
export async function exportTicketAsPng(element, filename) {
  if (!element) return
  const url = await toPng(element, {
    ...ticketImageOptions,
    pixelRatio: 3,
  })
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `demgaw-billet-${Date.now()}.png`
  a.click()
}

/**
 * @param {HTMLElement} element
 * @param {string} [filename]
 */
export async function exportTicketAsPdf(element, filename) {
  if (!element) return
  const imgData = await toPng(element, {
    ...ticketImageOptions,
    pixelRatio: 2,
  })
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = imgData
  })
  const width = img.naturalWidth || img.width
  const height = img.naturalHeight || img.height
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 14
  const maxW = pageW - 2 * margin
  const maxH = pageH - 2 * margin
  const ratio = height / width
  let imgW = maxW
  let imgH = imgW * ratio
  if (imgH > maxH) {
    imgH = maxH
    imgW = imgH / ratio
  }
  const x = (pageW - imgW) / 2
  const y = margin + (maxH - imgH) / 2
  pdf.addImage(imgData, 'PNG', x, y, imgW, imgH)
  pdf.save(filename ?? `demgaw-billet-${Date.now()}.pdf`)
}
