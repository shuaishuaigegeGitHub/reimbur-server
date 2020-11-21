/**
 * 返回成功码
 */
export const SUCCESS_CODE = 0;

/**
 * 服务器内部错误码
 */
export const SERVER_ERROR_CODE = 500;

/**
 * 找不到资源错误码
 */
export const NOT_FOUND_CODE = 404;

/**
 * 未授权错误码
 * 遇到需要登陆才能查看的资源，还未登录时请求会报错
 */
export const UNAUTHORIZED_CODE = 401;

/**
 * 权限不足错误码
 */
export const PERMISSION_DENY_CODE = 403;

/**
 * 参数错误码以 60 开头，
 * 若是不知道什么参数错误，则使用 600
 */
export const PARAM_ERROR_CODE = 600;

/**
 * 缺少参数错误
 */
export const PARAM_MISS_CODE = 601;

/**
 * 参数类型错误
 */
export const PARAM_TYPE_CODE = 602;
