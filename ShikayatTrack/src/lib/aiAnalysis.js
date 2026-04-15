/**
 * AI image analysis using Google Gemini Vision.
 * Uses a hybrid approach: Gemini output + deterministic keyword inference.
 * Analyzes a civic complaint image and returns:
 * - detectedCategory: best matching category key
 * - confidence: 'high' | 'medium' | 'low'
 * - summary: short AI-generated description of the issue
 */

const CATEGORY_HINTS = {
  water: ['water leak', 'pipe burst', 'water logging', 'flood', 'puddle', 'wet road', 'water supply'],
  sewage: ['sewage', 'drain overflow', 'manhole', 'sewer', 'foul smell', 'waste water'],
  road: ['pothole', 'road damage', 'broken road', 'crack', 'asphalt', 'road repair'],
  footpath: ['footpath', 'pavement', 'sidewalk', 'broken slab', 'pedestrian'],
  electricity: ['electric pole', 'wire', 'cable', 'transformer', 'power line', 'electrical'],
  streetlight: ['street light', 'lamp post', 'light not working', 'dark road'],
  garbage: ['garbage', 'trash', 'waste', 'litter', 'dump', 'rubbish', 'bin overflow'],
  sanitation: ['sanitation', 'dirty', 'filth', 'unhygienic', 'cleaning'],
  tree: ['tree', 'branch', 'fallen tree', 'uprooted', 'overgrown'],
  garden: ['garden', 'park', 'grass', 'plants', 'overgrown'],
  stray_animals: ['dog', 'animal', 'stray', 'cattle', 'cow', 'pig'],
  noise: ['noise', 'loud', 'speaker', 'construction noise'],
  encroachment: ['encroachment', 'illegal', 'blocked road', 'obstruction'],
  drainage: ['drain', 'drainage', 'blocked drain', 'clogged'],
  flooding: ['flood', 'waterlogged', 'inundated', 'submerged'],
  building: ['building', 'construction', 'structure', 'wall', 'collapse'],
  other: [],
}

const ALLOWED_CATEGORIES = new Set(Object.keys(CATEGORY_HINTS))
const ALLOWED_CONFIDENCE = new Set(['high', 'medium', 'low'])
const ALLOWED_SEVERITY = new Set(['critical', 'moderate', 'minor'])

export async function analyzeComplaintImage(base64DataUrl, options = {}) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    return simulateAnalysis()
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(apiKey)

    const base64Data = base64DataUrl.split(',')[1]
    const mimeType = base64DataUrl.split(';')[0].split(':')[1]
    const contextText = normalizeContextText(options.contextText)

    const optionalHint = contextText ? `Optional text hint from filename/caption: "${contextText}"` : ''
    const prompt = [
      'You are a strict civic complaint image analyzer.',
      'Return ONLY valid minified JSON with no markdown or extra text.',
      '',
      'Look at this image and:',
      '1. Identify the civic issue shown (pothole, water leak, garbage, broken streetlight, sewage overflow, fallen tree, etc.)',
      '2. Return a JSON object with:',
      '   - "category": one of [water, sewage, road, footpath, electricity, streetlight, garbage, sanitation, tree, garden, stray_animals, drainage, flooding, building, encroachment, noise, other]',
      '   - "confidence": "high", "medium", or "low"',
      '   - "summary": a 1-sentence description of the issue for a city official (max 20 words)',
      '   - "severity": "critical", "moderate", or "minor"',
      '   - "evidence_keywords": array of up to 5 short visual cues from the image (for example ["pothole","broken asphalt"])',
      '   - "location_text": short location text visible in image (for example street/area name written on signboard/caption). Use empty string if none.',
      '3. IMPORTANT mapping rules:',
      '   - pothole/broken asphalt/cracked lane => road',
      '   - gutter/manhole overflow/wastewater in drain => sewage or drainage',
      '   - garbage piles/bin overflow/litter => garbage',
      '   - non-working lamp post/night dark road => streetlight',
      '   - hanging electrical wires/sparking pole => electricity',
      '   - water leakage/pipe burst/water pooling => water (use flooding only when large-area inundation is visible)',
      '4. If issue is not clearly visible, use category "other", confidence "low", and severity "moderate".',
      optionalHint,
    ].filter(Boolean).join('\n')

    const parsed = await generateAndParseWithFallback(genAI, prompt, { data: base64Data, mimeType })
    const normalizedSummary = normalizeSummary(parsed?.summary)
    const heuristic = inferCategoryFromText([
      contextText,
      normalizedSummary,
      parsed?.category,
      ...(Array.isArray(parsed?.evidence_keywords) ? parsed.evidence_keywords : []),
    ])
    const category = chooseBestCategory(parsed?.category, parsed?.confidence, heuristic)
    const confidence = chooseBestConfidence(parsed?.confidence, heuristic, category)
    const locationText = normalizeLocationText(parsed?.location_text)
    const locationCoords = await geocodeLocationText(locationText)

    return {
      detectedCategory: category,
      confidence,
      summary: normalizedSummary,
      severity: normalizeSeverity(parsed?.severity),
      locationText,
      locationCoords,
    }
  } catch {
    return simulateAnalysis()
  }
}

function simulateAnalysis() {
  // Stable fallback to avoid random wrong suggestions when API is unavailable.
  return {
    detectedCategory: 'other',
    confidence: 'low',
    summary: 'Unable to confidently classify from image. Please verify category manually.',
    severity: 'moderate',
    locationText: '',
    locationCoords: null,
  }
}

function parseJsonFromModelText(text) {
  try {
    return JSON.parse(text)
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim())
      } catch {
        // continue
      }
    }
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1))
      } catch {
        // continue
      }
    }
    return {}
  }
}

async function generateAndParseWithFallback(genAI, prompt, inlineData) {
  const preferredModel = String(import.meta.env.VITE_GEMINI_MODEL || '').trim()
  const models = [
    preferredModel,
    'gemini-2.5-flash',
    'gemini-1.5-flash',
  ].filter(Boolean)

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent([prompt, { inlineData }])
      const text = result.response.text().trim()
      const parsed = parseJsonFromModelText(text)
      if (parsed && typeof parsed === 'object') {
        return parsed
      }
    } catch {
      // Try next model.
    }
  }
  return {}
}

function normalizeCategory(value) {
  const key = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  return ALLOWED_CATEGORIES.has(key) ? key : 'other'
}

function normalizeConfidence(value) {
  const key = String(value ?? '').trim().toLowerCase()
  return ALLOWED_CONFIDENCE.has(key) ? key : 'medium'
}

function normalizeSeverity(value) {
  const key = String(value ?? '').trim().toLowerCase()
  return ALLOWED_SEVERITY.has(key) ? key : 'moderate'
}

function normalizeSummary(value) {
  const summary = String(value ?? '').trim()
  return summary || 'Civic issue detected. Please review details.'
}

function normalizeLocationText(value) {
  const location = String(value ?? '').trim()
  return location.length > 2 ? location : ''
}

function normalizeContextText(value) {
  const text = String(value ?? '')
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
  return text.slice(0, 80)
}

function inferCategoryFromText(parts) {
  const text = parts
    .map((item) => String(item ?? '').toLowerCase())
    .join(' ')
    .replace(/[_-]+/g, ' ')

  const scores = {}
  for (const [category, hints] of Object.entries(CATEGORY_HINTS)) {
    if (category === 'other') continue
    let score = 0
    for (const hint of hints) {
      if (text.includes(hint.toLowerCase())) score += 1
    }
    if (score > 0) scores[category] = score
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
  if (!ranked.length) return { category: 'other', score: 0 }
  return { category: ranked[0][0], score: ranked[0][1] }
}

function chooseBestCategory(rawCategory, rawConfidence, heuristic) {
  const modelCategory = normalizeCategory(rawCategory)
  const modelConfidence = normalizeConfidence(rawConfidence)
  const heuristicHasStrongSignal = heuristic.score >= 2

  if (modelCategory === 'other' && heuristicHasStrongSignal) return heuristic.category
  if (modelConfidence === 'low' && heuristicHasStrongSignal) return heuristic.category
  return modelCategory
}

function chooseBestConfidence(rawConfidence, heuristic, finalCategory) {
  const modelConfidence = normalizeConfidence(rawConfidence)
  if (finalCategory !== 'other' && modelConfidence === 'low' && heuristic.score >= 2) {
    return 'medium'
  }
  if (finalCategory !== 'other' && modelConfidence === 'medium' && heuristic.score >= 3) {
    return 'high'
  }
  return modelConfidence
}

async function geocodeLocationText(locationText) {
  if (!locationText) return null
  try {
    const query = encodeURIComponent(`${locationText}, Pune, India`)
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null
    const result = await response.json()
    const first = Array.isArray(result) ? result[0] : null
    const lat = Number(first?.lat)
    const lng = Number(first?.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}
