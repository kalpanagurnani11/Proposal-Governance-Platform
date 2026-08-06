using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace ProposalGovernance.Api.Services
{
    public class LocalStorageProvider : IFileStorageService
    {
        private readonly string _baseUploadPath;

        public LocalStorageProvider()
        {
            _baseUploadPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(_baseUploadPath))
            {
                Directory.CreateDirectory(_baseUploadPath);
            }
        }

        public async Task<string> SaveFileAsync(IFormFile file, string subFolder = "uploads")
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("Invalid file content.");

            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            var secureFileName = $"{Guid.NewGuid()}{ext}";
            var fullPath = Path.Combine(_baseUploadPath, secureFileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return $"/uploads/{secureFileName}";
        }

        public Task<Stream?> GetFileAsync(string filePath)
        {
            var fileName = Path.GetFileName(filePath);
            var fullPath = Path.Combine(_baseUploadPath, fileName);

            if (!File.Exists(fullPath))
                return Task.FromResult<Stream?>(null);

            Stream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return Task.FromResult<Stream?>(stream);
        }

        public Task<bool> DeleteFileAsync(string filePath)
        {
            var fileName = Path.GetFileName(filePath);
            var fullPath = Path.Combine(_baseUploadPath, fileName);

            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }
    }
}
