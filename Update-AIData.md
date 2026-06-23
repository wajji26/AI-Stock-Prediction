1. The actual model predictions (LSTM/Prophet outputs)

  These come from the Python FastAPI service in
  backend/ai-models/price-prediction/. To refresh them:

  Update the price history → retrain → models auto-serve new predictions:

  # 1. Pull latest PSX OHLC data (last 1mo incremental) and push to Python API
  cd backend && node scripts/update_kmi30_data.js
  # requires PYTHON_API_URL env var (defaults to http://127.0.0.1:8001)
  # the Python /update-data endpoint appends rows to 
  backend/ai-models/price-prediction/data/<SYMBOL>.csv

  # 2. Retrain LSTM (+ scaler) for all KMI30 symbols
  cd backend/ai-models/price-prediction
  python train_scripts/train_lstm.py
  # saves models/<SYMBOL>.keras + <SYMBOL>_scaler.pkl

  # 3. (Optional) retrain Prophet
  python train_scripts/train_prophet.py