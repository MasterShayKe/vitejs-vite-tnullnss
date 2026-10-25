import type { Club } from '../game/types'

export const CLUBS: Club[] = [
  { id: 'northbridge', name: 'Northbridge City', short: 'NBC', city: 'Northbridge', stadium: 'The Causeway', primary: '#6cabdd', secondary: '#1c2c5b', tier: 1 },
  { id: 'ravenshall', name: 'Ravenshall United', short: 'RAV', city: 'Ravenshall', stadium: 'Raven Park', primary: '#da291c', secondary: '#ffffff', tier: 1 },
  { id: 'kingsmere', name: 'Kingsmere FC', short: 'KNG', city: 'Kingsmere', stadium: 'Crown Road', primary: '#034694', secondary: '#dba111', tier: 1 },
  { id: 'harrowgate', name: 'Harrowgate Athletic', short: 'HAR', city: 'Harrowgate', stadium: 'Spa Lane', primary: '#ef0107', secondary: '#063672', tier: 2 },
  { id: 'portellery', name: 'Port Ellery', short: 'PEL', city: 'Port Ellery', stadium: 'Harbour Field', primary: '#c8102e', secondary: '#00b2a9', tier: 2 },
  { id: 'castlebrook', name: 'Castlebrook Rovers', short: 'CAS', city: 'Castlebrook', stadium: 'Brook Lane', primary: '#132257', secondary: '#ffffff', tier: 2 },
  { id: 'westmoor', name: 'Westmoor Town', short: 'WES', city: 'Westmoor', stadium: 'Moorside', primary: '#7a263a', secondary: '#fbee23', tier: 2 },
  { id: 'silverdale', name: 'Silverdale FC', short: 'SIL', city: 'Silverdale', stadium: 'The Dale', primary: '#9ca3af', secondary: '#111827', tier: 3 },
  { id: 'oakhaven', name: 'Oakhaven Wanderers', short: 'OAK', city: 'Oakhaven', stadium: 'Acorn Ground', primary: '#2e7d32', secondary: '#ffffff', tier: 3 },
  { id: 'thornbury', name: 'Thornbury Albion', short: 'THO', city: 'Thornbury', stadium: 'Thornbury Park', primary: '#ffffff', secondary: '#0b0b0b', tier: 3 },
  { id: 'eastfield', name: 'Eastfield Rangers', short: 'EAS', city: 'Eastfield', stadium: 'East Meadow', primary: '#1d4ed8', secondary: '#f97316', tier: 3 },
  { id: 'marlow', name: 'Marlow Forest', short: 'MAR', city: 'Marlow', stadium: 'Forest Edge', primary: '#dd0000', secondary: '#ffffff', tier: 3 },
  { id: 'ashcombe', name: 'Ashcombe United', short: 'ASH', city: 'Ashcombe', stadium: 'Ash Grove', primary: '#f59e0b', secondary: '#000000', tier: 4 },
  { id: 'greywick', name: 'Greywick Town', short: 'GRE', city: 'Greywick', stadium: 'Wick Road', primary: '#5b21b6', secondary: '#ffffff', tier: 4 },
  { id: 'brindlewood', name: 'Brindlewood FC', short: 'BRI', city: 'Brindlewood', stadium: 'The Copse', primary: '#fbbf24', secondary: '#7c2d12', tier: 4 },
  { id: 'stonebridge', name: 'Stonebridge Athletic', short: 'STO', city: 'Stonebridge', stadium: 'Bridge End', primary: '#0ea5e9', secondary: '#ffffff', tier: 4 },
  { id: 'fenwick', name: 'Fenwick Orient', short: 'FEN', city: 'Fenwick', stadium: 'Fen Road', primary: '#dc2626', secondary: '#ffffff', tier: 4 },
  { id: 'lowmoor', name: 'Lowmoor Villa', short: 'LOW', city: 'Lowmoor', stadium: 'Villa Meadow', primary: '#881337', secondary: '#7dd3fc', tier: 5 },
  { id: 'dunmere', name: 'Dunmere Celtic', short: 'DUN', city: 'Dunmere', stadium: 'Celtic Field', primary: '#16a34a', secondary: '#ffffff', tier: 5 },
  { id: 'saltcliffe', name: 'Saltcliffe Argyle', short: 'SAL', city: 'Saltcliffe', stadium: 'Cliff Top', primary: '#064e3b', secondary: '#ffffff', tier: 5 },
]

export const CLUB_BY_ID: Record<string, Club> = Object.fromEntries(CLUBS.map((c) => [c.id, c]))
