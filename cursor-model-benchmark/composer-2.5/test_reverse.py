"""Tests for grapheme-aware string reversal."""

from reverse import reverse_string


def test_empty_and_ascii():
    assert reverse_string("") == ""
    assert reverse_string("hello") == "olleh"
    assert reverse_string("a") == "a"


def test_combining_accent_decomposed():
    e_acute = "e\u0301"
    assert reverse_string(e_acute) == e_acute
    assert reverse_string("cafe\u0301") == e_acute + "fac"


def test_precomposed_accent():
    assert reverse_string("café") == "éfac"


def test_multiple_clusters_with_combining():
    a_tilde = "a\u0303"
    assert reverse_string("na\u0303o") == "o" + a_tilde + "n"
    assert reverse_string("no\u0303a") == "a" + "o\u0303" + "n"


def test_emoji_single_codepoint():
    wave = "👋"
    assert reverse_string(wave) == wave
    assert reverse_string(f"hi{wave}") == wave + "ih"


def test_emoji_skin_tone():
    thumbs = "👍🏽"
    assert reverse_string(thumbs) == thumbs
    assert reverse_string(f"x{thumbs}y") == "y" + thumbs + "x"


def test_regional_indicator_flag():
    flag = "🇺🇸"
    assert reverse_string(flag) == flag
    assert reverse_string(f"!{flag}?") == "?" + flag + "!"


def test_zwj_emoji_sequence():
    family = "👨‍👩‍👧"
    assert reverse_string(family) == family
    assert reverse_string(f"a{family}b") == "b" + family + "a"


def test_surrogate_pairs_roundtrip():
    s = "a🎉b"
    assert reverse_string(reverse_string(s)) == s
