# CareTrace AI - Health Monitoring Platform

A comprehensive health monitoring and analysis platform built with FastAPI (backend) and React (frontend).

## Features

- 🏥 **Health Metrics Tracking** - Monitor vital signs, symptoms, and health data
- 📊 **AI-Powered Analysis** - Automated risk assessment and health insights
- 📱 **Medical Reports** - Upload and manage medical documents (PDF, JPG, PNG)
- 🔔 **Smart Alerts** - Automated notifications for critical health events
- 📈 **Timeline View** - Visualize health trends over time
- 🌍 **Multilingual Support** - Available in English, Hindi, Kannada, Tamil, and Telugu
- 🔐 **Secure Authentication** - JWT-based authentication with user privacy
- 🎨 **Modern UI** - Responsive design with dark/light theme support

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database with GridFS for file storage
- **Motor** - Async MongoDB driver
- **JWT** - Secure authentication
- **Pytest** - Testing framework with property-based testing

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **i18next** - Internationalization
- **Recharts** - Data visualization
- **Vitest** - Testing framework

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### Setup Instructions

1. **Clone and navigate to the project**
   ```bash
   git clone <repository-url>
   cd care-trace-ai-demo
   ```

2. **Install dependencies**
   ```bash
   npm run install:frontend
   npm run install:backend
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   **IMPORTANT**: Update the `.env` file with your actual values:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=caretrace_ai
   SECRET_KEY=<generate-strong-random-key>
   ACCESS_TOKEN_EXPIRE_MINUTES=10080
   CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   ```
   
   **Generate a secure SECRET_KEY**:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

4. **Run the application**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend at `http://127.0.0.1:8001`
   - Frontend at `http://localhost:5173`

### Accessing the Application

**Frontend (User Interface)**:
- Open http://localhost:5173 in your browser
- This is the main application interface

**Backend (API Documentation)**:
- Swagger UI: http://127.0.0.1:8001/docs (interactive API testing)
- ReDoc: http://127.0.0.1:8001/redoc (clean API documentation)
- Health Check: http://127.0.0.1:8001/health

**Note**: The backend is an API server without a visual homepage. Use `/docs` or `/redoc` to explore the API, or use the frontend application to interact with all features.

### Available Commands

From the root directory:

```bash
npm run dev              # Run both backend and frontend
npm run dev:backend      # Run backend only
npm run dev:frontend     # Run frontend only
npm run build            # Build frontend for production
npm run test             # Run all tests (backend + frontend)
npm run test:backend     # Run backend tests only
npm run test:frontend    # Run frontend tests only
npm run install:frontend # Install frontend dependencies
npm run install:backend  # Install backend dependencies
```

## Production Deployment

### Backend (Render)

1. **Create Web Service on Render**
   - Connect your GitHub repository
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port 10000`

2. **Set Environment Variables**
   ```
   MONGO_URI=<your-mongodb-connection-string>
   DB_NAME=caretrace_ai
   SECRET_KEY=<generate-with-python-secrets-module>
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=10080
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```
   
   **Generate SECRET_KEY**:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

### Frontend (Vercel)

1. **Deploy to Vercel**
   - Connect your GitHub repository
   - Root directory: `frontend`
   - Framework preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

2. **Set Environment Variables**
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```

3. **Update Backend CORS**
   After deployment, update backend's `CORS_ORIGINS` to include your Vercel URL.

## Demo Account

Try the platform with the demo account:
- **Email**: `rahul@demo.com`
- **Password**: `demo1234`

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## Project Structure

```
care-trace-ai-demo/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/               # API routes and endpoints
│   │   ├── core/              # Core functionality (auth, config, security)
│   │   ├── db/                # Database connection and seed data
│   │   ├── models/            # Data models
│   │   ├── schemas/           # Pydantic schemas for validation
│   │   └── utils/             # Utility functions
│   ├── tests/                 # Backend tests
│   └── requirements.txt       # Python dependencies
├── frontend/                  # React frontend
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API service layer
│   │   ├── i18n/             # Internationalization
│   │   ├── constants/        # Application constants
│   │   ├── data/             # Static data
│   │   └── utils/            # Utility functions
│   └── package.json          # Node dependencies
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore rules
├── CONTRIBUTING.md          # Contribution guidelines
├── LICENSE                  # MIT License
├── README.md               # Project documentation
├── SECURITY.md             # Security policy and guidelines
├── package.json            # Root package.json for scripts
└── render.yaml             # Render deployment config
```

## Security Features

- ✅ JWT-based authentication with secure token handling
- ✅ Password hashing with bcrypt (industry standard)
- ✅ CORS protection with configurable origins
- ✅ Input validation with Pydantic schemas
- ✅ File upload validation (type, size, content)
- ✅ User data isolation and access control
- ✅ Secure environment variable handling
- ✅ MongoDB connection encryption (TLS/SSL)
- ✅ No sensitive data in version control

### Security Best Practices

**Environment Variables**:
- Never commit `.env` files to version control
- Use strong, randomly generated SECRET_KEY (minimum 32 characters)
- Rotate secrets regularly in production
- Use different credentials for development and production

**MongoDB Security**:
- Enable IP whitelist in MongoDB Atlas
- Use strong database passwords
- Enable database encryption at rest
- Regular backup schedule

**Production Deployment**:
- Use HTTPS for all connections
- Set secure CORS origins (no wildcards)
- Enable rate limiting
- Monitor logs for suspicious activity
- Keep dependencies updated

## Environment Variables

### Backend (.env in root directory)
```env
# Database
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
DB_NAME=caretrace_ai

# Security - CRITICAL: Use strong random values in production
SECRET_KEY=<64-character-hex-string>  # Generate with: python -c "import secrets; print(secrets.token_hex(32))"
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS - Update with your actual frontend domains
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Frontend (Vercel Environment Variables)
```env
VITE_API_URL=https://your-backend.onrender.com
```

**⚠️ SECURITY WARNING**: 
- Never commit `.env` files to version control
- Never use default or example values in production
- Generate strong random secrets for production deployments

## Troubleshooting

### "Try Demo" Button Not Working

**Symptoms**: Clicking "Try Demo" redirects to login with error message.

**Solutions**:
1. Verify `VITE_API_URL` is set in Vercel environment variables
2. Ensure demo user exists (run seed script)
3. Check backend CORS configuration includes your Vercel domain
4. Verify backend is running and accessible

### CORS Errors

**Solution**: Update backend's `CORS_ORIGINS` environment variable to include your frontend domain:
```
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```

### Database Connection Failed

**Solutions**:
1. Verify MongoDB Atlas cluster is running
2. Check IP whitelist (use `0.0.0.0/0` for cloud deployments)
3. Verify connection string format
4. Ensure database user has read/write permissions

### Backend Not Responding

**Solutions**:
1. Check Render service status
2. Review Render logs for errors
3. Verify MongoDB connection
4. Ensure environment variables are set correctly

## Testing

The project includes comprehensive test coverage:

### Backend Tests (25 tests)
- Health metrics CRUD operations
- Property-based testing for data validation
- Medical reports upload/download/delete
- File validation (type, size)
- Authentication and authorization

### Frontend Tests (13 tests)
- Component rendering
- User interactions
- Property-based testing for health metrics
- Form validation

Run all tests:
```bash
# Backend
cd backend && pytest tests/ -v

# Frontend
cd frontend && npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Healthcare Disclaimer**: This software is for educational/demonstration purposes. Not intended for actual medical use without proper regulatory approval and medical oversight.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Render/Vercel logs
3. Check browser console for client-side errors
4. Verify all environment variables are set correctly

## Acknowledgments

- Built with FastAPI and React
- Uses MongoDB for data storage
- Deployed on Render (backend) and Vercel (frontend)
- Internationalization powered by i18next
- Charts powered by Recharts
