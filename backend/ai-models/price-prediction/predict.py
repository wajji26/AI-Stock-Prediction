def predict_multi(symbol, days=7):
    import numpy as np
    import pandas as pd
    import os, joblib
    from datetime import datetime
    from tensorflow.keras.models import load_model

    BASE_PATH = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH = os.path.join(BASE_PATH, "data")
    MODEL_PATH = os.path.join(BASE_PATH, "models")

    model_file = os.path.join(MODEL_PATH, f"{symbol}.keras")
    scaler_file = os.path.join(MODEL_PATH, f"{symbol}_scaler.pkl")
    data_file = os.path.join(DATA_PATH, f"{symbol}.csv")

    if not all(map(os.path.exists, [model_file, scaler_file, data_file])):
        raise FileNotFoundError("Model, scaler, or data file missing")

    model = load_model(model_file)
    scaler = joblib.load(scaler_file)

    df = pd.read_csv(data_file, index_col=0)
    df["Close"] = pd.to_numeric(df["Close"], errors="coerce")
    df.dropna(inplace=True)

    prices = df["Close"].values.reshape(-1, 1)
    scaled_prices = scaler.transform(prices)

    lookback = 60
    input_seq = scaled_prices[-lookback:].reshape(1, lookback, 1)

    last_date = pd.to_datetime(df.index[-1])
    future_dates = pd.date_range(
        start=last_date + pd.Timedelta(days=1),
        periods=days,
        freq="D"
    )

    predictions = []
    for i in range(days):
        pred_scaled = model.predict(input_seq, verbose=0)
        pred_price = scaler.inverse_transform(pred_scaled)[0][0]

        predictions.append({
            "date": future_dates[i].strftime("%Y-%m-%d"),
            "price": float(pred_price)
        })

        input_seq = np.concatenate(
            (input_seq[:, 1:, :], pred_scaled.reshape(1, 1, 1)),
            axis=1
        )

    recent_window = df.tail(lookback).copy()
    recent_closes = [
        {"date": pd.to_datetime(idx).strftime("%Y-%m-%d"), "close": float(v)}
        for idx, v in recent_window["Close"].items()
    ]

    closes = df["Close"].values
    last_close = float(closes[-1])
    mean_close = float(np.mean(closes[-lookback:]))
    std_close = float(np.std(closes[-lookback:]))
    pct_30d = float((closes[-1] - closes[-30]) / closes[-30] * 100) if len(closes) >= 30 else None
    min_60d = float(np.min(closes[-lookback:]))
    max_60d = float(np.max(closes[-lookback:]))

    try:
        model_mtime = os.path.getmtime(model_file)
        last_trained = datetime.fromtimestamp(model_mtime).strftime("%Y-%m-%d")
    except Exception:
        last_trained = None

    meta = {
        "model": {
            "type": "LSTM",
            "architecture": "2x LSTM(50) + Dropout(0.2) + Dense(25) + Dense(1)",
            "framework": "TensorFlow / Keras",
            "lookback_days": lookback,
            "trained_on": "Historical daily Close prices",
            "last_trained": last_trained,
        },
        "training_data": {
            "rows": int(len(df)),
            "from": pd.to_datetime(df.index[0]).strftime("%Y-%m-%d"),
            "to": pd.to_datetime(df.index[-1]).strftime("%Y-%m-%d"),
        },
        "input_stats": {
            "last_close": last_close,
            "mean_60d": mean_close,
            "stddev_60d": std_close,
            "min_60d": min_60d,
            "max_60d": max_60d,
            "pct_change_30d": pct_30d,
        },
        "recent_closes": recent_closes,
    }

    return {"predictions": predictions, "meta": meta}
