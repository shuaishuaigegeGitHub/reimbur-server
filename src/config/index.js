import log4jsConfig from "./log4js";

export default {
    appName: process.env.APP_NAME || "App",
    // koa启动端口号
    port: process.env.PORT || 80,
    // HTTP基本路径，如果配置了 /api，那么会在所有的路由前面加上 /api
    baseurl: "/api",
    middleware: {
        // 中间件配置，例如 middleware 目录下有个 globalError.js ，
        // 那么在这里写入 globalError 即可配置该中间件。配置中间件有
        // 顺序区别，放在前面的先加载。
        list: ["@koa/cors", "koa-body", "globalError", "checkLogin"],
        "koa-body": {
            multipart: true,
        },
        checkLogin: {
            // 不需要进行登录验证的路径
            excludePath: [],
        },
    },
    // sequelize相关配置，请查看(6.x版本) https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-constructor-constructor
    sequelize: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        dialect: process.env.DB_DIALECT,

        define: {
            // 关闭sequelize的 createdAt 和 updatedAt 字段，自定义
            timestamps: false,
        },
    },
    db: {
        // 是否同步数据库的model
        sync: false,
        // 是否覆盖原model
        override: false,
        // 要同步的表，有这个属性，优先使用这个同步
        tableName: [],
        // 要同步的数据库，如果没有tableName，在使用这个schema
        schema: process.env.DB_DATABASE,
    },
    // log4js 配置
    log4js: log4jsConfig,
    jwt: {
        secret: process.env.TOEKN_KEY,
        expires: "1d",
    },
    // 七牛云配置
    qiniu: {
        accessKey: process.env.QINIU_ACCESS_KEY,
        secretKey: process.env.QINIU_SECRET_KEY,
        bucket: process.env.QINIU_BUCKET,
        host: process.env.QINIU_HOST,
    },
};
