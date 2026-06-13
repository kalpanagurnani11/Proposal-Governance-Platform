using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace ProposalGovernance.Api.Hubs
{
    public class NotificationHub : Hub
    {
        // Clients can call this to register their userId
        public async Task RegisterUser(string userId)
        {
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
            }
        }

        // Clients can call this to register to role-based notifications
        public async Task RegisterRole(string role)
        {
            if (!string.IsNullOrEmpty(role))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"Role_{role}");
            }
        }

        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"Client connected: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"Client disconnected: {Context.ConnectionId}");
            await base.OnDisconnectedAsync(exception);
        }
    }
}
