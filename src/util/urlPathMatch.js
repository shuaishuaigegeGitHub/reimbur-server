/**
 * 通配符
 */
const WILDCARD = "*";

/**
 * 双重通配符
 */
const DOUBLE_WILDCARD = "**";

/**
 * 路径表达式匹配校验
 * @param {string} reg 路径表达式：/api/user/**，/api/* /edit
 * @param {string} path 路径：/api/user/add
 */
export const urlPathMatch = (reg, path) => {
    let regArr = reg.split("/");
    let pathArr = path.split("/");
    let i = 0;
    while (i < regArr.length) {
        if (regArr[i] === DOUBLE_WILDCARD) {
            // 遇到 ** 直接通过
            return true;
        }
        if (regArr[i] === WILDCARD) {
            // 遇到 * 表示当前 [i] 匹配成功
            i++;
            continue;
        }
        if (i < pathArr.length) {
            if (regArr[i] !== pathArr[i]) {
                return false;
            }
        } else {
            return false;
        }
        i++;
    }
    return i >= pathArr.length;
};
