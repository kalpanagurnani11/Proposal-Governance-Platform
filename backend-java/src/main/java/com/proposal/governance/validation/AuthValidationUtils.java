package com.proposal.governance.validation;

import java.util.regex.Pattern;

public final class AuthValidationUtils {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_-]{3,50}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,10}$");
    private static final Pattern CONTACT_PATTERN = Pattern.compile("^[6789]\\d{9}$");

    private AuthValidationUtils() {
        // Restrict instantiation
    }

    public static boolean isValidUsername(String username) {
        if (username == null) return false;
        return USERNAME_PATTERN.matcher(username.trim()).matches();
    }

    public static boolean isValidEmail(String email) {
        if (email == null || email.trim().isEmpty()) return false;
        String clean = email.trim();
        if (!clean.contains("@")) return false;
        String[] parts = clean.split("@");
        if (parts.length != 2 || parts[0].isEmpty() || parts[1].isEmpty()) return false;
        String domain = parts[1];
        if (domain.contains("..") || domain.startsWith(".") || domain.endsWith(".")) return false;
        if (!domain.contains(".")) return false;
        String[] domainSubparts = domain.split("\\.");
        String tld = domainSubparts[domainSubparts.length - 1];
        if (tld.length() < 2 || tld.length() > 10 || !tld.matches("^[a-zA-Z]+$")) return false;
        return EMAIL_PATTERN.matcher(clean).matches();
    }

    public static boolean isValidContactNumber(String contactNumber) {
        if (contactNumber == null || contactNumber.trim().isEmpty()) return false;
        String digits = contactNumber.replaceAll("[^0-9]", "");
        String coreNumber = digits;
        if (digits.length() == 12 && digits.startsWith("91")) {
            coreNumber = digits.substring(2);
        } else if (digits.length() == 11 && digits.startsWith("0")) {
            coreNumber = digits.substring(1);
        }
        return CONTACT_PATTERN.matcher(coreNumber).matches();
    }

    public static String validatePassword(String password) {
        if (password == null || password.trim().isEmpty()) {
            return "Password is required.";
        }
        if (password.length() < 6) {
            return "Password must be at least 6 characters long.";
        }
        return null;
    }
}

