import { SERVER_ERROR_CODE } from "@/constant/ResponseCode";

/**
 * 全局异常处理中间件
 */
export default () => {
    return async (ctx, next) => {
        try {
            await next();
        } catch (err) {
            ctx.logger.error("%S", err.stack);
            ctx.renderJson({
                code: err.errcode || err.status || SERVER_ERROR_CODE,
                msg: err.message || "服务器内部错误",
            });
        }
    };
};
