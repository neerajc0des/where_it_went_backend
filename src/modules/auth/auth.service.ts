import bcrypt from "bcryptjs";
import prisma from "../../config/db";
import { RegisterInput } from "./auth.schema";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../utils/jwt";

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

    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken }
    });

    return {
        id: user.id,
        name: user.name,
        email: user.email,
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


// Logout service
// export const logoutService = async (userId: string) => {
//   await prisma.user.update({
//     where: { id: userId },
//     data: { refreshToken: null }
//   });
// };

export const logoutService = async (refreshToken: string) => {
  await prisma.user.updateMany({
    where: { refreshToken },
    data: { refreshToken: null }
  });
};