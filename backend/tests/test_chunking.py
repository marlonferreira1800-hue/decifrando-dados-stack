import pytest

from app.rag.chunking import chunk_text


def test_texto_curto_vira_um_chunk():
    assert chunk_text("Olá mundo.", chunk_size=100, overlap=10) == ["Olá mundo."]


def test_texto_vazio():
    assert chunk_text("   ") == []


def test_chunks_respeitam_tamanho_e_sobreposicao():
    text = " ".join(f"Frase número {i} sobre dados." for i in range(200))
    chunks = chunk_text(text, chunk_size=300, overlap=50)
    assert len(chunks) > 1
    assert all(len(c) <= 300 for c in chunks)
    # a sobreposição faz o início de um chunk repetir o final do anterior
    for a, b in zip(chunks, chunks[1:]):
        assert b[:20] in a


def test_parametros_invalidos():
    with pytest.raises(ValueError):
        chunk_text("abc", chunk_size=100, overlap=100)
