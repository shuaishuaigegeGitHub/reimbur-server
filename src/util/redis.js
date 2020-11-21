import Redis from "ioredis";

/**
 * 游戏Redis数据库映射
 */
const GAME_REDIS_MAP = new Map();

/**
 * 根据配置获取Redis数据库连接
 * @param {*} config { host, db, port, password }
 */
export const gameRedis = (config) => {
    const key = `${config.host}:${config.db}`;
    let conn = GAME_REDIS_MAP.get(key);
    if (conn) {
        return conn;
    }
    conn = new Redis(config);
    GAME_REDIS_MAP.set(key, conn);
    return conn;
};
