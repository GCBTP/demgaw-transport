export const SENEGAL_REGIONS_WITH_STATIONS = [
  {
    region: 'Dakar',
    stations: [
      'Gare Routiere de Pompiers (Dakar Plateau)',
      'Gare Routiere de Petersen',
      'Gare Routiere de Colobane',
      'Gare Routiere de Parcelles Assainies',
      'Gare Routiere de Liberte 6',
      'Gare Routiere de Yoff / Aeroport',
      'Gare Routiere de Pikine',
      'Gare Routiere de Guediawaye',
      'Gare Routiere de Rufisque',
      'Gare de Thiaroye',
      'Gare de Bargny',
    ],
  },
  {
    region: 'Thiès',
    stations: [
      'Gare Routiere de Thiès (principale)',
      'Gare Routiere de Mbour',
      'Gare Routiere de Tivaouane',
      'Gare Routiere de Khombole',
      'Gare de Pout',
      'Gare de Joal-Fadiouth',
    ],
  },
  {
    region: 'Diourbel',
    stations: [
      'Gare Routiere de Diourbel',
      'Gare Routiere de Touba',
      'Gare Routiere de Mbacke',
      'Gare de Bambey',
    ],
  },
  {
    region: 'Louga',
    stations: [
      'Gare Routiere de Louga',
      'Gare Routiere de Linguere',
      'Gare de Kebemer',
      'Gare de Dahra',
    ],
  },
  {
    region: 'Kaolack',
    stations: [
      'Gare Routiere de Kaolack (Leone)',
      'Gare Routiere de Nioro du Rip',
      'Gare de Guinguineo',
      'Gare de Kaffrine',
    ],
  },
  {
    region: 'Kaffrine',
    stations: [
      'Gare Routiere de Kaffrine',
      'Gare de Koungheul',
      'Gare de Birkelane',
      'Gare de Malem-Hodar',
    ],
  },
  {
    region: 'Fatick',
    stations: [
      'Gare Routiere de Fatick',
      'Gare Routiere de Foundiougne',
      'Gare de Gossas',
      'Gare de Sokone',
    ],
  },
  {
    region: 'Ziguinchor',
    stations: [
      'Gare Routiere de Ziguinchor',
      'Gare de Bignona',
      "Gare d'Oussouye",
      'Gare de Kafountine',
    ],
  },
  {
    region: 'Kolda',
    stations: [
      'Gare Routiere de Kolda',
      'Gare de Velingara',
      'Gare de Medina Yoro Foulah',
    ],
  },
  {
    region: 'Sédhiou',
    stations: [
      'Gare Routiere de Sedhiou',
      'Gare de Goudomp',
      'Gare de Marsassoum',
    ],
  },
  {
    region: 'Tambacounda',
    stations: [
      'Gare Routiere de Tambacounda',
      'Gare de Bakel',
      'Gare de Goudiry',
      'Gare de Koumpentoum',
    ],
  },
  {
    region: 'Kédougou',
    stations: [
      'Gare Routiere de Kedougou',
      'Gare de Saraya',
      'Gare de Salemata',
    ],
  },
  {
    region: 'Saint-Louis',
    stations: [
      'Gare Routiere de Saint-Louis',
      'Gare de Podor',
      'Gare de Richard-Toll',
      'Gare de Dagana',
      'Gare de Rosso-Senegal',
    ],
  },
  {
    region: 'Matam',
    stations: [
      'Gare Routiere de Matam',
      'Gare de Kanel',
      'Gare de Ranerou',
      "Gare d'Ourossogui",
    ],
  },
]

export const SENEGAL_REGIONS = SENEGAL_REGIONS_WITH_STATIONS.map((entry) => entry.region)

export function makeStationValue(region, station) {
  return `${region}::${station}`
}

export function parseStationValue(value) {
  if (!value || !value.includes('::')) return null
  const [region, ...stationParts] = value.split('::')
  const station = stationParts.join('::')
  if (!region || !station) return null
  return { region, station }
}

export const ALL_STATION_OPTIONS = SENEGAL_REGIONS_WITH_STATIONS.flatMap((entry) =>
  entry.stations.map((station) => ({
    region: entry.region,
    station,
    value: makeStationValue(entry.region, station),
    label: `${station} - ${entry.region}`,
  })),
)

const STATION_VALUE_SET = new Set(ALL_STATION_OPTIONS.map((opt) => opt.value))
const STATIONS_BY_REGION = new Map(
  SENEGAL_REGIONS_WITH_STATIONS.map((entry) => [
    entry.region,
    ALL_STATION_OPTIONS.filter((opt) => opt.region === entry.region),
  ]),
)
const REGION_BY_NAME = new Map(SENEGAL_REGIONS_WITH_STATIONS.map((entry) => [entry.region, entry]))

export function isKnownStationValue(value) {
  return STATION_VALUE_SET.has(value)
}

export function formatStationLabel(value) {
  const parsed = parseStationValue(value)
  if (!parsed) return String(value ?? '')
  return `${parsed.station} - ${parsed.region}`
}

export function getStationOptionsByRegion(region) {
  return STATIONS_BY_REGION.get(region) ?? []
}

export function coerceToStationValue(value) {
  if (isKnownStationValue(value)) return value
  if (typeof value !== 'string') return DEFAULT_ROUTE.from
  const region = REGION_BY_NAME.get(value.trim())
  if (!region || !region.stations.length) return DEFAULT_ROUTE.from
  return makeStationValue(region.region, region.stations[0])
}

export const DEFAULT_ROUTE = {
  from: makeStationValue('Dakar', 'Gare Routiere de Pompiers (Dakar Plateau)'),
  to: makeStationValue('Thiès', 'Gare Routiere de Thiès (principale)'),
}
