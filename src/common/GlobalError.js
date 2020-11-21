/**
 * 全局错误类
 */
export default class GlobalError extends Error {
    constructor(errcode, msg) {
        super(msg);
        this.errcode = errcode;
    }
}
