import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import prisma from "../../config/db";
import { RegisterInput } from "./auth.schema";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { sendVerificationEmail } from "../../utils/email";

// Register Service
export const registerService = async (
    payload: RegisterInput
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

    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken }
    });

    await prisma.verificationToken.create({
        data: {
            token: verifyToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours from now
        },
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
    password: string
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
    await prisma.user.update({
        where: { id: existingUser.id },
        data: { refreshToken }
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

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user || user.refreshToken !== token) {
        throw new Error('Invalid refresh token');
    }

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken }
    });   

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    }
}


export const logoutService = async (refreshToken: string) => {
  await prisma.user.updateMany({
    where: { refreshToken },
    data: { refreshToken: null }
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