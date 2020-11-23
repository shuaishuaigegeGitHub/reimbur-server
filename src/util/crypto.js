import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import cryptojs from "crypto-js";

dayjs.extend(isBetween);

// ------------------- 系统的AES加密解密算法 begin ---------------------

const AES_ENCRYPT_KEY = Buffer.from(process.env.AES_ENCRYPT_KEY, "utf8");

// sign方式不加密sign字段
const SIGN_KEY = "sign";

/**
 * 数据签名：把params中的参数按照字母大小顺序排序，使用 & 拼接各个参数，使用 = 拼接key和value
 * value需要经过encodeURI编码，拼接的字符串需要使用AES加密。
 * 例如：
 * params = { data: [1, 3], time: 13467321, abc: '随便写的&' }
 * 要加密的字符串则为：abc=随便写的&data=[1,3]
 * @param {object|string} params
 */
export const sign = (params) => {
    // param 不能为 null, undefined, ''，且类型必须为 object
    if (!params || typeof params !== "object") {
        throw new Error("参数不合法");
    }
    // 设置当前时间
    params.time = dayjs().unix();
    let keys = Object.keys(params);
    // 按照字母大小排序
    keys.sort();
    // 使用&，=拼接参数
    let signStr = "";
    keys.forEach((key) => {
        if (key !== SIGN_KEY) {
            signStr += "&" + key + "=" + encodeURIComponent(JSON.stringify(params[key]));
        }
    });
    if (!signStr) {
        throw new Error("参数不合法");
    }
    // 去掉第一个&
    signStr = signStr.substr(1);
    // uri编码
    return encodeURI(aesEncrypt(signStr));
};

/**
 * AES解密，返回对象
 */
export const deSign = (signStr) => {
    let encodeStr = aesDecrypt(decodeURI(signStr));
    const arr = encodeStr.split("&");
    let result = {};
    arr.forEach((item) => {
        let tempArr = item.split("=");
        result[tempArr[0]] = JSON.parse(decodeURIComponent(tempArr[1]));
    });
    return result;
};

/**
 * 加密字符串
 * @param {string} str 要加密的字符串内容
 */
function aesEncrypt(str) {
    return cryptojs.AES.encrypt(str, cryptojs.enc.Utf8.parse(AES_ENCRYPT_KEY), {
        mode: cryptojs.mode.ECB,
        padding: cryptojs.pad.Pkcs7,
    });
}

/**
 * AES解密
 * @param {string} str 要解密的base64字符串
 */
function aesDecrypt(str) {
    let decryptData = cryptojs.AES.decrypt(str, cryptojs.enc.Utf8.parse(AES_ENCRYPT_KEY), {
        mode: cryptojs.mode.ECB,
        padding: cryptojs.pad.Pkcs7,
    });
    return decryptData.toString(cryptojs.enc.Utf8);
}

// ------------------- 系统的AES加密解密算法 end  ---------------------
