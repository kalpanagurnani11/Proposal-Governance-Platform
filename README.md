# Proposal Governance Platform 🚀

Hey there! Welcome to the repo for my **Proposal Governance Platform**. 

I built this platform to solve a specific problem: bridging the gap between startup founders and investors. It allows founders to submit business proposals and pitch decks, while investors can browse, review, and express interest in funding them. 

The coolest part? I integrated **Google's Gemini AI** to act as a smart assistant that automatically analyzes proposals and gives founders feedback before they submit. 

## 🛠️ Tech Stack
I wanted to challenge myself, so I actually built **two different backends** that can swap seamlessly with the frontend. 

**Frontend:**
- **React + Vite** (Super fast builds)
- **TailwindCSS / Vanilla CSS** for the UI
- **Axios** for API calls

**Backend 1 (Java):**
- **Spring Boot 3**
- **Spring Security + JWT** for authentication
- **Hibernate / JPA** for database ORM

**Backend 2 (.NET):**
- **C# ASP.NET Core Web API**
- **Entity Framework Core**
- **JWT Bearer Auth**

**Third-Party Integrations:**
- **Razorpay API**: Handles premium subscription upgrades (Founder Premium / Investor Premium).
- **Gemini AI API**: Generates automated proposal analysis.

## ☁️ Cloud Deployment (AWS EC2)
The platform is fully configured and production-ready. It was successfully deployed to the cloud using an **Amazon Web Services (AWS) EC2 Instance**. The deployment pipeline is entirely Git-based—changes are pulled directly into the EC2 environment, built, and served. 

*Note: The live EC2 instance is currently spun down to conserve cloud resources. However, the architecture remains fully cloud-ready and can be re-provisioned in minutes.*

## 🚀 How to Run It Locally

If you want to spin this up on your local machine, here's how to do it. 

### 1. The Frontend
Open a terminal, `cd` into the `frontend` folder, and run:
```bash
npm install
npm run dev
```
It will start the Vite server on `http://localhost:5173`.

### 2. The Backend (Pick your flavor!)
**To run the Java backend:**
Open another terminal, `cd` into `backend-java`, and run:
```bash
./mvnw spring-boot:run
```
*(Runs on port 8081)*

**To run the .NET backend:**
`cd` into `backend`, and run:
```bash
dotnet run
```
*(Runs on port 5024)*

*Note: The React frontend uses environment variables to dynamically route to whichever backend you decide to run!*

## 🐛 Debugging & Architecture Logs
I didn't just want to push code; I wanted to document my journey building this. If you are reviewing my code (hi interviewers! 👋), I highly recommend checking out the markdown files in the root of this repo. 

I've documented some of the nastiest bugs I ran into (like CORS nightmares, Razorpay Auth failures, and AWS S3 limits) and exactly how I used Prompt-Driven Development (via AI) to get myself unblocked. 

- `docs/architecture-notes.md`
- `docs/gemini-ai-integration-notes.md`
- `docs/jwt-auth-debug.md`
- `docs/cors-policy-debug.md`
- `docs/aws-ec2-deployment-debug.md`
- `docs/razorpay-401-debug-notes.md`
- `docs/jpa-lazy-loading-fix.md`

## License
Feel free to poke around the code, fork it, or reach out if you have any questions!
