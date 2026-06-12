#!/bin/bash

# Campus Connect - Start Frontend Only (macOS & Linux)
# This script starts the frontend server

set -e

echo ""
echo "============================================================================="
echo "  Campus Connect - Frontend Startup Script (macOS/Linux)"
echo "============================================================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/campus-connect-now"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Error: Project directory not found at $PROJECT_DIR"
    echo "Please run this script from the Campus Connect root directory"
    exit 1
fi

echo "✅ Found project at: $PROJECT_DIR"
echo ""

echo "📋 Starting frontend server..."
echo ""

cd "$PROJECT_DIR"
npm run dev
