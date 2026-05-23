import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import prisma from "../../config/db";
import { RegisterInput } from "./auth.schema";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { sendVerificationEmail } from "../../utils/email";
import { UAParser } from "ua-parser-js";

interface DeviceInfo {
  ipAddress?: string;
  userAgent?: string;
}

// Register Service
export const registerService = async (
    payload: RegisterInput,
    deviceInfo: DeviceInfo  
) => {
    const {name, email, password} = payload;

    //checking if user already exists
    const existingUser = await prisma.user.findUnique({
        where: {
            email,
        },
    });

    if(existingUser) {
        throw new Error('User already exists');
    }

    // creating new user
    // hashing password

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name, email, password: hash
        }
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    const verifyToken = randomBytes(32).toString("hex");

    // parsing device details
    const parser = new UAParser(deviceInfo.userAgent);
    const browser = parser.getBrowser().name ?? 'Unknown browser';
    const os = parser.getOS().name ?? 'Unknown OS';
    const deviceName = `${browser} on ${os}`;

    // await prisma.user.update({
    //     where: { id: user.id },
    //     data: { refreshToken }
    // });


    // await prisma.verificationToken.create({
    //     data: {
    //         token: verifyToken,
    //         userId: user.id,
    //         expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours from now
    //     },
    // });

    await prisma.session.create({
        data: {
            refreshToken,
            userId: user.id,
            deviceName,
            ipAddress: deviceInfo.ipAddress,
            userAgent: deviceInfo.userAgent,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  // 7 days from now
        }
    });

    await prisma.verificationToken.create({
        data: {
            token: verifyToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        }
    });

    sendVerificationEmail(user.email, verifyToken).catch(console.error);

    return {
        message: "Registration successful. Please check your email to verify your account.",
        userId: user.id,
        accessToken,
        refreshToken,
    }
}


// login service
export const loginService = async (
    email: string,
    password: string,
    deviceInfo: DeviceInfo  
) => {
        //checking if user already exists
    const existingUser = await prisma.user.findUnique({
        where: {
            email,
        },
    });

    if (!existingUser) {
        throw new Error('Invalid email or password');
    }

    if (!existingUser.password) {
        throw new Error('Invalid email or password');
    }

    if (!existingUser.isEmailVerified) {
        throw new Error('Please verify your email before logging in');
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);
    

    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    const accessToken = generateAccessToken(existingUser.id);
    const refreshToken = generateRefreshToken(existingUser.id);

    // update refresh token in db
    // await prisma.user.update({
    //     where: { id: existingUser.id },
    //     data: { refreshToken }
    // });

    // parsing device details
    const parser = new UAParser(deviceInfo.userAgent);
    const browser = parser.getBrowser().name ?? 'Unknown browser';
    const os = parser.getOS().name ?? 'Unknown OS';
    const deviceName = `${browser} on ${os}`;

    await prisma.session.create({
        data: {
            refreshToken,
            userId: existingUser.id,
            deviceName,
            ipAddress: deviceInfo.ipAddress,
            userAgent: deviceInfo.userAgent,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
    });

    return {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        accessToken,
        refreshToken,
    };
}

// refresh token service
export const refreshTokenService = async (token:string) =>{
    const payload = verifyRefreshToken(token);

    // const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    // if (!user || user.refreshToken !== token) {
    //     throw new Error('Invalid refresh token');
    // }   

    const session = await prisma.session.findUnique({
        where: { refreshToken: token }
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
        throw new Error('Invalid or expired session');
    }

    // const newAccessToken = generateAccessToken(user.id);
    // const newRefreshToken = generateRefreshToken(user.id);
    const newAccessToken = generateAccessToken(payload.userId);
    const newRefreshToken = generateRefreshToken(payload.userId);

    await prisma.session.update({
        where: { id: session.id },
        data: { isRevoked: true  }
    });   

    await prisma.session.create({
        data: {
            refreshToken: newRefreshToken,
            userId: payload.userId,
            deviceName: session.deviceName,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
    });

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    }
}


export const logoutService = async (refreshToken: string) => {
  await prisma.session.updateMany({
    where: { refreshToken },
    data: { isRevoked: true }
  });
};


export const verifyEmailService = async (token: string) => {
    const verificationRecord = await prisma.verificationToken.findUnique({
        where: { token },
        include: { user: true },
    });

    if (!verificationRecord) {
        throw new Error('Invalid verification token');
    }

    if (verificationRecord.expiresAt < new Date()) {
        throw new Error('Verification token has expired');
    }

    // Update user to verified and delete the used token in a single transaction
    await prisma.$transaction([
        prisma.user.update({
            where: { id: verificationRecord.userId },
            data: { isEmailVerified: true },
        }),
        prisma.verificationToken.delete({
            where: { id: verificationRecord.id },
        }),
    ]);

    return { message: "Email successfully verified. You can now log in." };
};