# Debugging Log: Vite vs Spring Boot CORS Block (June 17)

**The Issue:**
My React frontend wasn't able to hit my Java backend API. The browser console was screaming about CORS policy blocking the `OPTIONS` preflight request. This is a classic error when separating the frontend and backend into two different servers.

**My Prompt to AI:**
> "Act as an expert Network Security Engineer. Critique my CORS configuration. I am getting a CORS blocked error when Vite (`http://localhost:5173`) calls Spring Boot (`http://localhost:8081`). I added a `@Bean` for `CorsConfigurationSource` in my `SecurityConfig.java`. Here is my snippet. What vulnerability or configuration error is causing the browser to reject this preflight request?"

**The Fix:**
The network security critique revealed that my `AllowedOrigins` list only had `http://localhost:3000` (which is standard for Create React App) instead of `5173` which Vite uses. Because the origin ports didn't match, Spring Boot's strict security policy correctly threw out the preflight request. 

I updated the config array to include `http://localhost:5173` and `http://127.0.0.1:5173`, restarted the server, and the API requests went through cleanly.
