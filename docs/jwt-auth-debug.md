# Debugging Log: JWT Token Instantly Expiring (June 15)

**The Issue:** 
Right after I set up my Spring Security JWT filter, I noticed I was getting a `401 Unauthorized` immediately after logging in. The login endpoint would return a token, but the very next API request I made using that token in the Authorization header would be rejected by the backend.

**My Prompt to AI:**
> "Act as a precise Code Reviewer. Critique my implementation. I wrote this JWT generation method using `io.jsonwebtoken.Jwts`, but every time I decode the token on jwt.io, it says it's already expired even though I literally just generated it. Here's my exact snippet: [pasted code]. Aggressively scan this for logical or arithmetic flaws."

**The Fix:**
The AI's strict code review immediately flagged the arithmetic flaw: I typed `new Date(System.currentTimeMillis() - jwtExpirationMs)` instead of `+ jwtExpirationMs`. Because I used a minus sign, every token I generated was being hardcoded with an expiration date 24 hours in the *past*. 

Having a harsh code-reviewer persona spot that typo was a lifesaver. Fixed the arithmetic to use a plus sign and the authentication flow worked perfectly.
