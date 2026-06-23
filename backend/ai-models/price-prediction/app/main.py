# from fastapi import FastAPI, HTTPException
# from pydantic import BaseModel
# import yfinance as yf
# import numpy as np
# import pandas as pd
# import os
# import joblib
# from tensorflow.keras.models import load_model
# from prophet import Prophet
# from datetime import timedelta
# import logging

# # Setup logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# app = FastAPI(title="Stock Prediction API")

# BASE_PATH = os.path.dirname(os.path.abspath(__file__))
# MODEL_PATH = os.path.join(BASE_PATH, "models")
# DATA_PATH = os.path.join(BASE_PATH, "data")

# os.makedirs(MODEL_PATH, exist_ok=True)
# os.makedirs(DATA_PATH, exist_ok=True)

# class PredictionRequest(BaseModel):
#     symbol: str
#     days: int = 7
#     model_type: str = "lstm" # "lstm" or "prophet"

# # Cache for loaded models to avoid reloading on every request
# loaded_models = {}
# loaded_scalers = {}

# def get_lstm_prediction(symbol, days):
#     model_file = os.path.join(MODEL_PATH, f"{symbol}.keras")
#     scaler_file = os.path.join(MODEL_PATH, f"{symbol}_scaler.pkl")
    
#     # Check if we have a pre-trained model
#     if not os.path.exists(model_file) or not os.path.exists(scaler_file):
#         # For PSX or others, we might need a generic model or to train one
#         # For now, let's look for AAPL as a fallback if specific symbol doesn't exist
#         logger.warning(f"Model for {symbol} not found. Trying fallback AAPL.")
#         model_file = os.path.join(MODEL_PATH, "AAPL.keras")
#         scaler_file = os.path.join(MODEL_PATH, "AAPL_scaler.pkl")
        
#         if not os.path.exists(model_file):
#             raise FileNotFoundError(f"No LSTM model found for {symbol} or fallback.")

#     # Load model and scaler (cached)
#     if model_file not in loaded_models:
#         loaded_models[model_file] = load_model(model_file)
#         loaded_scalers[scaler_file] = joblib.load(scaler_file)
    
#     model = loaded_models[model_file]
#     scaler = loaded_scalers[scaler_file]

#     # Get data from Yahoo Finance
#     # For PSX, suffix .KA is usually needed. We handle it in Node or here?
#     # Let's handle it here if it's missing and looks like a PSX symbol
#     yf_symbol = symbol
#     if ".KA" not in yf_symbol and len(yf_symbol) <= 5: # Simple heuristic
#         # If it's 3-4 letters and no suffix, maybe it's US? 
#         # But if the user is asking for PSX, they might send OGDC
#         # For now, let's assume the symbol passed is what yfinance expects
#         pass

#     df = yf.download(yf_symbol, period="1y", progress=False)
#     if df.empty:
#         raise ValueError(f"No data found for {yf_symbol}")
    
#     # Handle multi-index columns if yfinance returns them
#     if isinstance(df.columns, pd.MultiIndex):
#         df.columns = df.columns.get_level_values(0)
    
#     if "Close" not in df.columns:
#         raise ValueError(f"Close price column missing for {yf_symbol}")

#     prices = np.array(df["Close"].values, dtype=float).reshape(-1, 1)
#     # Ensure no NaN values
#     prices = prices[~np.isnan(prices)].reshape(-1, 1)
    
#     logger.info(f"Prices shape: {prices.shape}, Type: {type(prices)}")
#     try:
#         scaled_prices = scaler.transform(prices)
#     except Exception as e:
#         logger.warning(f"Transformation failed, retrying with raw list: {str(e)}")
#         scaled_prices = scaler.transform(prices.flatten().tolist()).reshape(-1, 1)
    
#     lookback = 60
#     if len(scaled_prices) < lookback:
#         raise ValueError(f"Not enough data for {symbol}. Need at least {lookback} days.")
        
#     input_seq = scaled_prices[-lookback:].reshape(1, lookback, 1)
    
#     last_date = df.index[-1]
#     # Filter only business days for future dates
#     future_dates = pd.bdate_range(start=last_date + timedelta(days=1), periods=days)
    
#     predictions = []
#     curr_input = input_seq.copy()
    
#     for i in range(days):
#         pred_scaled = model.predict(curr_input, verbose=0)
#         pred_price = scaler.inverse_transform(pred_scaled)[0][0]
        
#         predictions.append({
#             "date": future_dates[i].strftime("%Y-%m-%d"),
#             "price": float(pred_price)
#         })
        
#         # update input sequence
#         curr_input = np.concatenate(
#             (curr_input[:, 1:, :], pred_scaled.reshape(1, 1, 1)),
#             axis=1
#         )
        
#     return predictions

# def get_prophet_prediction(symbol, days):
#     # For Prophet, we fit on the fly as it's fast enough for EOD data
#     df = yf.download(symbol, period="2y", progress=False)
#     if df.empty:
#         raise ValueError(f"No data found for {symbol}")
        
#     df = df.reset_index()
#     # Prophet expects 'ds' and 'y' columns
#     df_prophet = df[['Date', 'Close']].rename(columns={'Date': 'ds', 'Close': 'y'})
#     df_prophet['ds'] = pd.to_datetime(df_prophet['ds']).dt.tz_localize(None)
    
#     model = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=True)
#     model.fit(df_prophet)
    
#     future = model.make_future_dataframe(periods=days)
#     forecast = model.predict(future)
    
#     predictions = forecast[['ds', 'yhat']].tail(days)
#     result = []
#     for _, row in predictions.iterrows():
#         result.append({
#             "date": row['ds'].strftime("%Y-%m-%d"),
#             "price": float(row['yhat'])
#         })
#     return result

# @app.post("/prediction")
# async def prediction(req: PredictionRequest):
#     try:
#         if req.model_type.lower() == "lstm":
#             preds = get_lstm_prediction(req.symbol.upper(), req.days)
#         elif req.model_type.lower() == "prophet":
#             preds = get_prophet_prediction(req.symbol.upper(), req.days)
#         else:
#             raise HTTPException(status_code=400, detail="Invalid model_type. Use 'lstm' or 'prophet'.")
            
#         return {
#             "symbol": req.symbol,
#             "model": req.model_type,
#             "predictions": preds
#         }
#     except Exception as e:
#         import traceback
#         logger.error(f"Prediction error: {str(e)}")
#         logger.error(traceback.format_exc())
#         raise HTTPException(status_code=500, detail=str(e))

# @app.get("/health")
# def health():
#     return {"status": "ok"}

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8001)
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model
from datetime import timedelta
import os, sys

# Allow importing predict.py / predict_multi from the project root.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from predict import predict_multi  # noqa: E402

app = FastAPI(title="KMI30 Stock Prediction API")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(PROJECT_ROOT, "models")
DATA_PATH = os.path.join(PROJECT_ROOT, "data")
os.makedirs(DATA_PATH, exist_ok=True)

lookback = 60

class StockRecord(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: float

class UpdateDataRequest(BaseModel):
    symbol: str
    records: list[StockRecord]

class PredictionRequest(BaseModel):
    symbol: str
    days: int = 7
    model_type: str = "lstm"  # or "prophet"

loaded_models = {}
loaded_scalers = {}
loaded_prophet = {}

@app.post("/prediction")
async def predict(req: PredictionRequest):
    symbol = req.symbol.upper()
    days = req.days
    model_type = req.model_type.lower()

    try:
        if model_type == "lstm":
            result = predict_multi(symbol, days)
            return {
                "symbol": symbol,
                "model": "lstm",
                "predictions": result["predictions"],
                "meta": result["meta"],
            }

        elif model_type == "prophet":
            if symbol not in loaded_prophet:
                loaded_prophet[symbol] = joblib.load(f"{MODEL_PATH}/{symbol}_prophet.pkl")
            model = loaded_prophet[symbol]
            
            df = pd.read_csv(f"data/{symbol}.csv", parse_dates=['Date'])
            # 'B' frequency means business days (Mon-Fri)
            future = model.make_future_dataframe(periods=days, freq='B')
            forecast = model.predict(future).tail(days)
            predictions = [{"date": row['ds'].strftime("%Y-%m-%d"), "price": float(row['yhat'])} for _, row in forecast.iterrows()]
            return {"symbol": symbol, "model": "prophet", "predictions": predictions}
        
        else:
            raise HTTPException(status_code=400, detail="Invalid model_type.")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/last-date/{symbol}")
def get_last_date(symbol: str):
    file_path = f"{DATA_PATH}/{symbol.upper()}.csv"
    if not os.path.exists(file_path):
        return {"symbol": symbol, "last_date": None}
    
    try:
        df = pd.read_csv(file_path)
        if df.empty:
            return {"symbol": symbol, "last_date": None}
        last_date = df['Date'].iloc[-1]
        return {"symbol": symbol, "last_date": last_date}
    except Exception as e:
        return {"symbol": symbol, "last_date": None, "error": str(e)}

@app.post("/update-data")
async def update_data(req: UpdateDataRequest):
    symbol = req.symbol.upper()
    file_path = f"{DATA_PATH}/{symbol}.csv"
    
    # Header: Date,Symbol,Open,High,Low,Close,Volume
    file_exists = os.path.exists(file_path)
    
    new_rows = []
    for r in req.records:
        new_rows.append([r.date, symbol, r.open, r.high, r.low, r.close, r.volume])
    
    new_df = pd.DataFrame(new_rows, columns=['Date', 'Symbol', 'Open', 'High', 'Low', 'Close', 'Volume'])
    
    try:
        if not file_exists:
            new_df.to_csv(file_path, index=False)
        else:
            new_df.to_csv(file_path, mode='a', header=False, index=False)
        return {"status": "success", "message": f"Added {len(new_rows)} rows to {symbol}.csv"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save data: {str(e)}")

@app.get("/health")
def health():
    return {"status":"ok"}
