import log4js from "log4js";
import config from "@/config/index";
import { format } from "string-kit";

log4js.configure(config.log4js);

const defaultLogger = log4js.getLogger();
const mainLogger = log4js.getLogger("main");
const errLogger = log4js.getLogger("err");

/**
 * DEBUG 输出日志，支持字符串格式化
 *
 * 详细使用请查看：https://www.npmjs.com/package/string-kit
 * @param {string} msg
 * @param  {...any} params 参数
 */
export const debug = (msg, ...params) => {
    if (defaultLogger.isDebugEnabled()) {
        msg = format(msg, ...params);
        defaultLogger.debug(msg);
    }
};

/**
 * INFO 输出日志，支持字符串格式化
 * @param {string} msg
 * @param  {...any} params 参数
 */
export const info = (msg, ...params) => {
    if (defaultLogger.isInfoEnabled()) {
        msg = format(msg, ...params);
        defaultLogger.info(msg);
        mainLogger.info(msg);
    }
};

/**
 * WARN 输出日志，支持字符串格式化
 * @param {string} msg
 * @param  {...any} params 参数
 */
export const warn = (msg, ...params) => {
    if (defaultLogger.isWarnEnabled()) {
        msg = format(msg, ...params);
        defaultLogger.warn(msg);
        mainLogger.warn(msg);
    }
};

/**
 * ERROR 输出日志，支持字符串格式化
 * @param {string} msg
 * @param  {...any} params 参数
 */
export const error = (msg, ...params) => {
    if (defaultLogger.isErrorEnabled()) {
        msg = format(msg, ...params);
        defaultLogger.error(msg);
        mainLogger.error(msg);
        errLogger.error(msg);
    }
};

/**
 * 打印SQL语句
 * @param {string} msg sql语句
 */
export const sql = (msg) => {
    if (defaultLogger.isInfoEnabled()) {
        defaultLogger.info(msg);
        mainLogger.info(msg);
    }
};
