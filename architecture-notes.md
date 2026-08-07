# Dev Notes: Architecture & AI Prompts

I am making this file to keep a record of how I built this project. 

The `.NET` backend was my **CDAC institute group project**. But to improve my skills, I built the `Java` Spring Boot backend and the React frontend all by myself from scratch! I used AI to help me check my work. In my Gen AI classes, we learned to use "Critic" prompts. This means instead of just asking the AI to write code, I ask it to find mistakes in my ideas.

Here are some examples of how I used the "Expert Critic" prompting strategy:

### 1. Figuring out the Payment Flow
**My Prompt:**
> "Act as a strict Senior Security Architect. I am building a subscription platform in Spring Boot and React and need to integrate Razorpay. I am thinking of handling the order creation entirely on the frontend to save backend processing time. Please aggressively critique this approach. What are the security vulnerabilities, and what is the industry-standard flow?"

**What I did with the advice:**
The AI's critique completely tore down the frontend approach, highlighting that API keys would be exposed and prices could be manipulated. It suggested the standard server-to-server model. I took the critique and implemented `SubscriptionService.java` securely on the backend. 

### 2. Database Schema for Subscriptions
**My Prompt:**
> "Act as an expert Database Administrator. Critique my proposed schema design: I want to add a simple `PlanId` and `IsActive` column to my `Users` table to handle subscriptions using EF Core and JPA. What are the fatal flaws in this design when dealing with billing histories and plan changes?"

**What I did with the advice:**
The AI criticized the lack of historical tracking, pointing out that overwriting a single row destroys audit logs for past subscriptions. It suggested a separate `UserSubscriptions` table. I took the critique and created the relational `UserSubscription` entity.

### 3. Migrating from .NET to Java
**My Prompt:**
> "Act as a harsh DevOps Engineer. Critique my frontend routing strategy. I have my new solo Spring Boot backend on 8081 and the legacy CDAC institute `.NET` backend on 5024. I am currently hardcoding the `localhost:8081` URLs in all my React components. Why is this a terrible idea, and what is the best practice for dynamic swapping between the two backends?"

**What I did with the advice:**
The AI roasted the hardcoded URLs and suggested using a centralized `api.js` file with an Axios interceptor that pulls from Vite's `import.meta.env`. I implemented the interceptor based on that critique, making testing a breeze.
