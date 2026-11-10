"""pytest coverage for grapheme-aware string reversal."""

from reverse import reverse_string


def test_empty_and_ascii():
    assert reverse_string("") == ""
    assert reverse_string("abc") == "cba"


def test_combining_mark_kept_with_base():
    accented = "e\u0301"
    assert reverse_string(accented) == accented
    assert reverse_string("he\u0301llo") == "oll" + accented + "h"


def test_precomposed_character():
    assert reverse_string("café") == "éfac"


def test_multiple_combining_marks():
    cluster = "a\u0301\u0327"
    assert reverse_string("x" + cluster + "y") == "y" + cluster + "x"


def test_emoji_skin_tone_and_emoji():
    assert reverse_string("👍🏾") == "👍🏾"
    assert reverse_string("A👋B") == "B👋A"


def test_flag_pair_stays_together():
    flag = "🇺🇸"
    assert reverse_string("!" + flag + "?") == "?" + flag + "!"


def test_zwj_sequence_stays_together():
    family = "👨‍👩‍👧"
    assert reverse_string(family) == family
    assert reverse_string("<" + family + ">") == ">" + family + "<"


def test_keycap_sequence():
    keycap = "3️⃣"
    assert reverse_string("[" + keycap + "]") == "]" + keycap + "["


def test_double_reverse_returns_original():
    sample = "caf\u00e9 👋🏽 🇯🇵"
    assert reverse_string(reverse_string(sample)) == sample
