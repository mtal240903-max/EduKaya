"""
Moteur d'automatisation de la révision — Algorithme SM-2 (SuperMemo 2).

Ce micro-service est LE cerveau qui décide, pour chaque étudiant et chaque
question, quand la lui reproposer. C'est la partie "automatisation Python"
du module Révision : le backend Node ne fait qu'enregistrer les réponses,
c'est ce service qui calcule la prochaine date de révision optimale.

Lancer en local :
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8000

Le backend Node (revisionController.js) appelle POST /schedule à chaque
réponse de l'utilisateur. Si ce service n'est pas démarré, Node bascule
automatiquement sur une implémentation JS identique (voir
backend/src/utils/sm2.js) pour que l'application ne casse jamais.
"""

from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="EduKaya — Moteur de révision (SM-2)",
    description="Calcule le prochain intervalle de révision optimal pour chaque question.",
    version="1.0.0",
)


class ScheduleRequest(BaseModel):
    # Qualité de la réponse donnée par l'étudiant, sur l'échelle SM-2 :
    #   0 = trou noir total          3 = correct mais difficile
    #   1 = faux, mais reconnu       4 = correct, léger effort
    #   2 = faux, presque juste      5 = parfait, immédiat
    quality: int = Field(..., ge=0, le=5)
    repetitions: int = Field(0, ge=0)
    ease_factor: float = Field(2.5, ge=1.3)
    interval: int = Field(0, ge=0)  # en jours


class ScheduleResponse(BaseModel):
    repetitions: int
    ease_factor: float
    interval: int
    next_review_date: str  # ISO 8601
    mastered: bool  # True si l'intervalle dépasse 21 jours (carte "maîtrisée")


def compute_sm2(quality: int, repetitions: int, ease_factor: float, interval: int):
    """Implémentation de référence de l'algorithme SM-2 de Piotr Woźniak."""

    if quality < 3:
        # Réponse ratée : on recommence le cycle de répétitions à zéro,
        # mais on NE réinitialise PAS le facteur de facilité (ease_factor) :
        # une carte déjà bien maîtrisée reste "facile" même après un oubli ponctuel.
        repetitions = 0
        interval = 1
    else:
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(interval * ease_factor)
        repetitions += 1

    # Mise à jour du facteur de facilité (formule officielle SM-2)
    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if ease_factor < 1.3:
        ease_factor = 1.3

    next_review_date = datetime.now(timezone.utc) + timedelta(days=interval)

    return {
        "repetitions": repetitions,
        "ease_factor": round(ease_factor, 3),
        "interval": interval,
        "next_review_date": next_review_date.isoformat(),
        "mastered": interval >= 21,
    }


@app.get("/health")
def health():
    return {"status": "ok", "engine": "sm2-python"}


@app.post("/schedule", response_model=ScheduleResponse)
def schedule(payload: ScheduleRequest):
    result = compute_sm2(
        quality=payload.quality,
        repetitions=payload.repetitions,
        ease_factor=payload.ease_factor,
        interval=payload.interval,
    )
    return result
