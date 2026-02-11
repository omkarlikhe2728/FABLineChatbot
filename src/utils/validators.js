class Validators {
  isValidPhone(phone) {
    // International format: +[country-code][number] (8-15 digits after +)
    const phoneRegex = /^\+\d{8,15}$/;
    return phoneRegex.test(phone);
  }

  formatPhoneInput(input) {
    // Remove spaces and special characters
    let cleaned = input.replace(/\D/g, '');

    // Add + if not present
    if (!cleaned.startsWith('+')) {
      // If starts with 0, remove it
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }

      // Assume country code 91 (India) if too short
      if (cleaned.length <= 10) {
        cleaned = '91' + cleaned;
      }

      cleaned = '+' + cleaned;
    }

    return cleaned;
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
