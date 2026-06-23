import pandas as pd
from prophet import Prophet
import sys, json
import os

def predict_prophet(symbol, days=7):
    BASE_PATH = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH = os.path.join(BASE_PATH, "data")
    data_file = os.path.join(DATA_PATH, f"{symbol}.csv")
    df = pd.read_csv(data_file)

    # Example: If your CSV has dates like 2025-12-12
    df['ds'] = pd.to_datetime(df['Date'], errors='coerce')
    df['y'] = pd.to_numeric(df['Close'], errors='coerce')
    df.dropna(subset=['ds', 'y'], inplace=True)  # drop rows where conversion failed
    model = Prophet(daily_seasonality=True)
    model.fit(df[['ds','y']])

    future = model.make_future_dataframe(periods=days)
    forecast = model.predict(future)

    # Only print JSON at the end
    predictions = forecast[['ds', 'yhat']].tail(days)
    output = [{"date": str(row['ds'].date()), "price": float(row['yhat'])} 
              for _, row in predictions.iterrows()]

    print(json.dumps({"ticker": symbol, "days": days, "prediction": output}))
   

if __name__ == "__main__":
    symbol = sys.argv[1]
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
    predict_prophet(symbol, days)
