# SelfTest - Modern Study Companion

SelfTest is a powerful, web-based application designed to help students master their subjects through active recall. It transforms static lecture notes and JSON question banks into interactive, timed practice tests with detailed analytics.

![SelfTest Dashboard Screenshot](https://placehold.co/1200x600/png?text=SelfTest+Dashboard+Preview)

## 🚀 Features

### 📚 Organization & Management
- **Smart Dashboard:** Organize tests into nested folders for different courses or subjects.
- **Search & Filter:** Instantly find tests by name or content.
- **Drag & Drop:** Intuitive file management for organizing your study materials.
- **File Support:** Upload JSON question banks or PDF lecture notes (future AI integration).

### 📝 Test Taking Experience
- **Exam Simulation:** Timed tests with a distraction-free interface.
- **Interactive Controls:** Keyboard shortcuts (1-4 for options, F to flag, P to pause).
- **Progress Tracking:** Visual progress bar and question navigation grid.
- **Responsive Design:** Works seamlessly on desktop, tablet, and mobile.

### 📊 Review & Analytics
- **Detailed Review:** Analyze your performance question-by-question.
- **Smart Stats:** View correct/incorrect counts, unanswered questions, and flagged items.
- **History:** Track your improvement over time with attempt history and score trends.
- **Explanations:** View detailed explanations for every answer.

### 🎨 UI/UX
- **Dark Mode:** Fully supported dark theme for late-night study sessions.
- **Modern Aesthetics:** Built with a clean, professional design using Tailwind CSS.
- **Smooth Animations:** Powered by Framer Motion for a polished feel.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Phosphor Icons](https://phosphoricons.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **State Management:** React Hooks & Context

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication:** Supabase Auth

### Deployment
- **Containerization:** Docker (Frontend & Backend)
- **Cloud Provider:** Google Cloud Run
- **CI/CD:** GitHub Actions (Ready for integration)

---

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase Account

### 1. Clone the Repository
```bash
git clone https://github.com/abeeshans/test-taker.git
cd test-taker
```

### 2. Backend Setup
```bash
cd backend
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload
```
The backend will run on `http://localhost:8000`.

### 3. Frontend Setup
```bash
cd frontend
# Install dependencies
npm install

# Run the development server
npm run dev
```
The frontend will run on `http://localhost:3000`.

### 4. Environment Variables
Create a `.env.local` file in `frontend/` and a `.env` file in `backend/` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (Backend only)
```

---

## ☁️ Deployment

This project is optimized for **Google Cloud Run**.

1.  **Frontend:** Built as a standalone Next.js Docker container.
2.  **Backend:** Built as a lightweight Python FastAPI Docker container.

See the [Deployment Guide](deployment_guide.md) for detailed step-by-step instructions on how to deploy to Google Cloud Run, manage costs, and set up custom domains.

---

## 📂 Project Structure

```
test-taker/
├── frontend/           # Next.js Application
│   ├── src/app/        # App Router Pages
│   ├── src/components/ # Reusable UI Components
│   └── public/         # Static Assets
├── backend/            # FastAPI Application
│   ├── main.py         # API Endpoints
│   └── requirements.txt
├── json/               # Sample Question Banks (Ignored by Git)
└── PDFs/               # Lecture Notes (Ignored by Git)
```

## 📄 License

Designed and built by **Abeeshan Selvabaskaran**.
All rights reserved.
