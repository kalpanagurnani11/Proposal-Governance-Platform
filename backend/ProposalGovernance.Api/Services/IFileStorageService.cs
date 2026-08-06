using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace ProposalGovernance.Api.Services
{
    public interface IFileStorageService
    {
        Task<string> SaveFileAsync(IFormFile file, string subFolder = "uploads");
        Task<Stream?> GetFileAsync(string filePath);
        Task<bool> DeleteFileAsync(string filePath);
    }
}
