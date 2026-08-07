# Debugging Log: Razorpay Basic Auth 401 Failure (June 19)

**The Issue:**
The official Razorpay Java SDK was throwing weird classpath errors and conflicts with my version of Spring Boot. To bypass this, I decided to just use a standard Spring `RestTemplate` to hit their API directly. But I kept getting a `401 Unauthorized` when trying to create an order, even though I copy-pasted my API keys perfectly.

**My Prompt to AI:**
> "Act as an expert API Integration Specialist. Critique my Basic Authentication header construction. I'm manually hitting `https://api.razorpay.com/v1/orders` using Spring `RestTemplate` and getting a 401 Unauthorized. Here's my exact string construction before Base64 encoding it: `String auth = razorpayKeyId + "|" + razorpayKeySecret;`. What critical formatting rule am I violating?"

**The Fix:**
The AI critique was blunt: Basic Auth strings strictly require a colon `:` separator, not a pipe `|` character. I swapped the pipe for a colon in my `SubscriptionService.java` and the API call went through successfully. Using the critic persona helped bypass generic API advice and immediately zeroed in on the string formatting flaw.
