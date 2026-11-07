"""Divisão de texto em pedaços (chunks) com sobreposição."""


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Divide `text` em pedaços de até `chunk_size` caracteres, repetindo `overlap`
    caracteres entre pedaços vizinhos para não perder contexto nas bordas.
    Tenta cortar em quebra de parágrafo, fim de frase ou espaço."""
    if chunk_size <= 0:
        raise ValueError("chunk_size deve ser > 0")
    if not 0 <= overlap < chunk_size:
        raise ValueError("overlap deve estar entre 0 e chunk_size - 1")

    text = " ".join(text.split()) if "\n\n" not in text else text.strip()
    if not text:
        return []

    chunks: list[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + chunk_size, n)
        if end < n:
            # procura o melhor ponto de corte na segunda metade do pedaço
            window = text[start:end]
            for sep in ("\n\n", ". ", "\n", " "):
                cut = window.rfind(sep)
                if cut > chunk_size // 2:
                    end = start + cut + len(sep)
                    break
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= n:
            break
        start = max(end - overlap, start + 1)
    return chunks
