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
        private static readonly string[] _permittedExtensions = { ".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg" };
        private static readonly string[] _permittedMimeTypes = {
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/png",
            "image/jpeg",
            "image/pjpeg"
        };
        private const long _maxFileSize = 10 * 1024 * 1024; // 10 MB limit

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
                return BadRequest(new { message = "File size exceeds the 10MB limit." });

            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            if (string.IsNullOrEmpty(ext) || !_permittedExtensions.Contains(ext))
                return BadRequest(new { message = "Invalid file type. Allowed formats: PDF, DOC, DOCX, PNG, JPG, JPEG." });

            // Validate Content-Type / MIME type
            var contentType = file.ContentType?.ToLowerInvariant();
            if (string.IsNullOrEmpty(contentType) || !_permittedMimeTypes.Contains(contentType))
            {
                return BadRequest(new { message = "Invalid file MIME type." });
            }

            // Reject executable / script content magic header signatures
            using (var headerStream = file.OpenReadStream())
            {
                var headerBuffer = new byte[4];
                var bytesRead = await headerStream.ReadAsync(headerBuffer, 0, headerBuffer.Length);
                if (bytesRead >= 2)
                {
                    // "MZ" header (Windows PE executables / DLLs)
                    if (headerBuffer[0] == 0x4D && headerBuffer[1] == 0x5A)
                    {
                        return BadRequest(new { message = "Executable files are strictly prohibited." });
                    }
                    // ELF executable header "\x7FELF"
                    if (bytesRead >= 4 && headerBuffer[0] == 0x7F && headerBuffer[1] == 0x45 && headerBuffer[2] == 0x4C && headerBuffer[3] == 0x46)
                    {
                        return BadRequest(new { message = "Executable files are strictly prohibited." });
                    }
                }
            }

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

        [AllowAnonymous]
        [HttpGet("download")]
        public IActionResult Download([FromQuery] string filePath)
        {
            if (string.IsNullOrEmpty(filePath))
                return BadRequest(new { message = "FilePath parameter is required." });

            // Security check: prevent directory traversal by taking only the filename
            var fileName = Path.GetFileName(filePath);
            var fullPath = Path.Combine(_uploadFolder, fileName);

            if (!System.IO.File.Exists(fullPath))
                return NotFound(new { message = "File not found on server." });

            var memory = new MemoryStream();
            using (var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read))
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
                {".png", "image/png"},
                {".jpg", "image/jpeg"},
                {".jpeg", "image/jpeg"}
            };

            var ext = Path.GetExtension(path)?.ToLowerInvariant() ?? "";
            return types.GetValueOrDefault(ext, "application/octet-stream");
        }
    }
}
