from fastapi import APIRouter
from services.cost_tracker import SUPPORTED_MODELS, PRICING

router = APIRouter()


@router.get("")
async def list_models():
    return [
        {
            "id": model_id,
            "label": info["label"],
            "provider": info["provider"],
            "input_cost_per_1k": PRICING.get(model_id, {}).get("input", 0),
            "output_cost_per_1k": PRICING.get(model_id, {}).get("output", 0),
        }
        for model_id, info in SUPPORTED_MODELS.items()
    ]
