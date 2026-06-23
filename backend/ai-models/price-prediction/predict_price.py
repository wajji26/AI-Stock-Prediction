import sys
from predict import predict_multi
import json

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python predict_price.py SYMBOL [DAYS]")
        sys.exit(1)

    symbol = sys.argv[1]
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 7

    predictions = predict_multi(symbol, days)
    print(json.dumps(predictions))
