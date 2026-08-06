package com.proposal.governance.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

public class AadhaarValidator implements ConstraintValidator<ValidAadhaar, String> {
    private static final String AADHAAR_PATTERN = "^[2-9]{1}[0-9]{11}$";

    @Override
    public void initialize(ValidAadhaar constraintAnnotation) {}

    @Override
    public boolean isValid(String aadhaar, ConstraintValidatorContext context) {
        if (aadhaar == null || aadhaar.trim().isEmpty()) {
            return false;
        }
        return Pattern.compile(AADHAAR_PATTERN).matcher(aadhaar).matches();
    }
}
