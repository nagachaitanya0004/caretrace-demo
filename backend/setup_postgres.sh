#!/bin/bash

# PostgreSQL Setup Script for CareTrace AI
# This script helps set up PostgreSQL alongside MongoDB (non-destructive)

set -e

echo "========================================================================"
echo "CareTrace AI - PostgreSQL Setup"
echo "========================================================================"
echo ""
echo "This script will:"
echo "  1. Install PostgreSQL dependencies"
echo "  2. Help configure PostgreSQL connection"
echo "  3. Test the connection"
echo ""
echo "IMPORTANT: This does NOT affect your existing MongoDB setup!"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo ""
echo "Step 1: Installing Python dependencies..."
echo "----------------------------------------"
cd "$(dirname "$0")"
pip install -r requirements.txt

echo ""
echo "✓ Dependencies installed"
echo ""

echo "Step 2: PostgreSQL Configuration"
echo "----------------------------------------"
echo ""
echo "Do you have PostgreSQL installed and running?"
echo ""
echo "If not, install it:"
echo "  macOS:   brew install postgresql@15 && brew services start postgresql@15"
echo "  Ubuntu:  sudo apt install postgresql postgresql-contrib"
echo "  Docker:  docker run --name caretrace-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15"
echo ""
read -p "Is PostgreSQL running? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please install and start PostgreSQL, then run this script again."
    exit 0
fi

echo ""
echo "Step 3: Database Setup"
echo "----------------------------------------"
echo ""
read -p "Create database 'caretrace_ai'? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating database..."
    createdb caretrace_ai 2>/dev/null || echo "Database may already exist (this is OK)"
    echo "✓ Database ready"
fi

echo ""
echo "Step 4: Environment Configuration"
echo "----------------------------------------"
echo ""

if [ ! -f "../.env" ]; then
    echo "Creating .env file from template..."
    cp ../.env.example ../.env
    echo "✓ .env file created"
else
    echo "✓ .env file already exists"
fi

echo ""
echo "Please add this line to your .env file:"
echo ""
echo "POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/caretrace_ai"
echo ""
read -p "Press Enter when done..."

echo ""
echo "Step 5: Testing Connection"
echo "----------------------------------------"
echo ""
python -m app.db.test_postgres

echo ""
echo "========================================================================"
echo "Setup Complete!"
echo "========================================================================"
echo ""
echo "PostgreSQL is now configured and ready for future integration."
echo "Your MongoDB application continues to work normally."
echo ""
echo "Next steps:"
echo "  - Review backend/POSTGRES_SETUP.md for detailed documentation"
echo "  - PostgreSQL is NOT yet used by the application"
echo "  - All data is still stored in MongoDB"
echo ""
echo "To enable PostgreSQL health check endpoint (optional):"
echo "  - Uncomment postgres_health router in app/main.py"
echo "  - Visit http://localhost:8001/postgres/health"
echo ""
echo "========================================================================"
