"""Reverse a string by Unicode grapheme clusters, using only the standard library.

Python's standard library does not provide full Unicode grapheme segmentation
or the Extended_Pictographic property, so this module implements a practical
subset with ``unicodedata``. It keeps together combining marks, variation
selectors, emoji modifiers, regional-indicator flags, keycap sequences, and
common ZWJ emoji chains. That covers the benchmark's target cases, but it is
not a complete UAX #29 implementation.
"""

from __future__ import annotations

import unicodedata

ZWJ = "\u200d"
VS16 = "\ufe0f"
KEYCAP = "\u20e3"


def reverse_string(text: str) -> str:
    """Return *text* with its grapheme clusters reversed."""
    return "".join(reversed(_graphemes(text)))


def _graphemes(text: str) -> list[str]:
    clusters: list[str] = []
    i = 0
    while i < len(text):
        j = _cluster_end(text, i)
        clusters.append(text[i:j])
        i = j
    return clusters


def _cluster_end(text: str, start: int) -> int:
    j = start + 1
    while j < len(text):
        if _should_join(text, start, j):
            j += 1
            continue
        break
    return j


def _should_join(text: str, start: int, j: int) -> bool:
    prev = text[j - 1]
    curr = text[j]

    if prev == "\r" and curr == "\n":
        return True

    if _is_control(prev) or _is_control(curr):
        return False

    if _is_regional_indicator(prev) and _is_regional_indicator(curr):
        return _ri_run_length(text, start, j) % 2 == 1

    if _is_extend(curr):
        return True

    if prev == ZWJ and _is_emojiish(curr):
        return _starts_emoji_zwj_chain(text, start, j - 1)

    if curr == ZWJ and _is_emojiish(prev):
        return True

    if _is_emoji_modifier(curr) and _is_emojiish(prev):
        return True

    if curr == KEYCAP and (prev.isdigit() or prev in {"#", "*", VS16}):
        return True

    return False


def _starts_emoji_zwj_chain(text: str, start: int, zwj_index: int) -> bool:
    k = zwj_index - 1
    while k >= start:
        ch = text[k]
        if _is_extend(ch):
            k -= 1
            continue
        return _is_emojiish(ch)
    return False


def _ri_run_length(text: str, start: int, j: int) -> int:
    count = 0
    k = j - 1
    while k >= start and _is_regional_indicator(text[k]):
        count += 1
        k -= 1
    return count


def _is_extend(ch: str) -> bool:
    if ch in {ZWJ, VS16}:
        return True
    if 0xFE00 <= ord(ch) <= 0xFE0F:
        return True
    if 0x1F3FB <= ord(ch) <= 0x1F3FF:
        return True
    return unicodedata.combining(ch) != 0 or unicodedata.category(ch) in {"Mn", "Me", "Mc"}


def _is_emoji_modifier(ch: str) -> bool:
    return 0x1F3FB <= ord(ch) <= 0x1F3FF


def _is_regional_indicator(ch: str) -> bool:
    return 0x1F1E6 <= ord(ch) <= 0x1F1FF


def _is_control(ch: str) -> bool:
    if ch in {"\r", "\n", ZWJ}:
        return False
    return unicodedata.category(ch) in {"Cc", "Cf", "Zl", "Zp"} and ch not in {VS16}


def _is_emojiish(ch: str) -> bool:
    code = ord(ch)
    if 0x1F300 <= code <= 0x1FAFF:
        return True
    if 0x2600 <= code <= 0x27BF:
        return True
    if code in {0x00A9, 0x00AE, 0x203C, 0x2049, 0x2122, 0x2139, 0x2764, 0x2B50, 0x2B55}:
        return True
    return False
