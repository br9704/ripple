import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFilterStore } from '@/stores/filterStore'

interface City {
  id: string
  slug: string
  name: string
  state: string
}

/**
 * City selection (S20.4).
 *
 * Renders nothing when there is only one active city — a selector with one
 * option is a control that teaches the user the product is smaller than they
 * hoped. It appears automatically the moment a second city is seeded, which is
 * the behaviour that makes it worth building before there is a second city.
 */
export function CitySelector() {
  const [cities, setCities] = useState<City[]>([])
  const { cityId, setCity } = useFilterStore()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('cities')
        .select('id, slug, name, state')
        .eq('is_active', true)
        .order('name')
      if (!cancelled) setCities((data as City[]) ?? [])
    })()
    return () => { cancelled = true }
  }, [])

  if (cities.length < 2) return null

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Choose a city</span>
      <select
        value={cityId ?? ''}
        onChange={(e) => setCity(e.target.value || null)}
        className="border border-border-bright bg-bg-secondary px-2 py-1 font-mono text-xs text-text-primary focus:border-action focus:outline-none"
      >
        <option value="">all cities</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}, {c.state}
          </option>
        ))}
      </select>
    </label>
  )
}
