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
