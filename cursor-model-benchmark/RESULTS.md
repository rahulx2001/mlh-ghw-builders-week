# Cursor model benchmark: Unicode grapheme-aware string reverse

**Prompt (identical for every run):** Write a Python function that reverses a string, handling Unicode grapheme clusters (emoji, combining accents) correctly, with docstring and pytest tests.

## Composer 2.5

| Field | Value |
| --- | --- |
| **Model** | Composer 2.5 |
| **Implementation** | `cursor-model-benchmark/composer-2.5/reverse.py` (159 lines) |
| **Tests** | `cursor-model-benchmark/composer-2.5/test_reverse.py` (54 lines) |
| **Dependencies** | Standard library only (`unicodedata`) |
| **Tests passed** | 9 |
| **Tests failed** | 0 |

### Pros

- No third-party packages; works with `unicodedata` and documented stdlib limits in the module docstring.
- Covers common real-world cases in tests: ASCII, decomposed/precomposed accents, emoji, skin tones, regional-indicator flags, and ZWJ family sequences.
- `reverse_string()` has a clear docstring; helpers separate cluster iteration from property checks.
- All 9 pytest cases passed on Python 3.12.3 (see `composer-2.5/pytest_output.txt`).

### Cons

- Python’s standard library does **not** expose full UAX #29 grapheme breaking (no `Extended_Pictographic` property or official cluster iterator), so the solution uses hand-rolled rules and codepoint-range heuristics for pictographs.
- Complex scripts (e.g. Hangul jamo composition, full Indic conjunct rules, rare prepend/extend cases) are not comprehensively implemented.
- ~160 lines of implementation for one function is heavier than a library-backed `\\X` or `grapheme`-based approach.
- Correctness for arbitrary Unicode is not guaranteed—only the behaviors exercised by this run’s tests were verified.

## Grok 4.7

| Field | Value |
| --- | --- |
| **Model** | Grok 4.7 (low effort) |
| **Implementation** | `cursor-model-benchmark/grok-4.7/reverse.py` (111 lines) |
| **Tests** | `cursor-model-benchmark/grok-4.7/test_reverse.py` (55 lines) |
| **Dependencies** | Standard library only (`unicodedata`) |
| **Tests passed** | 9 |
| **Tests failed** | 0 |

### Pros

- Standard library only, with the UAX #29 gap stated in the module docstring.
- `reverse_string` docstring describes the contract and the clusters it keeps intact.
- Tests cover decomposed and stacked combining marks, precomposed text, skin-tone emoji, a flag, a ZWJ sequence, a keycap, and double-reversal identity.
- Saved pytest output reports 9 passed and 0 failed on Python 3.12.3 (`grok-4.7/pytest_output.txt`).

### Cons

- Pictographic detection is a code-point range plus a short allow-list, so some ZWJ sequences and newer emoji can split.
- Hangul syllable composition, Indic conjuncts, and other prepend/spacing rules from UAX #29 are not implemented.
- Regional indicators are always paired from the start of a run, which matches flags but is not a full RI state machine for odd-length runs mixed with other extenders.
- Passing this file’s tests does not mean every Unicode string reverses the way a `\X` breaker would.
