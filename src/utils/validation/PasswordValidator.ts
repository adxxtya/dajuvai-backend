/**
 * Password validation utility
 * Validates password strength and complexity
 */
export class PasswordValidator {
  /**
   * Minimum password length
   */
  static readonly MIN_LENGTH = 12;
  
  /**
   * Password complexity patterns
   */
  static readonly PATTERNS = {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    number: /\d/,
    special: /[@$!%*?&]/,
  };
  
  /**
   * Common passwords list (top 100 most common passwords)
   * In production, this should be loaded from a file or database
   */
  private static readonly COMMON_PASSWORDS = new Set([
    'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
    'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
    'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
    'qazwsx', 'michael', 'football', 'password1', 'password123', 'admin', 'welcome',
    'login', 'princess', 'solo', 'starwars', 'whatever', 'donald', 'batman',
    'zaq1zaq1', 'Password', 'Password1', 'Password123', 'admin123', 'root',
    'toor', 'pass', 'test', 'guest', 'info', 'adm', 'mysql', 'user', 'administrator',
    'oracle', 'ftp', 'pi', 'puppet', 'ansible', 'ec2-user', 'vagrant', 'azureuser',
    'academy', 'access', 'access14', 'action', 'admin1', 'admin12', 'admin123',
    'administrator', 'admins', 'ads', 'adslolitec', 'adtran', 'advance', 'agent',
    'agent_steal', 'alarm', 'alex', 'alexander', 'alice', 'alien', 'alpha',
    'alpine', 'amanda', 'amber', 'america', 'amigo', 'amy', 'analog', 'anchor',
    'andrea', 'andrew', 'andy', 'angel', 'angela', 'angels', 'animal', 'anna',
  ]);
  
  /**
   * Validate password strength
   * 
   * @param password - Password to validate
   * @returns Validation result with errors if any
   */
  static validate(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check length
    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    }
    
    // Check for uppercase letters
    if (!this.PATTERNS.uppercase.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    // Check for lowercase letters
    if (!this.PATTERNS.lowercase.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    // Check for numbers
    if (!this.PATTERNS.number.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    // Check for special characters
    if (!this.PATTERNS.special.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
    
    // Check against common passwords
    if (this.isCommonPassword(password)) {
      errors.push('Password is too common. Please choose a more unique password');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Check if password is in the common passwords list
   * 
   * @param password - Password to check
   * @returns True if password is common, false otherwise
   */
  static isCommonPassword(password: string): boolean {
    // Check exact match (case-insensitive)
    const lowerPassword = password.toLowerCase();
    return this.COMMON_PASSWORDS.has(lowerPassword);
  }
  
  /**
   * Calculate password strength score (0-100)
   * 
   * @param password - Password to score
   * @returns Strength score from 0 (weak) to 100 (strong)
   */
  static calculateStrength(password: string): number {
    let score = 0;
    
    // Length score (up to 30 points)
    if (password.length >= this.MIN_LENGTH) {
      score += 20;
      // Bonus for extra length
      score += Math.min(10, (password.length - this.MIN_LENGTH) * 2);
    }
    
    // Complexity score (up to 40 points)
    if (this.PATTERNS.uppercase.test(password)) score += 10;
    if (this.PATTERNS.lowercase.test(password)) score += 10;
    if (this.PATTERNS.number.test(password)) score += 10;
    if (this.PATTERNS.special.test(password)) score += 10;
    
    // Variety score (up to 20 points)
    const uniqueChars = new Set(password).size;
    score += Math.min(20, uniqueChars * 2);
    
    // Penalty for common passwords
    if (this.isCommonPassword(password)) {
      score = Math.max(0, score - 50);
    }
    
    // Penalty for repeated characters
    const repeatedChars = password.match(/(.)\1{2,}/g);
    if (repeatedChars) {
      score = Math.max(0, score - repeatedChars.length * 5);
    }
    
    // Penalty for sequential characters (abc, 123, etc.)
    if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789/i.test(password)) {
      score = Math.max(0, score - 10);
    }
    
    return Math.min(100, score);
  }
  
  /**
   * Get password strength label
   * 
   * @param score - Strength score (0-100)
   * @returns Strength label
   */
  static getStrengthLabel(score: number): string {
    if (score < 30) return 'Weak';
    if (score < 60) return 'Fair';
    if (score < 80) return 'Good';
    return 'Strong';
  }
}

