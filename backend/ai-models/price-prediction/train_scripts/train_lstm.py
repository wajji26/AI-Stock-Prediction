
# import joblib
# from sklearn.preprocessing import MinMaxScaler
# from tensorflow.keras.models import Sequential
# from tensorflow.keras.layers import LSTM, Dense
# import pandas as pd
# import numpy as np
# import os

# symbol = "AAPL"

# # Load data
# df = pd.read_csv(f"data/{symbol}.csv", index_col=0)
# prices = df["Close"].values.reshape(-1, 1)

# # Create scaler (TRAINING ONLY)
# scaler = MinMaxScaler(feature_range=(0, 1))
# scaled_prices = scaler.fit_transform(prices)

# # Save scaler RIGHT HERE ✅
# os.makedirs("models", exist_ok=True)
# joblib.dump(scaler, f"models/{symbol}_scaler.pkl")

# # Create sequences
# X, y = [], []
# lookback = 60
# for i in range(lookback, len(scaled_prices)):
#     X.append(scaled_prices[i-lookback:i])
#     y.append(scaled_prices[i])

# X, y = np.array(X), np.array(y)

# # Build model
# model = Sequential([
#     LSTM(64, return_sequences=True, input_shape=(lookback, 1)),
#     LSTM(32),
#     Dense(1)
# ])

# model.compile(optimizer="adam", loss="mse")
# model.fit(X, y, epochs=30, batch_size=32)

# # Save model
# model.save(f"models/{symbol}.keras")
import os
import pandas as pd
import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.preprocessing import MinMaxScaler
import joblib

# Current script directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Data is saved by the FastAPI server into backend/ai-models/price-prediction/data
DATA_PATH = os.path.join(SCRIPT_DIR, "../data")
# Models are in backend/ai-models/price-prediction/models
MODEL_PATH = os.path.join(SCRIPT_DIR, "../models")
os.makedirs(MODEL_PATH, exist_ok=True)

lookback = 60
epochs = 50
batch_size = 16

def create_lstm_model(input_shape):
    model = Sequential()
    model.add(LSTM(units=50, return_sequences=True, input_shape=input_shape))
    model.add(Dropout(0.2))
    model.add(LSTM(units=50, return_sequences=False))
    model.add(Dropout(0.2))
    model.add(Dense(units=25))
    model.add(Dense(units=1))
    model.compile(optimizer='adam', loss='mean_squared_error')
    return model

def train_stock(stock_csv):
    symbol = os.path.basename(stock_csv).split(".")[0]
    print(f"Loading data for {symbol}...")
    df = pd.read_csv(stock_csv, parse_dates=['Date'])
    
    if len(df) < lookback + 10:
        print(f"Skipping {symbol} due to insufficient data ({len(df)} rows).")
        return

    prices = df['Close'].values.reshape(-1,1)
    
    scaler = MinMaxScaler(feature_range=(0,1))
    scaled_prices = scaler.fit_transform(prices)
    
    # Create sequences
    X, y = [], []
    for i in range(lookback, len(scaled_prices)):
        X.append(scaled_prices[i-lookback:i])
        y.append(scaled_prices[i])
    X, y = np.array(X), np.array(y)
    
    model = create_lstm_model((X.shape[1], 1))
    
    # Add early stopping to prevent overfitting
    early_stop = EarlyStopping(monitor='loss', patience=5, restore_best_weights=True)
    
    print(f"Training {symbol} LSTM model...")
    model.fit(X, y, epochs=epochs, batch_size=batch_size, callbacks=[early_stop], verbose=0)
    
    # Save model and scaler
    model.save(os.path.join(MODEL_PATH, f"{symbol}.keras"))
    joblib.dump(scaler, os.path.join(MODEL_PATH, f"{symbol}_scaler.pkl"))
    print(f"✅ Successfully trained and saved {symbol} model.")

# Train all KMI30 stocks
files = [f for f in os.listdir(DATA_PATH) if f.endswith(".csv")]
print(f"Found {len(files)} stock files. Starting training...")

for stock_file in files:
    train_stock(os.path.join(DATA_PATH, stock_file))

print("All models trained successfully!")
