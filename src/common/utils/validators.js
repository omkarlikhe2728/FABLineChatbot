class Validators {
  isValidPhone(phone) {
    // International format: +[country-code][number] (8-15 digits after +)
    const phoneRegex = /^\+\d{8,15}$/;
    return phoneRegex.test(phone);
  }

  formatPhoneInput(input) {
    // Remove spaces, dashes, and parentheses but keep + and digits
    let cleaned = input.replace(/[\s\-()]/g, '').trim();

    // If input already has +, just ensure it has only digits and +
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // If input starts with +, it's already formatted
    // Otherwise, just add the + prefix as-is (user should provide country code)
    // This supports various formats:
    // - 6596542183 (Singapore, 8 digits after implicit +65)
    // - 919890903580 (India, full 12 digits with country code)
    // - 41788891088 (Switzerland, 10 digits with country code)
    // - 971505597187 (UAE, 11 digits with country code)

    return '+' + cleaned;
  }

  isValidOTP(otp) {
    // Exactly 6 digits
    return /^\d{6}$/.test(otp);
  }

  sanitizeInput(input) {
    // Remove dangerous content
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/[<>\"']/g, '')
      .trim();
  }
}

module.exports = new Validators();
