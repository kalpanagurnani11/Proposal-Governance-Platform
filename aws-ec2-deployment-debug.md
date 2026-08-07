# Debugging Log: AWS EC2 Deployment Memory Crash (July 10)

**The Issue:**
I deployed the Java Spring Boot backend to a Free Tier AWS EC2 instance (`t2.micro`). The deployment via Git pull went smoothly, and Maven built the project successfully. However, when I ran `./mvnw spring-boot:run`, the application would start up and then suddenly crash after about 30 seconds with a `Killed` message in the terminal.

**My Prompt to AI:**
> "Act as a Senior Cloud Solutions Architect. Critique my deployment strategy. I deployed my Spring Boot application to a Free Tier AWS EC2 `t2.micro` instance. It builds fine, but when I start it, the terminal just says 'Killed' after a few seconds and the server stops without a Java stack trace. What is fatally wrong with running the JVM on this specific instance type, and what is the best workaround?"

**The Fix:**
The cloud architect critique pointed out the fundamental flaw: a `t2.micro` instance only has 1GB of RAM. The JVM (especially when running via Maven wrapper) easily consumes more than that during startup, triggering the Linux OOM (Out of Memory) Killer, which forcibly terminates the process.

To fix it without paying for a larger server, the AI suggested configuring a Linux Swap File to give the OS virtual memory. I created a 2GB swap file using `dd` and `mkswap`. Once the swap file was active, the Spring Boot application started up perfectly and has been stable ever since.
