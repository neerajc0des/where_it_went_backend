import 'dotenv/config';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './db';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { UAParser } from 'ua-parser-js';
import { seedDefaultCategoriesService } from '../modules/categories/categories.service';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      passReqToCallback: true, 
    },
    async (req, _accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        const avatar = profile.photos?.[0].value;

        if (!email) return done(new Error('No email from Google'), undefined);

        // check if user already exists
        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
          // existing user — update googleId and avatar if not set
          user = await prisma.user.update({
            where: { email },
            data: {
              googleId: user.googleId ?? profile.id,
              avatar: user.avatar ?? avatar,
              isEmailVerified: true,
            }
          });
        } else {
          // new user — create account
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName,
              googleId: profile.id,
              avatar,
              isEmailVerified: true,
            }
          });

          await seedDefaultCategoriesService(user.id)
        }

        // generate your own JWT tokens
        const appAccessToken = generateAccessToken(user.id);
        const appRefreshToken = generateRefreshToken(user.id);

        const parser = new UAParser(req.headers?.['user-agent']);
        const browser = parser.getBrowser().name ?? 'Unknown';
        const os = parser.getOS().name ?? 'Unknown';

        await prisma.session.create({
          data: {
            refreshToken: appRefreshToken,
            userId: user.id,
            deviceName: `${browser} on ${os}`,
            userAgent: req.headers?.['user-agent'],
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          }
        });

        // await prisma.session.update({
        //   where: { id: user.id },
        //   data: { refreshToken: appRefreshToken }
        // });

        // pass tokens via user object to callback
        return done(null, { 
          ...user, 
          appAccessToken, 
          appRefreshToken 
        });

      } catch (error) {
        return done(error, undefined);
      }
    }
  )
);

export default passport;