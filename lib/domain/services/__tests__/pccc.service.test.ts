import { 
  validatePCCC, 
  normalizePCCC, 
  maskPCCC, 
  formatPCCCForDisplay,
  sanitizePCCC,
  PCCCValidationResult 
} from '../pccc.service';

describe('PCCC Service', () => {
  describe('validatePCCC', () => {
    it('should validate correct PCCC format P123456789012', () => {
      const result = validatePCCC('P123456789012');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct PCCC format M123456789012', () => {
      const result = validatePCCC('M123456789012');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty PCCC', () => {
      const result = validatePCCC('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('개인통관고유부호를 입력해주세요');
    });

    it('should reject invalid prefix', () => {
      const result = validatePCCC('X123456789012');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('개인통관고유부호는 P 또는 M으로 시작해야 합니다');
    });

    it('should reject invalid length', () => {
      const result = validatePCCC('P12345');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('개인통관고유부호는 P/M + 12자리 숫자여야 합니다');
    });

    it('should reject non-numeric characters', () => {
      const result = validatePCCC('P12345678901A');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('개인통관고유부호는 숫자만 포함해야 합니다');
    });

    it('should accept PCCC with hyphens and normalize', () => {
      const result = validatePCCC('P-1234-5678-9012');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('P123456789012');
    });

    it('should accept PCCC with spaces and normalize', () => {
      const result = validatePCCC('P 1234 5678 9012');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('P123456789012');
    });

    it('should handle lowercase prefix', () => {
      const result = validatePCCC('p123456789012');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('P123456789012');
    });

    it('should provide formatted version', () => {
      const result = validatePCCC('P123456789012');
      expect(result.formatted).toBe('P1234-5678-9012');
    });
  });

  describe('normalizePCCC', () => {
    it('should normalize PCCC with various formats', () => {
      expect(normalizePCCC('P-1234-5678-9012')).toBe('P123456789012');
      expect(normalizePCCC('P 1234 5678 9012')).toBe('P123456789012');
      expect(normalizePCCC('p123456789012')).toBe('P123456789012');
      expect(normalizePCCC('M.1234.5678.9012')).toBe('M123456789012');
    });

    it('should preserve valid PCCC without changes', () => {
      expect(normalizePCCC('P123456789012')).toBe('P123456789012');
      expect(normalizePCCC('M123456789012')).toBe('M123456789012');
    });
  });

  describe('maskPCCC', () => {
    it('should mask PCCC showing last 4 digits by default', () => {
      expect(maskPCCC('P123456789012')).toBe('P********9012');
      expect(maskPCCC('M123456789012')).toBe('M********9012');
    });

    it('should mask PCCC showing specified number of digits', () => {
      expect(maskPCCC('P123456789012', 2)).toBe('P**********12');
      expect(maskPCCC('P123456789012', 6)).toBe('P******789012');
      expect(maskPCCC('P123456789012', 0)).toBe('P************');
    });

    it('should handle invalid input gracefully', () => {
      expect(maskPCCC('')).toBe('');
      expect(maskPCCC('P123')).toBe('P***');
      expect(maskPCCC('INVALID')).toBe('*******');
    });

    it('should mask formatted PCCC correctly', () => {
      expect(maskPCCC('P1234-5678-9012')).toBe('P****-****-9012');
    });
  });

  describe('formatPCCCForDisplay', () => {
    it('should format PCCC with hyphens', () => {
      expect(formatPCCCForDisplay('P123456789012')).toBe('P1234-5678-9012');
      expect(formatPCCCForDisplay('M123456789012')).toBe('M1234-5678-9012');
    });

    it('should handle already formatted PCCC', () => {
      expect(formatPCCCForDisplay('P1234-5678-9012')).toBe('P1234-5678-9012');
    });

    it('should normalize and format', () => {
      expect(formatPCCCForDisplay('p 1234 5678 9012')).toBe('P1234-5678-9012');
    });

    it('should handle invalid input', () => {
      expect(formatPCCCForDisplay('')).toBe('');
      expect(formatPCCCForDisplay('INVALID')).toBe('INVALID');
    });
  });

  describe('sanitizePCCC', () => {
    it('should remove all special characters except prefix', () => {
      expect(sanitizePCCC('P-1234-5678-9012')).toBe('P123456789012');
      expect(sanitizePCCC('P 1234 5678 9012')).toBe('P123456789012');
      expect(sanitizePCCC('P.1234.5678.9012')).toBe('P123456789012');
      expect(sanitizePCCC('P_1234_5678_9012')).toBe('P123456789012');
    });

    it('should uppercase the prefix', () => {
      expect(sanitizePCCC('p123456789012')).toBe('P123456789012');
      expect(sanitizePCCC('m123456789012')).toBe('M123456789012');
    });

    it('should handle mixed case and special characters', () => {
      expect(sanitizePCCC('p-1234-5678-9012')).toBe('P123456789012');
      expect(sanitizePCCC('M 1234-5678.9012')).toBe('M123456789012');
    });

    it('should preserve valid PCCC', () => {
      expect(sanitizePCCC('P123456789012')).toBe('P123456789012');
      expect(sanitizePCCC('M123456789012')).toBe('M123456789012');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined gracefully', () => {
      expect(validatePCCC(null as any).isValid).toBe(false);
      expect(validatePCCC(undefined as any).isValid).toBe(false);
      expect(normalizePCCC(null as any)).toBe('');
      expect(normalizePCCC(undefined as any)).toBe('');
      expect(maskPCCC(null as any)).toBe('');
      expect(maskPCCC(undefined as any)).toBe('');
    });

    it('should handle numbers as input', () => {
      const result = validatePCCC(123456789012 as any);
      expect(result.isValid).toBe(false);
    });

    it('should handle very long input', () => {
      const longPCCC = 'P' + '1'.repeat(20);
      const result = validatePCCC(longPCCC);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('개인통관고유부호는 P/M + 12자리 숫자여야 합니다');
    });

    it('should validate birth date format in PCCC', () => {
      // Birth date: 880101 (1988-01-01)
      const validBirthDate = validatePCCC('P880101123456');
      expect(validBirthDate.isValid).toBe(true);

      // Invalid birth date: 991301 (month 13)
      const invalidMonth = validatePCCC('P991301123456');
      expect(invalidMonth.isValid).toBe(true); // Still valid format, date validation is separate

      // Invalid birth date: 880132 (day 32)
      const invalidDay = validatePCCC('P880132123456');
      expect(invalidDay.isValid).toBe(true); // Still valid format, date validation is separate
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete validation and formatting flow', () => {
      const input = 'p-1234-5678-9012';
      
      // Validate
      const validation = validatePCCC(input);
      expect(validation.isValid).toBe(true);
      
      // Normalize
      const normalized = normalizePCCC(input);
      expect(normalized).toBe('P123456789012');
      
      // Format for display
      const formatted = formatPCCCForDisplay(normalized);
      expect(formatted).toBe('P1234-5678-9012');
      
      // Mask for security
      const masked = maskPCCC(formatted);
      expect(masked).toBe('P****-****-9012');
    });

    it('should reject invalid PCCC at any stage', () => {
      const invalid = 'X123456789012';
      
      const validation = validatePCCC(invalid);
      expect(validation.isValid).toBe(false);
      
      // Even if normalized, it's still invalid
      const normalized = normalizePCCC(invalid);
      expect(normalized).toBe('X123456789012');
      
      const revalidation = validatePCCC(normalized);
      expect(revalidation.isValid).toBe(false);
    });
  });
});