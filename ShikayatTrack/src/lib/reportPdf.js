import { STATUS_META, formatCategory, formatDateTime } from './complaintUtils.js'

const COLORS = {
  headerBg: [5, 13, 26],
  primary: [0, 77, 64],
  body: [15, 23, 42],
  muted: [100, 116, 139],
  border: [226, 232, 240],
  cardBg: [248, 250, 252],
}

function getPdfConstructor() {
  const jsPdfNamespace = window.jspdf
  if (!jsPdfNamespace?.jsPDF) {
    throw new Error('PDF engine is not available. Please refresh and try again.')
  }
  return jsPdfNamespace.jsPDF
}

function safeText(value, fallback = 'N/A') {
  const text = value == null ? '' : String(value).trim()
  return text || fallback
}

export function downloadComplaintReportPdf(complaint) {
  const PdfConstructor = getPdfConstructor()
  const pdf = new PdfConstructor({ unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 40
  const contentWidth = pageWidth - margin * 2
  const topOffset = margin + 84
  let y = topOffset

  const drawHeader = () => {
    pdf.setFillColor(...COLORS.headerBg)
    pdf.rect(0, 0, pageWidth, 78, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text('ShikayatTrack Complaint Report', margin, 32)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text(`Generated: ${formatDateTime(new Date().toISOString())}`, margin, 50)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text(safeText(complaint.complaintNumber), pageWidth - margin, 32, { align: 'right' })
    pdf.setFont('helvetica', 'normal')
    pdf.text('Official status snapshot', pageWidth - margin, 50, { align: 'right' })
  }

  const drawFooter = (pageNumber, totalPages) => {
    pdf.setDrawColor(...COLORS.border)
    pdf.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30)
    pdf.setTextColor(...COLORS.muted)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.text('ShikayatTrack', margin, pageHeight - 16)
    pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 16, { align: 'right' })
  }

  const resetPageDecor = () => {
    drawHeader()
    y = topOffset
  }

  const ensureSpace = (requiredHeight = 24) => {
    if (y + requiredHeight <= pageHeight - margin - 38) return
    pdf.addPage()
    resetPageDecor()
  }

  const writeSectionTitle = (text) => {
    ensureSpace(26)
    pdf.setTextColor(...COLORS.primary)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.text(text, margin, y)
    y += 18
  }

  const writeMetaCard = (rows) => {
    const rowHeight = 18
    const pad = 12
    const height = rows.length * rowHeight + pad * 2
    ensureSpace(height + 8)
    pdf.setDrawColor(...COLORS.border)
    pdf.setFillColor(...COLORS.cardBg)
    pdf.roundedRect(margin, y, contentWidth, height, 8, 8, 'FD')
    let innerY = y + pad + 11
    rows.forEach(({ label, value }) => {
      pdf.setTextColor(...COLORS.muted)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.text(label.toUpperCase(), margin + 12, innerY)
      pdf.setTextColor(...COLORS.body)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.text(safeText(value), margin + 132, innerY)
      innerY += rowHeight
    })
    y += height + 12
  }

  const writeParagraphRow = (label, value) => {
    const text = safeText(value)
    const wrapped = pdf.splitTextToSize(text, contentWidth - 24)
    const cardHeight = Math.max(46, wrapped.length * 14 + 22)
    ensureSpace(cardHeight + 8)
    pdf.setDrawColor(...COLORS.border)
    pdf.setFillColor(255, 255, 255)
    pdf.roundedRect(margin, y, contentWidth, cardHeight, 8, 8, 'FD')
    pdf.setTextColor(...COLORS.muted)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text(label.toUpperCase(), margin + 12, y + 15)
    pdf.setTextColor(...COLORS.body)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.text(wrapped, margin + 12, y + 31)
    y += cardHeight + 10
  }

  const writeTimeline = (entries) => {
    const timeline = Array.isArray(entries) ? entries : []
    if (!timeline.length) {
      writeParagraphRow('Timeline', 'No timeline updates available yet.')
      return
    }

    timeline.forEach((entry, index) => {
      const meta = STATUS_META[entry.status] ?? STATUS_META.reported
      const noteLines = pdf.splitTextToSize(safeText(entry.note), contentWidth - 76)
      const timeText = formatDateTime(entry.timestamp)
      const cardHeight = Math.max(64, noteLines.length * 14 + 42)
      ensureSpace(cardHeight + 8)
      pdf.setDrawColor(...COLORS.border)
      pdf.setFillColor(...COLORS.cardBg)
      pdf.roundedRect(margin, y, contentWidth, cardHeight, 8, 8, 'FD')
      pdf.setFillColor(5, 13, 26)
      pdf.circle(margin + 18, y + 20, 8, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.text(String(index + 1), margin + 18, y + 23, { align: 'center' })
      pdf.setTextColor(...COLORS.primary)
      pdf.setFontSize(11)
      pdf.text(meta.label, margin + 34, y + 19)
      pdf.setTextColor(...COLORS.body)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.text(noteLines, margin + 34, y + 35)
      pdf.setTextColor(...COLORS.muted)
      pdf.text(timeText, margin + 34, y + cardHeight - 12)
      y += cardHeight + 10
    })
  }

  resetPageDecor()

  writeSectionTitle('Complaint Overview')
  writeMetaCard([
    { label: 'Title', value: complaint.title },
    { label: 'Status', value: STATUS_META[complaint.status]?.label ?? 'Reported' },
    { label: 'Category', value: formatCategory(complaint.category, complaint.otherCategory) },
    { label: 'Reported By', value: complaint.reporterName || 'Anonymous' },
    { label: 'Reported On', value: formatDateTime(complaint.createdAt) },
    { label: 'Last Updated', value: formatDateTime(complaint.updatedAt ?? complaint.createdAt) },
  ])

  writeParagraphRow('Location', complaint.locationName)
  if (Number.isFinite(complaint.coordinates?.lat) && Number.isFinite(complaint.coordinates?.lng)) {
    writeParagraphRow('Coordinates', `${complaint.coordinates.lat.toFixed(6)}, ${complaint.coordinates.lng.toFixed(6)}`)
  }
  writeParagraphRow('Remarks', complaint.remarks || 'No remarks added yet.')

  if (complaint.aiSummary || complaint.aiSeverity) {
    writeSectionTitle('AI Analysis')
    writeParagraphRow('AI Summary', complaint.aiSummary || 'No AI summary available.')
    if (complaint.aiSeverity) {
      writeParagraphRow('AI Severity', complaint.aiSeverity.toUpperCase())
    }
  }

  if (complaint.assignedAgent) {
    writeSectionTitle('Assigned Agent')
    writeMetaCard([
      { label: 'Name', value: complaint.assignedAgent.name },
      { label: 'Role', value: complaint.assignedAgent.role },
      { label: 'Phone', value: complaint.assignedAgent.phone },
      { label: 'Ward', value: complaint.assignedAgent.ward },
      { label: 'Agent ID', value: complaint.assignedAgent.id },
    ])
  }

  if (complaint.status === 'resolved' || complaint.resolutionDescription || complaint.proofImageUrl) {
    writeSectionTitle('Resolution')
    writeParagraphRow('Resolution Description', complaint.resolutionDescription || 'No resolution description provided.')
    writeParagraphRow('Proof Image', complaint.proofImageUrl ? 'Attached in app records.' : 'No proof image attached.')
  }

  writeSectionTitle('Status Timeline')
  writeTimeline(complaint.timeline)

  const totalPages = pdf.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page)
    drawFooter(page, totalPages)
  }

  const safeComplaintNumber = safeText(complaint.complaintNumber, 'complaint-report').replaceAll('/', '-')
  pdf.save(`${safeComplaintNumber}-report.pdf`)
}
