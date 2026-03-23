import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

const isCapacitor = () =>
  typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

/** Options communes : sans lecture des @font-face distants. */
const ticketImageOptions = {
  cacheBust: true,
  backgroundColor: '#ffffff',
  skipFonts: true,
}

/** Sauvegarde un fichier sur Android via Capacitor Filesystem + Share. */
async function saveAndShareOnAndroid(base64Data, filename, mimeType) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const { Share } = await import('@capacitor/share')

  // Extraire la partie base64 pure (retirer le préfixe data:...)
  const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data

  await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  })

  const { uri } = await Filesystem.getUri({
    path: filename,
    directory: Directory.Cache,
  })

  await Share.share({
    title: 'Billet DemGaw',
    url: uri,
    dialogTitle: 'Enregistrer ou partager le billet',
  })
}

/**
 * @param {HTMLElement} element
 * @param {string} [filename]
 */
export async function exportTicketAsPng(element, filename) {
  if (!element) return
  const url = await toPng(element, { ...ticketImageOptions, pixelRatio: 3 })
  const name = filename ?? `demgaw-billet-${Date.now()}.png`

  if (isCapacitor()) {
    await saveAndShareOnAndroid(url, name, 'image/png')
    return
  }

  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
}

/**
 * @param {HTMLElement} element
 * @param {string} [filename]
 */
export async function exportTicketAsPdf(element, filename) {
  if (!element) return
  const imgData = await toPng(element, { ...ticketImageOptions, pixelRatio: 2 })
  const name = filename ?? `demgaw-billet-${Date.now()}.pdf`

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
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

  if (isCapacitor()) {
    const pdfBase64 = pdf.output('datauristring')
    await saveAndShareOnAndroid(pdfBase64, name, 'application/pdf')
    return
  }

  pdf.save(name)
}
