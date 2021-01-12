import Koa from "koa";
import Router from "koa-router";
import loadJsRecursively from "@/util/loadJsRecursively";
import config from "@/config/index";
import * as logger from "@/util/logger";
import { autoCreateModel, autoCreateSchema } from "@/util/autoCreateModel";
import "cnchar";

// 日志注册到 global 上
global.logger = logger;

export default class Application {
    constructor() {
        this.koa = new Koa();
        this.init();
        this.afterInitialization();
    }

    /**
     * 启动Koa
     * @param {function} callback 启动成功的回调方法
     */
    start(callback) {
        this.koa.listen(config.port, () => {
            logger.debug(
                `[${config.appName}] 启动成功：http://localhost:${config.port}`
            );
            if (callback && typeof callback === "function") {
                callback();
            }
        });
    }

    /**
     * 初始化项目：
     * 1.中间件
     * 2.路由
     * 3.koa上下文添加通用方法和属性
     */
    init() {
        this.loadMiddleware();
        this.loadRouter();
        this.appendContextFunctionOrProperty();
    }

    /**
     * 初始化后操作
     */
    afterInitialization() {
        this.syncModel();
    }

    /**
     * 给koa的上下文添加属性或者方法
     */
    appendContextFunctionOrProperty() {
        this.koa.context.renderJson = function (params = {}) {
            this.body = {
                code: params.code || 1000,
                msg: params.msg || "操作成功",
                data: params.data,
            };
        };

        // 日志注册到 ctx 上下文，在路由中可以使用 ctx.logger.debug() 进行日志打印
        this.koa.context.logger = logger;
    }

    /**
     * 加载路由
     * 把 src/controller 目录下的所有文件都加载
     */
    loadRouter() {
        let baseRouter = new Router({
            prefix: config.baseurl || "",
        });
        loadJsRecursively("api", (router) => {
            if (router instanceof Router) {
                baseRouter.use(router.routes());
            }
        });
        this.koa.use(baseRouter.routes());
        logger.debug("koa-router加载完成！");
    }

    /**
     * 加载中间件
     * 先加载 middleware 目录下的中间件
     * 如果加载失败，在加载 node_modules 中的中间件
     */
    loadMiddleware() {
        const middlewareList = config.middleware.list || [];
        middlewareList.forEach((middlewareName) => {
            try {
                let middlewareFunction = require("@/middleware/" +
                    middlewareName).default;
                this.koa.use(
                    middlewareFunction(config.middleware[middlewareName])
                );
                logger.debug("中间件【%s】加载成功！", middlewareName);
            } catch (err) {
                try {
                    // 如果 middleware 目录下没有对应中间件，那么就加载 node_modules 中的
                    let middlewareFunction = require(middlewareName);
                    this.koa.use(
                        middlewareFunction(config.middleware[middlewareName])
                    );
                    logger.debug("中间件【%s】加载成功！", middlewareName);
                } catch (error) {
                    throw new Error(`中间件【${middlewareName}】不存在！`);
                }
            }
        });
    }

    // 同步数据库的model
    syncModel() {
        if (process.env.NODE_ENV !== "dev") {
            // 非开发环境直接略过
            return;
        }
        if (config.db.sync) {
            // 如果需要同步数据库model
            let tableName = config.db.tableName;
            if (tableName && tableName.length) {
                for (let name of tableName) {
                    autoCreateModel(name, {
                        override: config.db.override,
                    });
                }
            } else {
                let schema = config.db.schema;
                if (schema) {
                    // 同步整个数据库
                    autoCreateSchema(config.sequelize.database, {
                        override: config.db.override,
                    });
                }
            }
        }
    }
}
