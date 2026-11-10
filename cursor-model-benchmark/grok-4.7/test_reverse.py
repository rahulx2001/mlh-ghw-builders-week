"""pytest cases for grapheme-cluster reversal."""

from reverse import reverse_string


def test_empty_and_plain_text():
    assert reverse_string("") == ""
    assert reverse_string("a") == "a"
    assert reverse_string("ab") == "ba"
    assert reverse_string("Python") == "nohtyP"


def test_decomposed_combining_accent_stays_with_base():
    accented = "e\u0301"
    assert reverse_string(accented) == accented
    assert reverse_string("be\u0301") == accented + "b"


def test_precomposed_character():
    assert reverse_string("naïve") == "evïan"


def test_two_combining_marks_on_one_base():
    cluster = "a\u0301\u0327"
    assert reverse_string("x" + cluster + "y") == "y" + cluster + "x"


def test_emoji_and_skin_tone_are_one_cluster():
    wave = "👋"
    tone = "👍🏽"
    assert reverse_string(wave) == wave
    assert reverse_string(tone) == tone
    assert reverse_string("A" + tone + "B") == "B" + tone + "A"


def test_flag_is_one_cluster():
    flag = "🇯🇵"
    assert len(flag) == 2
    assert reverse_string("." + flag + "!") == "!" + flag + "."


def test_zwj_family_is_one_cluster():
    family = "👩‍👦"
    assert reverse_string(family) == family
    assert reverse_string(">" + family + "<") == "<" + family + ">"


def test_keycap_sequence():
    key = "3️⃣"
    assert reverse_string("[" + key + "]") == "]" + key + "["


def test_double_reversal_is_identity():
    sample = "caf\u00e9 \U0001f44b\U0001f3fd \U0001f1fa\U0001f1f8"
    assert reverse_string(reverse_string(sample)) == sample
