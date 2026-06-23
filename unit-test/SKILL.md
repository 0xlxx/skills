---
name: unit-test
description: Write excellent unit tests — FIRST, AAA, Right-BICEP. Use when the user asks to "write tests", "add unit tests", "add tests", "this needs tests", or any scenario involving writing or reviewing unit tests.
---

<unit-test>

<core-principle>
A great unit test isn't a bug-finding tool — it's **executable documentation**. A new teammate should understand what the code does by reading the tests three months later. The baseline: FIRST — Fast, Independent, Repeatable, Self-validating, Timely. Break any of these and it's not a unit test.
</core-principle>

<rules>

### 1. AAA — every test does exactly three things

**Arrange → Act → Assert.** Separate the three sections with blank lines so intent is visible at a glance.

```javascript
test('addProduct: should update item count and total price', () => {
    // Arrange
    const cart = new ShoppingCart();
    const product = { id: 1, name: 'Book', price: 100 };

    // Act
    cart.addProduct(product);

    // Assert
    expect(cart.getItemsCount()).toBe(1);
    expect(cart.getTotalPrice()).toBe(100);
});
```

**Red flags:** no visible three-section separation, Arrange exceeds 10 lines (the unit under test is too coupled), Assert is interleaved with Act.

### 2. Right-BICEP — scan every dimension when you don't know what to test

After writing a function, run through these six letters to catch missing cases:

| Letter | Meaning | Ask yourself |
|--------|---------|-------------|
| **R**ight | Happy path | Does it return the correct result for normal input? |
| **B**oundary | Edge cases | null, empty string, 0, negative, MAX_VALUE, empty array, out-of-bounds — all covered? |
| **I**nverse | Round-trip | Encrypt→decrypt restores the original? Insert→query finds it? Sort then reverse equals reverse order? |
| **C**ross-check | Alternative verification | Can you verify the result with a different algorithm (even a brute-force one)? |
| **E**rror | Error conditions | Network down, file missing, malformed JSON — does the code handle it gracefully or crash? |
| **P**erformance | Speed | Does the core algorithm finish within a time budget (e.g. 100ms for N=1000)? |

**Heads up:** B and E are the most frequently skipped — and where most bugs live. Only apply P to hot paths.

### 3. Mock — isolate every I/O boundary

A unit test verifies **the logic of the current unit**, not the database, not the network, not the filesystem.

**Hard rule:** network requests, file I/O, database operations, `Date.now()`, `Math.random()` — mock them all. Without mocking it's an integration test, breaking Fast and Repeatable.

```javascript
// ❌ real HTTP call inside a test
const user = await fetch('/api/user/1');

// ✅ mocked
const mockFetch = vi.fn().mockResolvedValue({ id: 1, name: 'Alice' });
const user = await getUser(1, mockFetch);
expect(mockFetch).toHaveBeenCalledWith('/api/user/1');
```

**Mock smell:** if you need to mock a dozen objects just to run one test — the function under test is too coupled. Refactor it, don't add more mocks.

### 4. Naming — know what failed by reading the test name

Format: `methodUnderTest + condition + expectedResult`. Scan the test list and locate a failure instantly.

```
// ❌
test('test1')
test('calculate works')
test('edge case')

// ✅
test('calculateTax: should return 0 when income is below threshold')
test('withdraw: should throw InsufficientBalance when amount exceeds balance')
test('parseJSON: should throw MalformedError when input is empty string')
```

### 5. Three don'ts

**Don't test multiple behaviors in one test.** One `test()` asserts one business scenario. If an assertion fails mid-test, later assertions never run — you won't know which behavior broke.

```
// ❌ one test covers add, remove, and clear
// ✅ split into three tests: add, remove, clear — each fails independently
```

**Don't test implementation details.** Tests bind to inputs and outputs, not internal structure. Refactor internals without changing behavior → every test must stay green. Don't test private methods directly — cover them through the public interface.

```
// ❌ testing internals: expect(service._internalCache.size).toBe(1)
// ✅ testing behavior: expect(service.getResult()).toEqual({ ... })
```

**Don't put logic in test code.** No `if`, `for`, or `switch` in tests. Test code is a straight-line script, not a program. If your test needs control flow, the test design is wrong — split into independent cases instead of branching inside one.

</rules>

<constraints>
- After writing tests, run them: do they pass with no network and no database? → validates mock completeness
- Shuffle test execution order — do they still all pass? → validates independence
- Can a new teammate understand them at a glance three months from now? → validates naming and AAA clarity
- Refactor internals without changing behavior — do all tests stay green? → validates no implementation coupling
</constraints>

</unit-test>
