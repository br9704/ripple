export interface GeocodedLocation {
  /** Full formatted address: "123 Smith St, Fitzroy, VIC" */
  address: string
  /** Suburb/locality: "Fitzroy" */
  suburb: string
  /** Postcode: "3065" */
  postcode: string
}

interface MapboxContext {
  id: string
  text: string
}

interface MapboxFeature {
  place_name: string
  context?: MapboxContext[]
}

interface MapboxResponse {
  features: MapboxFeature[]
}

/**
 * Reverse geocodes coordinates to a street address using the Mapbox Geocoding API.
 * Returns null if offline, token missing, or API fails — graceful degradation.
 * Raw coordinates should be stored in the report regardless of geocoding success.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodedLocation | null> {
  // Skip if offline
  if (!navigator.onLine) return null

  const token = import.meta.env.VITE_MAPBOX_TOKEN
  if (!token) return null

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address&limit=1`
    const response = await fetch(url)

    if (!response.ok) return null

    const data: MapboxResponse = await response.json()
    const feature = data.features?.[0]

    if (!feature) return null

    // Extract suburb and postcode from context
    const context = feature.context ?? []
    const suburb = context.find((c) => c.id.startsWith('locality'))?.text
      ?? context.find((c) => c.id.startsWith('place'))?.text
      ?? ''
    const postcode = context.find((c) => c.id.startsWith('postcode'))?.text ?? ''

    return {
      address: feature.place_name,
      suburb,
      postcode,
    }
  } catch {
    // Network error or parse failure — graceful degradation
    return null
  }
}
