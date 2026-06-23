import os
import pandas as pd
from prophet import Prophet
import joblib

# Current script directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Data is saved by the FastAPI server into backend/ai-models/price-prediction/data
DATA_PATH = os.path.join(SCRIPT_DIR, "../data")
# Models are in backend/ai-models/price-prediction/models
MODEL_PATH = os.path.join(SCRIPT_DIR, "../models")
os.makedirs(MODEL_PATH, exist_ok=True)

def train_stock_prophet(stock_csv):
    symbol = os.path.basename(stock_csv).split(".")[0]
    df = pd.read_csv(stock_csv, parse_dates=['Date'])
    df_prophet = df[['Date','Close']].rename(columns={'Date':'ds','Close':'y'})
    df_prophet['ds'] = pd.to_datetime(df_prophet['ds']).dt.tz_localize(None)
    
    model = Prophet(
        daily_seasonality=False, 
        weekly_seasonality=True, 
        yearly_seasonality=True,
        changepoint_prior_scale=0.15  # Increased from default 0.05 for more flexibility
    )
    model.fit(df_prophet)
    
    joblib.dump(model, os.path.join(MODEL_PATH, f"{symbol}_prophet.pkl"))
    print(f"Trained Prophet model for {symbol}.")

for stock_file in os.listdir(DATA_PATH):
    if stock_file.endswith(".csv"):
        train_stock_prophet(os.path.join(DATA_PATH, stock_file))
