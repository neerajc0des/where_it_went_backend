import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import prisma from "../../config/db";
import { RegisterInput } from "./auth.schema";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { sendPasswordResetEmail, sendVerificationEmail } from "../../utils/email";
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

    if(existingUser && !existingUser?.isEmailVerified){
        resendVerificationEmailService(existingUser.email);
        throw new Error('User with this email already exists but is not verified. Please check your email for verification link.');
    }

    if(existingUser) {
        throw new Error('User with this email already exists');
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
            type: 'EMAIL_VERIFICATION',
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

    // limiting sessions to 4 active sessions
    const activeSessions = await prisma.session.count({
        where: {
            userId: existingUser.id,
            isRevoked: false,
            expiresAt: { gt: new Date() }
        }
    });

    if (activeSessions >= 4) {
        // revoke the oldest session to make room
        const oldest = await prisma.session.findFirst({
            where: { userId: existingUser.id, isRevoked: false },
            orderBy: { createdAt: 'asc' }
        });
        if (oldest) {
            await prisma.session.update({
            where: { id: oldest.id },
            data: { isRevoked: true }
            });
        }
    }

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

    const userData = {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        googleId: existingUser.googleId,
        avatar: existingUser.avatar,
    }

    return {
        user: userData,
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
    if (verificationRecord.type !== 'EMAIL_VERIFICATION') {
        throw new Error('Invalid verification token');
    }
    if (verificationRecord.expiresAt < new Date()) {
        throw new Error('Verification token has expired');
    }
    if (verificationRecord.isUsed) 
        throw new Error('Verification token has already been used');

    if (verificationRecord.expiresAt < new Date()) 
        throw new Error('Verification token has expired');

    // Update user to verified and delete the used token in a single transaction
    await prisma.$transaction([
        prisma.user.update({
            where: { id: verificationRecord.userId },
            data: { isEmailVerified: true },
        }),
        prisma.verificationToken.update({
            where: { id: verificationRecord.id },
            data: { isUsed: true } ,
        }),
    ]);

    return { message: "Email successfully verified. You can now log in." };
};

export const resendVerificationEmailService = async (email: string) => {
    const user = await prisma.user.findUnique({where: {email}});

    if(!user) 
        return { message: 'If that email exists, a verification link has been sent.' };

    if(user.isEmailVerified) {
        throw new Error("Email is already verified. Please login.")
    }

    await prisma.verificationToken.updateMany({
        where: {
            userId: user.id,
            type: 'EMAIL_VERIFICATION',
            isUsed: false,
        },
        data: {isUsed: true}
    });

    const verifyToken = randomBytes(32).toString('hex');

    await prisma.verificationToken.create({
        data: {
            token: verifyToken,
            type: 'EMAIL_VERIFICATION',
            userId: user.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
        }
    });

    await sendVerificationEmail(user.email, verifyToken).catch(console.error);

    return { message: 'If that email exists, a verification link has been sent.' };
}

export const forgotPasswordService = async (email: string) =>{
    const user = await prisma.user.findUnique({where: {email}});

    if (!user) return { message: 'If that email exists, a reset link has been sent.' }; 

    await prisma.verificationToken.updateMany({
        where: { 
            userId: user.id, 
            type: 'PASSWORD_RESET', 
            isUsed: false 
        },
        data: { isUsed: true }
    });

    const resetToken = randomBytes(32).toString('hex');

    await prisma.verificationToken.create({
        data: {
            token: resetToken,
            type: 'PASSWORD_RESET',
            userId: user.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 30), // 30 mins
        }
    });

    await sendPasswordResetEmail(user.email, resetToken).catch(console.error);
}

export const resetPasswordService = async (token:string, newPassword:string) => {
    const record = await prisma.verificationToken.findUnique({
        where:{token},
        include: {user: true}
    });

    if(!record || record.type != 'PASSWORD_RESET'){
        throw new Error('Invalid reset token');
    }

    if (record.isUsed) {
        throw new Error('Reset token has already been used');
    }

    if (record.expiresAt < new Date()) {
        throw new Error('Reset token has expired');
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
        prisma.user.update({
            where: { id: record.userId },
            data: { password: hash }
        }),
        prisma.verificationToken.update({
            where: { id: record.id },
            data: { isUsed: true }
        }),

        // force logout all devices after password reset
        prisma.session.updateMany({
            where: { userId: record.userId },
            data: { isRevoked: true }
        })
    ]);

    return { message: 'Password reset successfully.' };
}