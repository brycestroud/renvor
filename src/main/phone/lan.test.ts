import { describe, it, expect } from 'vitest'
import type { NetworkInterfaceInfo } from 'os'
import {
  rankLanAddresses,
  isPrivateClientAddress,
  isAllowedClient,
  isTailscaleAddress,
  tokensEqual,
  buildPhoneAiPrompt
} from './lan'

const v4 = (address: string, internal = false): NetworkInterfaceInfo =>
  ({ address, family: 'IPv4', internal }) as NetworkInterfaceInfo

describe('rankLanAddresses', () => {
  it('puts a normal Wi-Fi 192.168 address ahead of virtual adapters and skips loopback/link-local', () => {
    const result = rankLanAddresses({
      'vEthernet (WSL)': [v4('172.20.0.1')],
      Loopback: [v4('127.0.0.1', true)],
      'Wi-Fi': [v4('192.168.1.42')],
      Ethernet: [v4('169.254.10.10')]
    })
    expect(result.map((r) => r.address)).toEqual(['192.168.1.42', '172.20.0.1'])
  })

  it('prefers 10.x over 172.x, and ignores IPv6', () => {
    const result = rankLanAddresses({
      a: [v4('172.16.5.5')],
      b: [v4('10.0.0.8'), { address: 'fe80::1', family: 'IPv6', internal: false } as NetworkInterfaceInfo]
    })
    expect(result.map((r) => r.address)).toEqual(['10.0.0.8', '172.16.5.5'])
  })
})

describe('Tailscale', () => {
  it('recognizes only the 100.64.0.0/10 block', () => {
    for (const a of ['100.64.0.1', '100.95.60.150', '100.127.255.254']) expect(isTailscaleAddress(a)).toBe(true)
    for (const a of ['100.63.255.255', '100.128.0.1', '10.100.64.1', '192.168.100.64']) expect(isTailscaleAddress(a)).toBe(false)
  })

  it('does not mistake a carrier-NAT 100.x address on a cellular adapter for Tailscale', () => {
    const result = rankLanAddresses({ Cellular: [v4('100.95.60.150')], 'Wi-Fi': [v4('192.168.1.40')] })
    expect(result).toEqual([{ name: 'Wi-Fi', address: '192.168.1.40', kind: 'lan' }])
  })

  it('ranks the Tailscale address first and labels each address kind', () => {
    const result = rankLanAddresses({
      'Wi-Fi': [v4('192.168.1.40')],
      Tailscale: [v4('100.95.60.150')]
    })
    expect(result).toEqual([
      { name: 'Tailscale', address: '100.95.60.150', kind: 'tailscale' },
      { name: 'Wi-Fi', address: '192.168.1.40', kind: 'lan' }
    ])
  })

  it('accepts a 100.x client only when it arrived on the Tailscale adapter', () => {
    const ts = ['100.90.1.2']
    expect(isAllowedClient('100.101.102.103', '100.90.1.2', ts)).toBe(true)
    expect(isAllowedClient('::ffff:100.64.1.1', '::ffff:100.90.1.2', ts)).toBe(true)
    expect(isAllowedClient('100.101.102.103', '100.95.60.150', ts)).toBe(false)
    expect(isAllowedClient('100.101.102.103', undefined, ts)).toBe(false)
    expect(isAllowedClient('100.101.102.103', '100.90.1.2', [])).toBe(false)
    expect(isAllowedClient('192.168.1.9', '192.168.1.40', [])).toBe(true)
    expect(isAllowedClient('8.8.8.8', '192.168.1.40', ts)).toBe(false)
  })

  it('prompt covers Tailscale and the narrow firewall rule', () => {
    const p = buildPhoneAiPrompt(39213)
    expect(p).toContain('Tailscale')
    expect(p).toContain('100.64.0.0/10')
  })
})

describe('isPrivateClientAddress', () => {
  it('accepts LAN clients, including IPv4-mapped IPv6', () => {
    for (const a of ['192.168.1.9', '10.1.2.3', '172.16.0.1', '172.31.9.9', '::ffff:192.168.1.9', '127.0.0.1', 'fe80::abcd']) {
      expect(isPrivateClientAddress(a)).toBe(true)
    }
  })
  it('rejects public and malformed addresses', () => {
    for (const a of ['8.8.8.8', '172.32.0.1', '::ffff:8.8.8.8', '2001:db8::1', '', undefined]) {
      expect(isPrivateClientAddress(a)).toBe(false)
    }
  })
})

describe('tokensEqual / prompt', () => {
  it('compares tokens exactly, including length', () => {
    expect(tokensEqual('abc', 'abc')).toBe(true)
    expect(tokensEqual('abc', 'abd')).toBe(false)
    expect(tokensEqual('abc', 'abcd')).toBe(false)
  })
  it('AI prompt names the port and never embeds a link', () => {
    const p = buildPhoneAiPrompt(39213)
    expect(p).toContain('39213')
    expect(p).not.toContain('http://')
  })
})
