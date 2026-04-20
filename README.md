<div align="center">
  <h1>🚀 PromptStack</h1>
  <h3>Next-Generation AI Assistant & Image Generation Platform</h3>
  
  <p align="center">
    <a href="https://use-promptstack.vercel.app"><b>Live Demo</b></a> ~ 
    <a href="#-key-features"><b>Features</b></a> ~ 
    <a href="#-tech-stack-architecture"><b>Architecture</b></a> ~ 
    <a href="#-getting-started"><b>Setup</b></a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
    <img src="https://img.shields.io/badge/Stripe-008CDD?style=for-the-badge&logo=stripe&logoColor=white" alt="Stripe" />
    <img src="https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  </p>
</div>

---

**PromptStack** is a powerful, production-grade generative AI platform that delivers seamless conversational AI capabilities, real-time response streaming, and stunning AI image generation. Built around a scalable **MERN** architecture and enriched with enterprise integrations (Stripe, ImageKit, WebSockets), it provides a premium, highly responsive, and monetizable user experience.

## 🔗 Live Links
| Feature | Link |
| --- | --- |
| 🌐 **Live Demo (Frontend)** | https://promptstack-ai.vercel.app
| ⚙️ **API Server (Backend)** |  https://promptstack-server.vercel.app

---

## ✨ Key Features

This project demonstrates strong expertise in building scalable, real-world full-stack applications. Here are the core features powering the experience:

- ⚡ **Real-Time AI Streaming:** Implemented **WebSockets (`Socket.io`)** for word-by-word response streaming, completely eliminating wait times and mimicking human-like typing speeds.
- 💬 **Context-Aware Smart Chat:** Persistent AI memory and deep contextual interactions powered by the robust **Gemini 2.5 Flash** model (via OpenAI SDK compat).
- 🎨 **In-App AI Image Generation:** Users can seamlessly generate high-quality images directly from text prompts, processed and reliably hosted via **ImageKit**.
- 💎 **Premium UI/UX:** A visually immersive, mobile-first interface featuring modern glassmorphism design, fluid dynamic animations, and pristine typography using **Tailwind CSS v4** & **React 19**.
- 💳 **Secure Monetization Engine:** A robust credit-based economy integrated deeply with **Stripe Checkout**, including secure server-to-server webhook processing (via Svix) to handle credit top-ups asynchronously.
- 🔒 **Enterprise-Grade Security:** A custom **JWT-based authentication** pipeline complete with hashed passwords (`bcryptjs`) tracking user sessions securely.

---

## 💻 Tech Stack & Architecture

| Layer | Technologies Used |
| --- | --- |
| **Frontend Utilities** | React 19, Vite, Tailwind CSS v4, Axios, React Router, Socket.io-client, React Markdown |
| **Backend & APIs** | Node.js, Express.js, WebSockets (Socket.io), REST API paradigm |
| **Database & Cache** | MongoDB, Mongoose, Redis (available for extended caching workflows) |
| **Authentication & Sec** | Custom JSON Web Tokens (JWT), bcryptjs |
| **Media & AI Cloud** | ImageKit (Storage/AI generation), Gemini 2.5 Flash API |
| **Billing & Webhooks** | Stripe API, Svix (Webhook signature verification) |

### Scalable Project Structure
```text
PromptStack/
├── client/                      # React Frontend (Vite Pipeline)
│   ├── src/
│   │   ├── components/          # Reusable UI modules (Sidebar, ChatBox, Markdown Parser)
│   │   ├── context/             # App-wide State management
│   │   └── pages/               # Routing endpoints (Home, Dashboard, Login)
├── server/                      # Node.js Backend Engine
│   ├── configs/                 # Extracted DB, OpenAI, ImageKit, Env configurations
│   ├── controllers/             # Business logic (REST + Webhook event handlers)
│   ├── models/                  # Mongoose data schemas (User, Chat, Transaction)
│   ├── routes/                  # Modular routing
│   └── server.js                # Core entry, HTTP + Socket.io listener
```

---

## 🛠️ Getting Started

Follow these steps to run PromptStack locally for development and testing.

### Prerequisites
Ensure you have the following installed and configured:
- **Node.js** (v18+)
- **MongoDB Atlas** Data URI
- **Stripe** Developer Account & Keys
- **ImageKit** Account & API Keys
- **Gemini API** Key

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/ideveshtripathii/PromptStack.git
cd PromptStack
```

**2. Backend Setup**
Navigate to the server directory and install packages:
```bash
cd server
npm install
```
Create a `.env` file in the root of the `server/` directory and map the infrastructure keys:
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_super_secret_jwt_key
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
IMAGEKIT_URL_ENDPOINT=your_imagekit_endpoint
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
OPENAI_API_KEY=your_gemini_api_key
```
Boot the development server:
```bash
npm run server
# Starts on http://localhost:5000
```

**3. Frontend Setup**
Open a new terminal session, navigate to the client side and install dependencies:
```bash
cd client
npm install
```
Create a `.env` file in the `client/` directory:
```env
VITE_BACKEND_URL=http://localhost:5000
```
Start the Vite development server:
```bash
npm run dev
# Starts on http://localhost:5173
```

---

## 📈 Roadmap & Future Enhancements
- [ ] **OAuth Integrations**: Add Google & GitHub one-click login for streamlined onboarding.
- [ ] **Data Export Pipelines**: Allow users to export long-form chat histories into nicely formatted PDF/Markdown files.

---

## 👤 About the Author

This application was engineered by **Devesh Tripathi** as a showcase of modern full-stack web development methodologies. 

- **GitHub:** [@ideveshtripathii](https://github.com/ideveshtripathii)
- **LinkedIn:** [Devesh Tripathi](https://www.linkedin.com/in/idevesh-tripathi)

> ⭐ If you found this project interesting or helpful, please consider giving it a star!
