const express = require('express');
const { generateState, buildGoogleAuthUrl, exchangeCodeForTokens, getGoogleUserInfo } = require('../utils/googleOAuth');
const crypto = require('crypto');
const { body } = require('express-validator');
const User = require('../models/User');
const Cart = require('../models/Cart');
const { validate } = require('../middleware/validate');
const {
  generateAccessToken,
  setAuthCookie,
  clearAuthCookie,
  authenticate,
} = require('../middleware/auth');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../utils/email');

const router = express.Router();

// ─── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    body('firstName').trim().notEmpty().withMessage('First name required').isLength({ max: 50 }),
    body('lastName').trim().notEmpty().withMessage('Last name required').isLength({ max: 50 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });

      // Merge guest cart if sessionId provided
      const sessionId = req.body.sessionId || req.cookies?.cartSessionId;
      if (sessionId) {
        const guestCart = await Cart.findOne({ sessionId });
        if (guestCart && guestCart.items.length > 0) {
          let userCart = await Cart.findOne({ user: user._id });
          if (!userCart) {
            guestCart.user = user._id;
            guestCart.sessionId = undefined;
            await guestCart.save();
          } else {
            // Merge items
            for (const guestItem of guestCart.items) {
              const existingItem = userCart.items.find(
                i => i.slug === guestItem.slug
              );
              if (existingItem) {
                existingItem.qty += guestItem.qty;
              } else {
                userCart.items.push(guestItem);
              }
            }
            await userCart.save();
            await Cart.deleteOne({ _id: guestCart._id });
          }
        }
      }

      // Send verification email (non-blocking)
      try {
        await sendVerificationEmail({
          email: user.email,
          firstName: user.firstName,
          token: verificationToken,
        });
      } catch (emailErr) {
        console.error('Verification email failed:', emailErr.message);
      }

      const token = generateAccessToken(user._id);
      setAuthCookie(res, token);

      res.status(201).json({
        message: 'Account created. Please check your email to verify your account.',
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ error: 'Failed to create account' });
    }
  }
);

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password +googleId');
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      // Account exists but was created via Google (no password set). Tell the
      // user to use the Google button instead of failing generically.
      if (!user.password) {
        if (user.googleId) {
          return res.status(401).json({
            error: 'This account uses Google sign-in. Please continue with Google.',
          });
        }
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Account has been deactivated' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Update last login
      user.lastLoginAt = new Date();
      await user.save({ validateBeforeSave: false });

      // Merge guest cart if sessionId provided
      const sessionId = req.body.sessionId || req.cookies?.cartSessionId;
      if (sessionId) {
        const guestCart = await Cart.findOne({ sessionId });
        if (guestCart && guestCart.items.length > 0) {
          let userCart = await Cart.findOne({ user: user._id });
          if (!userCart) {
            guestCart.user = user._id;
            guestCart.sessionId = undefined;
            await guestCart.save();
          } else {
            for (const guestItem of guestCart.items) {
              const existingItem = userCart.items.find(i => i.slug === guestItem.slug);
              if (existingItem) {
                existingItem.qty += guestItem.qty;
              } else {
                userCart.items.push(guestItem);
              }
            }
            await userCart.save();
            await Cart.deleteOne({ _id: guestCart._id });
          }
        }
      }

      const token = generateAccessToken(user._id);
      setAuthCookie(res, token);

      res.json({
        message: 'Logged in successfully',
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          avatar: user.avatar,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ─── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully' });
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// ─── POST /api/auth/verify-email ──────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Email verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ─── POST /api/auth/resend-verification ───────────────────────────────────────
router.post('/resend-verification', authenticate, async (req, res) => {
  try {
    if (req.user.isEmailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await User.findByIdAndUpdate(req.user._id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    await sendVerificationEmail({
      email: req.user.email,
      firstName: req.user.firstName,
      token: verificationToken,
    });

    res.json({ message: 'Verification email sent' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// ─── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email required')],
  validate,
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: 'If an account exists, a reset email has been sent.' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await User.findByIdAndUpdate(user._id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });

      try {
        await sendPasswordResetEmail({
          email: user.email,
          firstName: user.firstName,
          token: resetToken,
        });
      } catch (emailErr) {
        // Log full error so you can see what's wrong in server logs
        console.error('Password reset email failed:', emailErr.message, emailErr);
      }

      res.json({ message: 'If an account exists, a reset email has been sent.' });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: 'Failed to process request' });
    }
  }
);

// ─── POST /api/auth/reset-password ────────────────────────────────────────────
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
      .matches(/[0-9]/).withMessage('Must contain a number'),
  ],
  validate,
  async (req, res) => {
    try {
      const { token, password } = req.body;

      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      }).select('+passwordResetToken +passwordResetExpires');

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      clearAuthCookie(res);
      res.json({ message: 'Password reset successfully. Please log in.' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

// ─── PATCH /api/auth/profile ───────────────────────────────────────────────────
router.patch(
  '/profile',
  authenticate,
  [
    body('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
    body('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
    body('phone').optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { firstName, lastName, phone, defaultAddress } = req.body;
      const updates = {};
      if (firstName) updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;
      if (phone !== undefined) updates.phone = phone;
      if (defaultAddress) updates.defaultAddress = defaultAddress;

      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true,
      });

      res.json({ user });
    } catch (err) {
      console.error('Profile update error:', err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// ─── POST /api/auth/change-password ───────────────────────────────────────────
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
      .matches(/[0-9]/).withMessage('Must contain a number'),
  ],
  validate,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id).select('+password');

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      user.password = newPassword;
      // validateBeforeSave:false prevents other required fields from blocking this targeted update
      await user.save({ validateBeforeSave: false });

      res.json({ message: 'Password changed successfully' });
    } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// ─── GET /api/auth/google ──────────────────────────────────────────────────────
router.get('/google', (req, res) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CALLBACK_URL } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CALLBACK_URL) {
    return res.status(503).json({ error: 'Google OAuth not configured' });
  }
  const state = generateState();
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 10 * 60 * 1000,
  });
  res.redirect(buildGoogleAuthUrl(GOOGLE_CLIENT_ID, GOOGLE_CALLBACK_URL, state));
});

// ─── GET /api/auth/google/callback ────────────────────────────────────────────
router.get('/google/callback', async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://reflexityram.com';
  const fail = (reason) => res.redirect(`${FRONTEND_URL}/auth/callback?auth_error=${reason}`);

  const { code, error, state } = req.query;
  const storedState = req.cookies?.oauth_state;

  if (!state || !storedState || state !== storedState) {
    return fail('state_mismatch');
  }

  res.clearCookie('oauth_state', { httpOnly: true, secure: true, sameSite: 'none' });

  if (error || !code) return fail('google_denied');

  try {
    const tokens = await exchangeCodeForTokens(
      code,
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
    if (!tokens.access_token) return fail('token_exchange_failed');

    const profile = await getGoogleUserInfo(tokens.access_token);
    if (!profile.email) return fail('no_email');

    const email = profile.email.toLowerCase();
    let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

    if (user) {
      if (!user.googleId) user.googleId = profile.id;
      if (!user.avatar && profile.picture) user.avatar = profile.picture;
      if (!user.isEmailVerified) user.isEmailVerified = true;
      user.lastLoginAt = new Date();
      await user.save({ validateBeforeSave: false });
    } else {
      const nameParts = (profile.name || '').split(' ').filter(Boolean);
      // lastName is required on the User model. Google accounts with a
      // single-word name (no family_name) would otherwise produce an empty
      // lastName and fail validation → server_error. Fall back so creation
      // always succeeds; the user can edit it later in their profile.
      const firstName = profile.given_name || nameParts[0] || 'User';
      const lastName =
        profile.family_name ||
        nameParts.slice(1).join(' ') ||
        '—';
      user = await User.create({
        email,
        googleId: profile.id,
        firstName,
        lastName,
        avatar: profile.picture || null,
        isEmailVerified: true,
        isActive: true,
        lastLoginAt: new Date(),
      });
    }

    if (!user.isActive) return fail('account_deactivated');

    const token = generateAccessToken(user._id);
    setAuthCookie(res, token);

    const userData = encodeURIComponent(JSON.stringify({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      avatar: user.avatar || null,
    }));

    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&user=${userData}`);
  } catch (err) {
    console.error('Google OAuth callback error:', err.message, err);
    fail('server_error');
  }
});

module.exports = router;


