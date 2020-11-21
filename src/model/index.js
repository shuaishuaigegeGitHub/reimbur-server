import loadJsRecursively from "@/util/loadJsRecursively";
import config from "@/config/index";
import { Sequelize } from "sequelize";
import * as logger from "@/util/logger";

// 游戏数据库连接池映射
const gameMap = new Map();

/**
 * 根据数据库配置获取数据库连接池（sequelize实例）
 * @param {*} dbConfig 数据库配置 { host, port, database, username, password, dialect }
 */
export const gameModel = (dbConfig) => {
    // 由 数据库地址:数据库名称 组合成key
    const key = `${dbConfig.host}:${dbConfig.database}`;
    let gameSequelize = gameMap.get(key);
    if (gameSequelize) {
        return gameSequelize;
    }
    // 根据数据库连接配置获取对应的数据库模型sequelize
    gameSequelize = new Sequelize({ ...dbConfig, logging: logger.sql });
    loadJsRecursively("model/game", (initModel) => {
        initModel(gameSequelize);
    });
    // 数据库连接池存储在gameMap中
    gameMap.set(key, gameSequelize);
    return gameSequelize;
};

/* 加载主数据库模型 */
const mainSequelize = new Sequelize({ ...config.sequelize, logging: logger.sql });
loadJsRecursively("model/main", (initModel) => {
    initModel(mainSequelize);
});

export default mainSequelize;
