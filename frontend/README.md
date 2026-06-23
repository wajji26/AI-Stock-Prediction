# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.


cd backend/ai-models/price-prediction
  iconv -f UTF-16 -t UTF-8 requirements.txt | sed 's/\r$//' >
  requirements.utf8.txt                                                         
  
  Then create a venv and install. The deps include TensorFlow, Prophet          
  (cmdstanpy), yfinance, FastAPI, etc., recommend Python 3.11 (TF 2.16 / numpy
  1.26 don't support 3.13):                                                     
                  
  python3.11 -m venv venv
  source venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.utf8.txt

  Note: tensorflow-intel==2.16.1 is Windows-only, if install fails on Linux,   
  drop that line. Prophet also needs a working C++ toolchain (build-essential).
                                                                                
  Run the API (FastAPI app is app/main.py, no __main__ block, use uvicorn      
  directly; commented code suggests port 8001):
                                                                                
  uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

  Health check: curl http://localhost:8001/health