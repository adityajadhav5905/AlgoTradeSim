import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { userRepository as defaultUserRepo } from '../../repositories/UserRepository.js';
import { auditLogRepository as defaultAuditRepo } from '../../repositories/AuditLogRepository.js';
import { ValidationError, AuthenticationError, NotFoundError } from '../../shared/errors/AppError.js';

export class SecurityApplicationService {
  constructor({
    userRepository = defaultUserRepo,
    auditLogRepository = defaultAuditRepo
  } = {}) {
    this.userRepository = userRepository;
    this.auditLogRepository = auditLogRepository;
  }

  // Strong password policy check
  validatePasswordPolicy(password) {
    if (!password || password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      throw new ValidationError('Password must contain uppercase, lowercase, numbers, and special characters');
    }
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  generateAccessToken(user) {
    const secret = process.env.JWT_SECRET || 'supersecretjwtkey';
    return jwt.sign(
      { userId: user.userId, name: user.name, role: user.role },
      secret,
      { expiresIn: '15m' }
    );
  }

  generateRefreshToken(user) {
    const secret = process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkey';
    return jwt.sign(
      { userId: user.userId },
      secret,
      { expiresIn: '7d' }
    );
  }

  async quickRegister(name, ipAddress, userAgent) {
    if (!name?.trim()) {
      throw new ValidationError('Name is required');
    }
    const trimmed = name.trim();
    
    // Find or create user session
    let user = await this.userRepository.findByUserName(trimmed);
    if (!user) {
      const userId = uuidv4();
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      user = await this.userRepository.create({
        userId,
        name: trimmed,
        password: hashedPassword,
        role: 'User'
      });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new ValidationError('Account is temporarily locked out');
    }

    // Generate rotated tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    user.refreshTokenHash = this.hashToken(refreshToken);
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    await this.logAuditEntry(user.userId, 'LOGIN_QUICK', ipAddress, userAgent);

    return { user, accessToken, refreshToken };
  }

  async register({ name, password, role = 'User' }, ipAddress, userAgent) {
    if (!name?.trim() || !password) {
      throw new ValidationError('Name and password are required');
    }
    const trimmed = name.trim();
    this.validatePasswordPolicy(password);

    const existing = await this.userRepository.findByUserName(trimmed);
    if (existing) {
      throw new ValidationError('Username is already taken');
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.userRepository.create({
      userId,
      name: trimmed,
      password: hashedPassword,
      role
    });

    await this.logAuditEntry(user.userId, 'REGISTER', ipAddress, userAgent);

    // Generate credentials
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    user.refreshTokenHash = this.hashToken(refreshToken);
    await user.save();

    return { user, accessToken, refreshToken };
  }

  async login({ name, password }, ipAddress, userAgent) {
    if (!name?.trim() || !password) {
      throw new ValidationError('Name and password are required');
    }
    const trimmed = name.trim();
    const user = await this.userRepository.findByUserName(trimmed);
    if (!user) {
      throw new AuthenticationError('Invalid username or password');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMs = user.lockUntil.getTime() - Date.now();
      const minutes = Math.ceil(remainingMs / 60000);
      throw new ValidationError(`Account locked. Try again in ${minutes} minutes`);
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lockout
      }
      await user.save();
      throw new AuthenticationError('Invalid username or password');
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    user.refreshTokenHash = this.hashToken(refreshToken);
    await user.save();

    await this.logAuditEntry(user.userId, 'LOGIN', ipAddress, userAgent);

    return { user, accessToken, refreshToken };
  }

  async logout(userId, ipAddress, userAgent) {
    const user = await this.userRepository.findByUserId(userId);
    if (user) {
      user.refreshTokenHash = null;
      await user.save();
      await this.logAuditEntry(userId, 'LOGOUT', ipAddress, userAgent);
    }
    return { message: 'Logged out successfully' };
  }

  async refresh(refreshToken, ipAddress, userAgent) {
    if (!refreshToken) {
      throw new AuthenticationError('Refresh token required');
    }

    const secret = process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkey';
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, secret);
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findByUserId(decoded.userId);
    if (!user || !user.refreshTokenHash) {
      throw new AuthenticationError('Invalid refresh session');
    }

    const incomingHash = this.hashToken(refreshToken);
    if (user.refreshTokenHash !== incomingHash) {
      // Rotation violation: stolen token reuse detection!
      user.refreshTokenHash = null;
      await user.save();
      await this.logAuditEntry(user.userId, 'SUSPICIOUS_TOKEN_REUSE', ipAddress, userAgent);
      throw new AuthenticationError('Suspicious session activity detected. Please login again.');
    }

    // Generate rotated access and refresh tokens
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);
    user.refreshTokenHash = this.hashToken(newRefreshToken);
    await user.save();

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async changePassword(userId, { oldPassword, newPassword }, ipAddress, userAgent) {
    if (!oldPassword || !newPassword) {
      throw new ValidationError('Old and new passwords are required');
    }
    const user = await this.userRepository.findByUserId(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password || '');
    if (!isMatch) {
      throw new ValidationError('Invalid old password');
    }

    this.validatePasswordPolicy(newPassword);
    user.password = await bcrypt.hash(newPassword, 10);
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    await this.logAuditEntry(userId, 'PASSWORD_CHANGE', ipAddress, userAgent);
    return { message: 'Password changed successfully' };
  }

  async logAuditEntry(userId, action, ipAddress = 'unknown', userAgent = 'unknown') {
    return this.auditLogRepository.create({
      logId: uuidv4(),
      userId,
      action,
      ipAddress,
      userAgent
    });
  }
}

export const securityApplicationService = new SecurityApplicationService();
