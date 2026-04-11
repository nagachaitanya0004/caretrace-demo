# CareTrace AI

A comprehensive healthcare application that helps users track symptoms, detect patterns, and receive AI-powered health insights.

## Features

- **User Profile Management**: Collect and store personal health information
- **Symptom Tracking**: Log symptoms with duration and severity levels
- **Health Timeline**: Visualize symptom history and patterns
- **AI Analysis**: Simulated intelligent analysis of health data
- **Risk Assessment**: Automatic risk level calculation based on symptoms
- **Health Alerts**: Notifications for persistent or concerning symptoms
- **Personalized Recommendations**: Actionable health advice based on analysis

## Technology Stack

- **Frontend**: React 19 with Vite
- **Styling**: Tailwind CSS v4
- **Routing**: React Router DOM v7
- **State Management**: React Context API
- **Build Tool**: Vite
- **Linting**: ESLint

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## User Journey

1. **Landing**: Introduction and start assessment
2. **Profile**: Enter personal information (age, gender, lifestyle)
3. **Symptoms**: Log current symptoms with details
4. **Timeline**: Review symptom history
5. **Analysis**: AI-powered risk assessment
6. **Alerts**: View any health alerts
7. **Recommendations**: Get personalized health advice

## Risk Logic

- **Low Risk**: No symptoms or mild, short-duration symptoms
- **Medium Risk**: Symptoms persisting >14 days
- **High Risk**: Multiple repeated symptoms

## Disclaimer

This application is for informational purposes only and does not provide medical advice. Always consult healthcare professionals for medical concerns.
