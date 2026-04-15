// Realistic agent roster for ShikayatTrack
// Each agent has: id, name, phone, role, category (matches complaint categories), available

export const AGENTS = [
  // Plumbers
  { id: 'AG-001', name: 'Ramesh Patil', phone: '+91 98201 34567', role: 'Senior Plumber', categories: ['water', 'sewage'], available: true, ward: 'Shivaji Nagar' },
  { id: 'AG-002', name: 'Suresh Kamble', phone: '+91 97302 45678', role: 'Plumber', categories: ['water', 'sewage'], available: true, ward: 'Kothrud' },
  { id: 'AG-003', name: 'Dinesh Jadhav', phone: '+91 96403 56789', role: 'Plumber', categories: ['water', 'sewage'], available: false, ward: 'Hadapsar' },
  { id: 'AG-004', name: 'Manoj Shinde', phone: '+91 95504 67890', role: 'Pipeline Technician', categories: ['water', 'sewage'], available: true, ward: 'Pimpri' },

  // Electricians
  { id: 'AG-005', name: 'Vijay Kulkarni', phone: '+91 94605 78901', role: 'Senior Electrician', categories: ['electricity', 'streetlight'], available: true, ward: 'Deccan' },
  { id: 'AG-006', name: 'Anil Deshmukh', phone: '+91 93706 89012', role: 'Electrician', categories: ['electricity', 'streetlight'], available: true, ward: 'Aundh' },
  { id: 'AG-007', name: 'Prakash Bhosale', phone: '+91 92807 90123', role: 'Electrical Technician', categories: ['electricity', 'streetlight'], available: false, ward: 'Baner' },
  { id: 'AG-008', name: 'Santosh Mane', phone: '+91 91908 01234', role: 'Lineman', categories: ['electricity', 'streetlight'], available: true, ward: 'Wakad' },

  // Road Repair
  { id: 'AG-009', name: 'Ganesh Pawar', phone: '+91 90009 12345', role: 'Road Engineer', categories: ['road', 'footpath'], available: true, ward: 'University Circle' },
  { id: 'AG-010', name: 'Raju Thorat', phone: '+91 89110 23456', role: 'Road Repair Crew Lead', categories: ['road', 'footpath'], available: true, ward: 'Swargate' },
  { id: 'AG-011', name: 'Kiran Salve', phone: '+91 88211 34567', role: 'Pothole Repair Specialist', categories: ['road', 'footpath'], available: false, ward: 'Katraj' },
  { id: 'AG-012', name: 'Nilesh Gaikwad', phone: '+91 87312 45678', role: 'Civil Technician', categories: ['road', 'footpath'], available: true, ward: 'Bibwewadi' },

  // Sanitation / Cleaners
  { id: 'AG-013', name: 'Priya Waghmare', phone: '+91 86413 56789', role: 'Sanitation Supervisor', categories: ['garbage', 'sanitation'], available: true, ward: 'Bhavani Peth' },
  { id: 'AG-014', name: 'Sunita Lokhande', phone: '+91 85514 67890', role: 'Waste Management Officer', categories: ['garbage', 'sanitation'], available: true, ward: 'Kasba Peth' },
  { id: 'AG-015', name: 'Rekha Dhole', phone: '+91 84615 78901', role: 'Sanitation Worker', categories: ['garbage', 'sanitation'], available: false, ward: 'Nana Peth' },
  { id: 'AG-016', name: 'Kavita Jagtap', phone: '+91 83716 89012', role: 'Cleanliness Inspector', categories: ['garbage', 'sanitation'], available: true, ward: 'Ganj Peth' },

  // Tree / Garden
  { id: 'AG-017', name: 'Balaji Nimkar', phone: '+91 82817 90123', role: 'Horticulture Officer', categories: ['tree', 'garden'], available: true, ward: 'Koregaon Park' },
  { id: 'AG-018', name: 'Sanjay Kale', phone: '+91 81918 01234', role: 'Tree Trimming Specialist', categories: ['tree', 'garden'], available: true, ward: 'Viman Nagar' },

  // Stray Animals
  { id: 'AG-019', name: 'Dr. Meena Raut', phone: '+91 80019 12345', role: 'Animal Control Officer', categories: ['stray_animals'], available: true, ward: 'Yerawada' },
  { id: 'AG-020', name: 'Hemant Chavan', phone: '+91 79120 23456', role: 'Animal Welfare Inspector', categories: ['stray_animals'], available: false, ward: 'Dhanori' },

  // Noise / Encroachment
  { id: 'AG-021', name: 'Inspector Rajendra More', phone: '+91 78221 34567', role: 'Ward Inspector', categories: ['noise', 'encroachment', 'other'], available: true, ward: 'Shivajinagar' },
  { id: 'AG-022', name: 'Sub-Inspector Pooja Naik', phone: '+91 77322 45678', role: 'Civic Enforcement Officer', categories: ['noise', 'encroachment', 'other'], available: true, ward: 'Camp' },

  // Building / Construction
  { id: 'AG-023', name: 'Architect Sunil Joshi', phone: '+91 76423 56789', role: 'Building Inspector', categories: ['building', 'construction'], available: true, ward: 'Sadashiv Peth' },
  { id: 'AG-024', name: 'Deepak Kulkarni', phone: '+91 75524 67890', role: 'Structural Engineer', categories: ['building', 'construction'], available: false, ward: 'Narayan Peth' },

  // Drainage
  { id: 'AG-025', name: 'Ashok Bhalerao', phone: '+91 74625 78901', role: 'Drainage Engineer', categories: ['drainage', 'flooding'], available: true, ward: 'Erandwane' },
  { id: 'AG-026', name: 'Nitin Wagh', phone: '+91 73726 89012', role: 'Drainage Technician', categories: ['drainage', 'flooding'], available: true, ward: 'Karve Nagar' },
]

/**
 * Find the best available agent for a given category.
 * Returns the first available agent matching the category, or any available agent as fallback.
 */
export function assignAgent(category) {
  const available = AGENTS.filter((a) => a.available)
  const match = available.find((a) => a.categories.includes(category))
  return match ?? available[0] ?? AGENTS[0]
}

/**
 * Get agent by ID
 */
export function getAgentById(id) {
  return AGENTS.find((a) => a.id === id) ?? null
}
