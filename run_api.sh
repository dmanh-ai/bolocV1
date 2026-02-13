#!/bin/bash
# Run VN Sniper Backend API
cd /home/z/my-project
source venv/bin/activate
cd python_api
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
