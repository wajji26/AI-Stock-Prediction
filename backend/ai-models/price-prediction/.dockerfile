FROM python:3.11-slim                                     
                                                                                   
  WORKDIR /app
                                                                                   
  RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential gcc g++ && rm -rf /var/lib/apt/lists/*
                                                                                   
  COPY requirements.utf8.txt .                                                     
  RUN pip install --no-cache-dir -r requirements.utf8.txt                          
                                                                                   
  COPY . .                                                  

  ENV PORT=8001
  EXPOSE 8001
  CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]