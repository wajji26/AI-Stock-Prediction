# How the AI Stock Prediction Works, A Plain-English Guide

*A short overview for non-technical readers: what the app does behind the scenes, what tools it uses, and how it makes its predictions.*

---

## The Big Picture

When you open a stock in the app and ask it to "predict," here's what happens in simple terms:

1. The app already keeps a **history of daily stock prices** (about 3 years' worth) for the major Pakistani stocks it covers.
2. That history is fed into an **AI model** that has *learned the patterns* in how those prices move over time.
3. The model produces a **forecast**, for example, the expected closing price for each of the next 7 trading days.
4. That forecast is sent back to your phone and shown as a chart and numbers.

Think of it like a weather forecast: it studies past behaviour to make an educated guess about the near future. It is **not a guarantee**, it's a data-driven estimate.

---

## What Stocks Does It Cover?

The app focuses on the **KMI30 index** of the Pakistan Stock Exchange (PSX), 31 of Pakistan's largest, most-traded companies (e.g., OGDC, ENGRO, LUCK, HUBCO, MEBL, PSO). For each of these, the app maintains its own up-to-date price history.

---

## Where the Price Data Comes From

The app pulls market data from several reliable public sources, using more than one so there's always a backup:

- **Yahoo Finance**, the main source of daily historical prices for PSX stocks.
- **TradingView**, near-real-time market quotes.
- **Finnhub** and **Twelve Data**, additional live price and company information.
- **Google News**, recent news headlines for each stock.

This price history is stored as simple spreadsheet-style files (date, open, high, low, close, volume) that the AI is trained on.

---

## The Two AI "Brains"

The app can make predictions using **two different forecasting models**, and the user can choose which one to use:

### 1. LSTM, a neural network ("deep learning")
- LSTM stands for *Long Short-Term Memory*. It's a type of artificial neural network designed specifically to understand **sequences**, like a stream of daily prices.
- It looks at the **last 60 days** of prices to predict the next day, then rolls forward day by day.
- It was "trained" by showing it years of real price history over and over (50 training rounds) until it learned the typical rhythms and reactions in the data.
- Built with **TensorFlow / Keras**, the same industry-standard AI toolkit used by large tech companies.

### 2. Prophet, a statistical forecasting model
- Prophet is a forecasting tool originally created by Facebook/Meta.
- Instead of a neural network, it breaks a stock's price into understandable pieces: the overall **trend** (is it generally rising or falling?) plus **seasonal patterns** (weekly and yearly cycles).
- It's fast, stable, and good at capturing repeating patterns.

Each stock has its **own personalised version** of these models, the model for ENGRO has only ever studied ENGRO's history, the model for LUCK only LUCK's, and so on.

---

## How a Prediction Travels Through the System

The backend is built in two cooperating parts:

- **The main server (Node.js / Express):** the "front desk." It handles your login, your watchlist, your portfolio, news, and receives your prediction request from the phone.
- **The AI service (Python / FastAPI):** the "specialist." When a prediction is needed, the front desk passes the request here. This service loads the trained model for that stock, runs the forecast, and returns the predicted prices.

Supporting technologies include **MongoDB** (a database that stores user accounts, watchlists, and portfolios), and standard security tools for password protection and login tokens.

In short:

> **Your phone → Main server (Node.js) → AI service (Python) → trained model for that stock → forecast → back to your phone.**

---

## How the Models Stay Current

The price history files can be **refreshed** with the latest trading days using update scripts, and the models can then be **re-trained** on that newer data. This is currently done manually by the team rather than fully automatically.



## One-Line Summary

The app keeps years of daily price history for Pakistan's top 31 stocks, feeds it into AI models (a deep-learning network called LSTM and a statistical model called Prophet), and uses them to forecast each stock's price for the coming days, delivered through a Node.js app backed by a dedicated Python AI service.
