import { STATUS_META, formatCategory, formatDateTime } from './complaintUtils.js'

function getPdfConstructor() {
  const jsPdfNamespace = window.jspdf
  if (!jsPdfNamespace?.jsPDF) {
    throw new Error('PDF engine is not available. Please refresh and try again.')
  }

  return jsPdfNamespace.jsPDF
}

export function downloadComplaintReportPdf(complaint) {
  const PdfConstructor = getPdfConstructor()
  const pdf = new PdfConstructor({ unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 44
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const ensureSpace = (requiredHeight = 24) => {
    if (y + requiredHeight <= pageHeight - margin) return
    pdf.addPage()
    y = margin
  }

  const writeHeading = (text) => {
    ensureSpace(32)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text(text, margin, y)
    y += 24
  }

  const writeLabelValue = (label, value) => {
    const textValue = String(value || 'N/A')
    ensureSpace(36)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text(label, margin, y)
    y += 14
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    const lines = pdf.splitTextToSize(textValue, contentWidth)
    pdf.text(lines, margin, y)
    y += lines.length * 14 + 8
  }

  writeHeading('Complaint Status Report')
  writeLabelValue('Complaint Number', complaint.complaintNumber)
  writeLabelValue('Title', complaint.title)
  writeLabelValue('Status', STATUS_META[complaint.status].label)
  writeLabelValue('Category', formatCategory(complaint.category, complaint.otherCategory))
  writeLabelValue('Location', complaint.locationName)
  writeLabelValue('Reported On', formatDateTime(complaint.createdAt))
  writeLabelValue('Description', complaint.description)

  ensureSpace(24)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text('Timeline', margin, y)
  y += 18

  complaint.timeline.forEach((entry, index) => {
    ensureSpace(58)
    pdf.setDrawColor(226, 232, 240)
    pdf.setFillColor(248, 250, 252)
    pdf.roundedRect(margin, y, contentWidth, 52, 8, 8, 'FD')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text(`${index + 1}. ${STATUS_META[entry.status].label}`, margin + 12, y + 17)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    const timelineLine = `${entry.note} (${formatDateTime(entry.timestamp)})`
    const wrappedTimeline = pdf.splitTextToSize(timelineLine, contentWidth - 24)
    pdf.text(wrappedTimeline, margin + 12, y + 33)
    y += 62
  })

  const safeComplaintNumber = String(complaint.complaintNumber || 'complaint-report').replaceAll('/', '-')
  pdf.save(`${safeComplaintNumber}-report.pdf`)
}
