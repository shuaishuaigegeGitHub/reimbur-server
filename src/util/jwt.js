import jwt from "jsonwebtoken";
import config from "@/config/index";

/**
 * 使用JWT对数据进行签名
 * @param {object} data 签名的数据
 * @returns {string} 签名后的字符串
 */
export const sign = (data) => {
    return jwt.sign(
        {
            data: data,
        },
        config.jwt.secret,
        {
            expiresIn: config.jwt.expires,
        }
    );
};

/**
 * 对JWT签名字符串进行解密，获取数据
 * @param {string} signStr JWT签名字符串
 */
export const verify = (signStr) => {
    return jwt.verify(signStr, config.jwt.secret);
};
