"""Reverse strings by Unicode extended grapheme cluster (stdlib approximation).

The Python standard library has no UAX #29 grapheme-break iterator and does not
expose the Extended_Pictographic property. ``reverse_string`` therefore groups
code points with ``unicodedata`` categories plus a small set of emoji rules
(variation selectors, skin-tone modifiers, ZWJ joins, regional-indicator pairs,
and keycap enclosures). Sequences outside those rules can differ from a full
conforming breaker.
"""

from __future__ import annotations

import unicodedata

_ZWJ = "\u200d"
_VS16 = "\ufe0f"
_KEYCAP = "\u20e3"


def reverse_string(text: str) -> str:
    """Return *text* with its grapheme clusters reversed.

    Characters that form one user-perceived character stay together and in
    their original order. Examples include ``e`` plus a combining acute,
    a waving-hand emoji with a skin tone, a regional-indicator flag, and a
    ZWJ family sequence.

    Args:
        text: Any Unicode string.

    Returns:
        A new string. An empty input yields an empty string.
    """
    return "".join(reversed(_split_graphemes(text)))


def _split_graphemes(text: str) -> list[str]:
    clusters: list[str] = []
    index = 0
    length = len(text)
    while index < length:
        start = index
        index += 1
        if _is_regional_indicator(text[start]) and index < length and _is_regional_indicator(text[index]):
            index += 1
        else:
            while index < length and _extends_cluster(text, start, index):
                index += 1
        clusters.append(text[start:index])
    return clusters


def _extends_cluster(text: str, start: int, index: int) -> bool:
    """True when ``text[index]`` should stay inside the cluster that began at *start*."""
    previous = text[index - 1]
    current = text[index]

    if previous == "\r" and current == "\n":
        return True
    if _is_control(previous) or _is_control(current):
        return False
    if _is_combining_or_enclosing(current):
        return True
    if _is_variation_selector(current):
        return True
    if _is_skin_tone(current):
        return True
    if current == _ZWJ:
        return _looks_like_emoji(previous) or _is_skin_tone(previous) or _is_variation_selector(previous)
    if previous == _ZWJ and _looks_like_emoji(current):
        return True
    if current == _KEYCAP and (previous in (_VS16, "#", "*") or previous.isdigit()):
        return True
    return False


def _is_combining_or_enclosing(char: str) -> bool:
    return unicodedata.combining(char) != 0 or unicodedata.category(char) in {"Mn", "Me", "Mc"}


def _is_variation_selector(char: str) -> bool:
    code = ord(char)
    return 0xFE00 <= code <= 0xFE0F or 0xE0100 <= code <= 0xE01EF


def _is_skin_tone(char: str) -> bool:
    return 0x1F3FB <= ord(char) <= 0x1F3FF


def _is_regional_indicator(char: str) -> bool:
    return 0x1F1E6 <= ord(char) <= 0x1F1FF


def _is_control(char: str) -> bool:
    if char in {"\r", "\n", _ZWJ, "\u200c"}:
        return False
    return unicodedata.category(char) in {"Cc", "Zl", "Zp"}


def _looks_like_emoji(char: str) -> bool:
    """Range check standing in for Extended_Pictographic."""
    code = ord(char)
    if 0x1F300 <= code <= 0x1FAFF:
        return True
    if 0x2600 <= code <= 0x27BF:
        return True
    if code in {0x00A9, 0x00AE, 0x203C, 0x2049, 0x2122, 0x2139, 0x2764, 0x2B50, 0x2B55}:
        return True
    if char in {"#", "*"} or char.isdigit():
        return True
    return False
