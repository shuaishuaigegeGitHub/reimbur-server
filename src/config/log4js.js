// log4js 配置，详细配置查看：https://log4js-node.github.io/log4js-node/
export default {
    appenders: {
        // 控制台输出
        stdout: {
            type: "stdout",
        },
        // 保存日志到 logs/main.log，每天一个文件，保存30天，并且压缩
        main: {
            type: "dateFile",
            filename: "logs/main.log",
            compress: true,
            daysToKeep: 30,
            keepFileExt: true,
            alwaysIncludePattern: true,
        },
        // 保存错误日志到 logs/err.log，每天一个文件，保存30天，并且压缩
        err: {
            type: "dateFile",
            filename: "logs/err.log",
            compress: true,
            daysToKeep: 30,
            keepFileExt: true,
            alwaysIncludePattern: true,
        },
    },
    categories: {
        default: {
            appenders: ["stdout"],
            level: "DEBUG",
        },
        main: {
            appenders: ["main"],
            level: "DEBUG",
        },
        err: {
            appenders: ["err"],
            level: "ERROR",
        },
    },
};
