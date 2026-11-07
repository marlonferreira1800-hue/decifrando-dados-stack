"""Avaliação (eval) do agente classificador.

Rode sempre que mudar prompt, modelo ou schema — é assim que você sabe se
melhorou ou piorou, em vez de "achar".

    cd backend
    python -m evals.run_evals            # usa LLM_MODEL do .env
    python -m evals.run_evals --model anthropic:claude-3-5-haiku-latest
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agents.base import build_agent  # noqa: E402
from app.agents.classifier import Classification, get_classifier_agent  # noqa: E402

DATASET = Path(__file__).parent / "dataset.json"


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--model", help="Sobrescreve LLM_MODEL (ex.: openai:gpt-4o)")
    p.add_argument("--min-accuracy", type=float, default=0.8, help="Falha (exit 1) abaixo deste valor")
    a = p.parse_args()

    agent = build_agent(Classification, "classifier", model=a.model) if a.model else get_classifier_agent()
    cases = json.loads(DATASET.read_text(encoding="utf-8"))
    hits, start = 0, time.perf_counter()

    for i, case in enumerate(cases, 1):
        out = agent.run_sync(case["input"]).output
        ok = out.category.value == case["expected"]
        hits += ok
        mark = "OK  " if ok else "ERRO"
        print(f"[{mark}] {i:02d} esperado={case['expected']:<10} obtido={out.category.value:<10} | {case['input'][:60]}")

    acc = hits / len(cases)
    print(f"\nAcurácia: {acc:.0%} ({hits}/{len(cases)}) em {time.perf_counter() - start:.1f}s")
    return 0 if acc >= a.min_accuracy else 1


if __name__ == "__main__":
    sys.exit(main())
