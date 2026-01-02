# Backend (FastAPI)

## Getting Started
1. Create virtual environment and install dependencies:
   `ash
   python -m venv .venv
   .venv\\Scripts\\activate
   pip install -r requirements.txt
   `
2. Run the dev server:
   `ash
   uvicorn app.main:app --reload
   `

## Structure
- app/main.py: FastAPI app entrypoint
- app/api/: future routers (REST endpoints)
- app/models/: ORM models / schemas
- app/services/: business logic, DB adapters

Add routers under pp/api and include them in main.py for clean route organization.
