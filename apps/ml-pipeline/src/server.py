import fastapi
import uvicorn
from pydantic import BaseModel
from predict import CausalInferenceService

app = fastapi.FastAPI(title="Razorpay Causal Inference API")
service = CausalInferenceService(model_path='../../artifacts/t_learner.pkl', features_path='../../artifacts/model_features.json')

class InferencePayload(BaseModel):
    daysSinceLastPayment: int
    amountMinor: float
    isCardError: int
    isHighValueMerchant: int
    isFirstAttempt: int
    amountSegment: str
    customerLocation: str
    paymentChannel: str

@app.post("/predict")
def predict_endpoint(payload: InferencePayload):
    try:
        result = service.predict(payload.dict())
        return result
    except Exception as e:
        raise fastapi.HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
