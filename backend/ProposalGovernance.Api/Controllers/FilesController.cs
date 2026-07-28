using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ProposalGovernance.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class FilesController : ControllerBase
    {
        private readonly string _uploadFolder;
        private readonly string[] _permittedExtensions = { ".pdf", ".doc", ".docx", ".xls", ".xlsx" };
        private const long _maxFileSize = 5 * 1024 * 1024; // 5 MB

        public FilesController()
        {
            _uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(_uploadFolder))
            {
                Directory.CreateDirectory(_uploadFolder);
            }
        }

        [HttpPost("upload")]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded." });

            if (file.Length > _maxFileSize)
                return BadRequest(new { message = "File size exceeds the 5MB limit." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (string.IsNullOrEmpty(ext) || !_permittedExtensions.Contains(ext))
                return BadRequest(new { message = "Invalid file type. Permitted formats: PDF, Word, Excel." });

            // Generate a secure unique filename
            var secureFileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(_uploadFolder, secureFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return relative URI
            var fileUri = $"/uploads/{secureFileName}";
            return Ok(new { filePath = fileUri, originalName = file.FileName });
        }

        [HttpGet("download")]
        public IActionResult Download([FromQuery] string filePath)
        {
            if (string.IsNullOrEmpty(filePath))
                return BadRequest(new { message = "FilePath parameter is required." });

            // Security check: prevent directory traversal by taking only the filename
            var fileName = Path.GetFileName(filePath);
            var fullPath = Path.Combine(_uploadFolder, fileName);

            if (!System.IO.File.Exists(fullPath))
                return NotFound(new { message = "File not found." });

            var memory = new MemoryStream();
            using (var stream = new FileStream(fullPath, FileMode.Open))
            {
                stream.CopyTo(memory);
            }
            memory.Position = 0;

            var contentType = GetContentType(fullPath);
            return File(memory, contentType, fileName);
        }

        private string GetContentType(string path)
        {
            var types = new System.Collections.Generic.Dictionary<string, string>
            {
                {".pdf", "application/pdf"},
                {".doc", "application/msword"},
                {".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
                {".xls", "application/vnd.ms-excel"},
                {".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
            };

            var ext = Path.GetExtension(path).ToLowerInvariant();
            return types.GetValueOrDefault(ext, "application/octet-stream");
        }
    }
}
