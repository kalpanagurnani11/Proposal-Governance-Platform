# Dev Notes: Architecture & AI Prompts

Just keeping a log here of how I approached the architecture for this project. 

I wrote this whole codebase myself from scratch, but I did use AI as a sounding board. In my Gen AI classes, we were taught to use "Critic" personas to get the best out of LLMs. Instead of asking for code, I ask the AI to aggressively critique my ideas.

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

### 3. Java and .NET dual-backend setup
**My Prompt:**
> "Act as a harsh DevOps Engineer. Critique my frontend routing strategy. I have a Spring Boot backend on 8081 and a .NET backend on 5024. I am currently hardcoding the `localhost:8081` URLs in all my React components. Why is this a terrible idea, and what is the best practice for dynamic swapping?"

**What I did with the advice:**
The AI roasted the hardcoded URLs and suggested using a centralized `api.js` file with an Axios interceptor that pulls from Vite's `import.meta.env`. I implemented the interceptor based on that critique, making testing a breeze.
