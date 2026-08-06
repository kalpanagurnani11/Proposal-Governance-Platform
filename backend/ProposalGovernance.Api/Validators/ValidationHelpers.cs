using System;
using System.Text.RegularExpressions;

namespace ProposalGovernance.Api.Validators
{
    public static class ValidationHelpers
    {
        // Standard regular expressions
        public static readonly Regex PanRegex = new Regex(@"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", RegexOptions.Compiled);
        public static readonly Regex EmailRegex = new Regex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", RegexOptions.Compiled);
        public static readonly Regex AadhaarRegex = new Regex(@"^[2-9]\d{11}$", RegexOptions.Compiled);
        public static readonly Regex GstRegex = new Regex(@"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", RegexOptions.Compiled);
        public static readonly Regex CinRegex = new Regex(@"^[LUu][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$", RegexOptions.Compiled);
        public static readonly Regex UsernameRegex = new Regex(@"^[a-zA-Z0-9_-]{3,50}$", RegexOptions.Compiled);
        public static readonly Regex ContactNumberRegex = new Regex(@"^\+?[0-9\s-]{10,15}$", RegexOptions.Compiled);
        public static readonly Regex PatentRegex = new Regex(@"^[a-zA-Z0-9-]{5,30}$", RegexOptions.Compiled);

        public static bool IsValidPatentId(string? patentId)
        {
            if (string.IsNullOrWhiteSpace(patentId)) return false;
            return PatentRegex.IsMatch(patentId.Trim());
        }

        public static bool IsValidPastOrPresentDate(DateTime date, out string errorMessage, string fieldName = "Date")
        {
            errorMessage = string.Empty;
            if (date > DateTime.UtcNow.AddDays(1)) // Allow 1 day buffer for timezone differences
            {
                errorMessage = $"{fieldName} cannot be in the future.";
                return false;
            }
            return true;
        }

        public static bool IsValidFutureDate(DateTime date, out string errorMessage, string fieldName = "Target Date")
        {
            errorMessage = string.Empty;
            if (date < DateTime.UtcNow.Date.AddDays(-1)) // Allow 1 day buffer
            {
                errorMessage = $"{fieldName} cannot be in the past.";
                return false;
            }
            return true;
        }

        public static bool IsValidDateRange(DateTime startDate, DateTime endDate, out string errorMessage)
        {
            errorMessage = string.Empty;
            if (endDate <= startDate)
            {
                errorMessage = "End date must be strictly after start date.";
                return false;
            }
            return true;
        }

        public static bool IsValidPan(string? pan)
        {
            if (string.IsNullOrWhiteSpace(pan)) return false;
            return PanRegex.IsMatch(pan.Trim().ToUpper());
        }

        public static bool IsValidPassword(string? password, out string errorMessage)
        {
            errorMessage = string.Empty;
            if (string.IsNullOrEmpty(password))
            {
                errorMessage = "Password is required.";
                return false;
            }

            if (password.Length < 8)
            {
                errorMessage = "Password must be at least 8 characters long.";
                return false;
            }

            if (!Regex.IsMatch(password, @"[A-Z]"))
            {
                errorMessage = "Password must contain at least one uppercase letter (A-Z).";
                return false;
            }

            if (!Regex.IsMatch(password, @"[a-z]"))
            {
                errorMessage = "Password must contain at least one lowercase letter (a-z).";
                return false;
            }

            if (!Regex.IsMatch(password, @"[0-9]"))
            {
                errorMessage = "Password must contain at least one numeric digit (0-9).";
                return false;
            }

            if (!Regex.IsMatch(password, @"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?]"))
            {
                errorMessage = "Password must contain at least one special character (!@#$%^&*...).";
                return false;
            }

            return true;
        }

        public static bool IsValidEmail(string? email)
        {
            if (string.IsNullOrWhiteSpace(email)) return false;
            return EmailRegex.IsMatch(email.Trim());
        }

        public static bool IsValidUsername(string? username)
        {
            if (string.IsNullOrWhiteSpace(username)) return false;
            return UsernameRegex.IsMatch(username.Trim());
        }

        public static bool IsValidContactNumber(string? contactNumber)
        {
            if (string.IsNullOrWhiteSpace(contactNumber)) return false;
            return ContactNumberRegex.IsMatch(contactNumber.Trim());
        }

        public static bool IsValidAadhaar(string? aadhaar)
        {
            if (string.IsNullOrWhiteSpace(aadhaar)) return false;

            // Strip spaces and hyphens
            string clean = Regex.Replace(aadhaar.Trim(), @"[\s-]", "");

            // 12 digits, cannot start with 0 or 1, no repeated dummy numbers
            if (!Regex.IsMatch(clean, @"^\d{12}$")) return false;
            if (clean.StartsWith("0") || clean.StartsWith("1")) return false;
            if (Regex.IsMatch(clean, @"^(\d)\1{11}$")) return false;

            return AadhaarRegex.IsMatch(clean);
        }

        public static bool IsValidGst(string? gst)
        {
            if (string.IsNullOrWhiteSpace(gst)) return false;
            return GstRegex.IsMatch(gst.Trim().ToUpper());
        }

        public static bool IsValidCin(string? cin)
        {
            if (string.IsNullOrWhiteSpace(cin)) return false;
            return CinRegex.IsMatch(cin.Trim().ToUpper());
        }

        public static bool IsValidUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return true; // Optional URL
            return Uri.TryCreate(url, UriKind.Absolute, out var uriResult) &&
                   (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
        }
    }
}
