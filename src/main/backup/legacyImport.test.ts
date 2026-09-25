import { describe, it, expect } from 'vitest'
import { legacyId, itemText, parseLegacyFile } from './legacyImport'

describe('legacyId', () => {
  it('is deterministic for the same namespace + key', () => {
    expect(legacyId('project', 'Riverside')).toBe(legacyId('project', 'Riverside'))
  })

  it('is case- and whitespace-insensitive on the key', () => {
    expect(legacyId('project', 'Riverside')).toBe(legacyId('project', '  riverside  '))
    expect(legacyId('project', 'Riverside')).toBe(legacyId('project', 'RIVERSIDE'))
  })

  it('differs across namespaces for the same key', () => {
    expect(legacyId('project', 'Same Name')).not.toBe(legacyId('super', 'Same Name'))
  })

  it('differs across keys within the same namespace', () => {
    expect(legacyId('project', 'A')).not.toBe(legacyId('project', 'B'))
  })

  it('produces a UUID-shaped string', () => {
    expect(legacyId('project', 'Riverside')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })
})

describe('itemText', () => {
  it('prefers text, then name, then label', () => {
    expect(itemText({ text: ' Toolbox talk ' })).toBe('Toolbox talk')
    expect(itemText({ name: 'From name field' })).toBe('From name field')
    expect(itemText({ label: 'From label field' })).toBe('From label field')
    expect(itemText({ text: 'Text wins', name: 'Not this', label: 'Not this either' })).toBe('Text wins')
  })

  it('returns empty string when nothing is present', () => {
    expect(itemText({})).toBe('')
  })
})

describe('parseLegacyFile', () => {
  it('rejects invalid JSON with a clear error', () => {
    const { data, error } = parseLegacyFile('{not json')
    expect(data).toBeNull()
    expect(error).toMatch(/not valid json/i)
  })

  it('rejects a bare JSON primitive (not an object or array)', () => {
    const { data, error } = parseLegacyFile('"just a string"')
    expect(data).toBeNull()
    expect(error).toMatch(/not a json object/i)
  })

  it('rejects a JSON array (typeof "object" in JS, but has none of the required keys)', () => {
    const { data, error } = parseLegacyFile('[1, 2, 3]')
    expect(data).toBeNull()
    expect(error).toMatch(/doesn't match the expected prototype export shape/i)
  })

  it('rejects an object missing supers/projects/walks arrays, with an actionable error', () => {
    const { data, error } = parseLegacyFile(JSON.stringify({ hello: 'world' }))
    expect(data).toBeNull()
    expect(error).toMatch(/doesn't match the expected prototype export shape/i)
    expect(error).toMatch(/tell bryce/i)
  })

  it('accepts the expected shape using "supers"', () => {
    const raw = JSON.stringify({ supers: [], projects: [], walks: [] })
    const { data, error } = parseLegacyFile(raw)
    expect(error).toBeNull()
    expect(data).toEqual({ supers: [], projects: [], walks: [] })
  })

  it('also accepts "superintendents" as an alias for "supers"', () => {
    const raw = JSON.stringify({ superintendents: [{ name: 'Bryce' }], projects: [], walks: [] })
    const { data, error } = parseLegacyFile(raw)
    expect(error).toBeNull()
    expect(data?.superintendents).toHaveLength(1)
  })

  it('rejects when one of the three required arrays is not actually an array', () => {
    const raw = JSON.stringify({ supers: [], projects: 'oops', walks: [] })
    const { data, error } = parseLegacyFile(raw)
    expect(data).toBeNull()
    expect(error).toBeTruthy()
  })
})
