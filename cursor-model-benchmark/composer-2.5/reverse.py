"""Reverse a string by Unicode grapheme clusters (stdlib-only approximation).

Full UAX #29 grapheme cluster breaking is not provided by the Python standard
library (no ``Extended_Pictographic`` property, no bundled break iterator).
This module implements a pragmatic subset: combining marks, variation selectors,
emoji modifiers, ZWJ-linked pictographic sequences, and regional-indicator pairs.

Edge cases outside that subset may split or join differently than a conforming
UAX #29 implementation (e.g. ``regex`` with ``\\X`` or the ``grapheme`` package).
"""

from __future__ import annotations

import unicodedata


def reverse_string(text: str) -> str:
    """Return *text* with grapheme clusters in reverse order.

    Args:
        text: Input string, which may contain combining characters, emoji,
            flags (regional indicators), and ZWJ emoji sequences.

    Returns:
        A new string whose grapheme clusters appear in the opposite order from
        *text*, while the code points inside each cluster stay in order.
    """
    return "".join(reversed(_grapheme_clusters(text)))


def _grapheme_clusters(text: str) -> list[str]:
    if not text:
        return []

    clusters: list[str] = []
    i = 0
    n = len(text)

    while i < n:
        j = i + 1
        ri_run = 1 if _is_regional_indicator(text[i]) else 0

        while j < n and not _grapheme_break_between(text, i, j, ri_run):
            if _is_regional_indicator(text[j]):
                ri_run += 1
            elif not _is_regional_indicator(text[j - 1]):
                ri_run = 0
            j += 1

        clusters.append(text[i:j])
        i = j

    return clusters


def _grapheme_break_between(text: str, cluster_start: int, j: int, ri_run: int) -> bool:
    """Return True if there is a cluster boundary before index *j*."""
    prev = text[j - 1]
    curr = text[j]

    # GB3: do not break CR x LF
    if prev == "\r" and curr == "\n":
        return False

    # GB4 / GB5: break around controls (except CR/LF rule above)
    if _is_control(prev) or _is_control(curr):
        return True

    prev_ri = _is_regional_indicator(prev)
    curr_ri = _is_regional_indicator(curr)

    # GB12 / GB13: pair regional indicators; break before RI if run length is even
    if prev_ri and curr_ri:
        return ri_run % 2 == 0

    if curr_ri and not prev_ri:
        return True

    # GB9: do not break before extending characters
    if _is_extend(curr):
        return False

    # GB11: ZWJ x Extended_Pictographic after a pictographic+extend* chain
    if curr == "\u200d" and _is_extended_pictographic(prev):
        return False
    if prev == "\u200d" and _is_extended_pictographic(curr):
        if _extended_pictographic_backscan(text, cluster_start, j - 1):
            return False

    # GB9c: emoji modifier base x emoji modifier
    if _is_emoji_modifier(curr) and (
        _is_extended_pictographic(prev) or _is_emoji_modifier(prev)
    ):
        return False

    return True


def _extended_pictographic_backscan(text: str, cluster_start: int, zwj_index: int) -> bool:
    k = zwj_index - 1
    while k >= cluster_start:
        ch = text[k]
        if ch == "\u200d":
            k -= 1
            continue
        if _is_extend(ch):
            k -= 1
            continue
        return _is_extended_pictographic(ch)
    return False


def _is_control(ch: str) -> bool:
    cat = unicodedata.category(ch)
    if cat == "Cc":
        return ch not in ("\r", "\n")
    return cat == "Cf" and ch not in ("\u200c", "\u200d", "\ufe0e", "\ufe0f")


def _is_regional_indicator(ch: str) -> bool:
    o = ord(ch)
    return 0x1F1E6 <= o <= 0x1F1FF


def _is_extend(ch: str) -> bool:
    o = ord(ch)
    if ch in ("\u200d", "\ufe0f", "\ufe0e"):
        return True
    if 0xFE00 <= o <= 0xFE0F:
        return True
    if 0x1F3FB <= o <= 0x1F3FF:
        return True
    cat = unicodedata.category(ch)
    return cat in ("Mn", "Me", "Mc")


def _is_emoji_modifier(ch: str) -> bool:
    o = ord(ch)
    return 0x1F3FB <= o <= 0x1F3FF


def _is_extended_pictographic(ch: str) -> bool:
    """Approximate Extended_Pictographic (not exposed in ``unicodedata``)."""
    o = ord(ch)
    if 0x1F300 <= o <= 0x1FAFF:
        return True
    if 0x2600 <= o <= 0x26FF:
        return True
    if 0x2700 <= o <= 0x27BF:
        return True
    if 0x1F900 <= o <= 0x1F9FF:
        return True
    if 0x1F600 <= o <= 0x1F64F:
        return True
    if 0x1F680 <= o <= 0x1F6FF:
        return True
    if o == 0x2764:  # heavy black heart, common in ZWJ sequences
        return True
    return False
