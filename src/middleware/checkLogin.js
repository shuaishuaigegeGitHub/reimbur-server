import * as jwt from "@/util/jwt";
import GlobalError from "@/common/GlobalError";
import { UNAUTHORIZED_CODE } from "@/constant/ResponseCode";
import { urlPathMatch } from "@/util/urlPathMatch";

/**
 * 登录验证中间件
 */
export default (opts = {}) => {
    // 直接放行的路径
    const excludePath = opts.excludePath || [];
    return async (ctx, next) => {
        const path = ctx.path;
        let allow = false;
        // eslint-disable-next-line no-unused-vars
        for (let item of excludePath) {
            if (urlPathMatch(item, path)) {
                allow = true;
                break;
            }
        }
        if (allow) {
            await next();
        } else {
            const token = ctx.headers.token || ctx.query.token;
            if (!token) {
                throw new GlobalError(UNAUTHORIZED_CODE, "未认证");
            }
            try {
                const data = jwt.verify(token);
                ctx.state = data;
                ctx.token = token;
            } catch (err) {
                throw new GlobalError(UNAUTHORIZED_CODE, "TOEKN校验失败");
            }
            await next();
        }
    };
};
