import { describe, it, expect } from 'vitest'

describe('Example Test Suite', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle truthiness', () => {
    expect(true).toBeTruthy()
  })
})