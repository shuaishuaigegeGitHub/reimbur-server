import { Op } from "sequelize";
import GlobalError from "@/common/GlobalError";
import { PARAM_ERROR_CODE } from "@/constant/ResponseCode";
import dayjs from "dayjs";
import sequelize from "@/model/index";

const { models } = sequelize;

// 游戏配置类型映射
const GAME_CONFIG_TYPE_MAP = {
    1: "地区屏蔽",
    2: "字符",
    3: "数字",
};

/**
 * 查询
 */
export const query = async (gameSequelize, params) => {
    let where = {};
    if (params.name) {
        where.name = {
            [Op.like]: `%${params.name}%`,
        };
    }
    let { page = 1, size = 50 } = params;
    const result = await gameSequelize.models.game_config.findAndCountAll({
        where,
        offset: (page - 1) * size,
        limit: Number(size),
        raw: true,
    });
    result.rows.forEach((item) => {
        item.createtime = dayjs.unix(item.createtime).format("YYYY-MM-DD HH:mm:ss");
        item.updatetime = dayjs.unix(item.updatetime).format("YYYY-MM-DD HH:mm:ss");
    });
    return result;
};

/**
 * 查询编辑日志信息
 * @param {*} gameSequelize
 * @param {*} appid
 */
export const log = async (appid) => {
    const result = await models.game_config_log.findAll({
        where: {
            appid,
        },
        raw: true,
        order: [["createtime", "DESC"]],
    });
    return result.map((item) => {
        item.createtime = dayjs.unix(item.createtime).format("YYYY-MM-DD HH:mm:ss");
        item.value = item.value.split(";");
        return item;
    });
};

/**
 * 新增
 */
export const add = async (gameSequelize, redis, params) => {
    const count = await gameSequelize.models.game_config.count({
        where: {
            key: params.key,
        },
    });
    if (count) {
        throw new GlobalError(PARAM_ERROR_CODE, `【${params.key}】已经存在`);
    }
    await gameSequelize.models.game_config.create(params);
    updateRedis(gameSequelize, redis, params.key, params.value);
    // 新增配置日志信息
    let logValue = `新增name：【${params.name}】;新增key：【${params.key}】;新增type：【${
        GAME_CONFIG_TYPE_MAP[params.type]
    }】;新增value：【${params.value}】;新增default_value：【${params.default_value}】`;
    // 记录新增游戏配置日志写入
    const gameConfigLog = {
        admin_id: params.uid,
        appid: params.appid,
        username: params.username,
        config_name: params.name,
        key: params.key,
        value: logValue,
        type: "10",
    };
    models.game_config_log.create(gameConfigLog);
};

/**
 * 编辑
 * @param {*} params
 */
export const edit = async (gameSequelize, redis, params) => {
    const gameConfig = await gameSequelize.models.game_config.findByPk(params.id, { raw: true });
    if (!gameConfig) {
        throw new GlobalError(PARAM_ERROR_CODE, "配置项不存在");
    }
    const [count] = await gameSequelize.models.game_config.update(
        {
            name: params.name,
            type: params.type,
            value: params.value,
            default_value: params.default_value,
            updatetime: dayjs().unix(),
        },
        {
            where: {
                id: params.id,
            },
        }
    );
    if (count) {
        // 修改成功
        updateRedis(gameSequelize, redis, params.key, params.value);
        // 记录修改游戏配置日志信息
        let logValue = "";
        if (gameConfig.type != params.type) {
            logValue += `原key：【${gameConfig.type}】修改为：【${params.type}】;`;
        }
        if (gameConfig.value != params.value) {
            logValue += `原value：【${gameConfig.value}】修改为：【${params.value}】;`;
        }
        if (gameConfig.type != params.type) {
            logValue += `原default_value：【${gameConfig.default_value}】修改为：【${params.default_value}】`;
        }
        // 新增配置日志写入
        const gameConfigLog = {
            admin_id: params.uid,
            appid: params.appid,
            username: params.username,
            config_name: params.name,
            key: params.key,
            value: logValue,
            type: "11",
        };
        models.game_config_log.create(gameConfigLog);
    }
};

/**
 * 删除
 * @param {*} params
 */
export const del = async (gameSequelize, redis, { id }) => {
    const count = await gameSequelize.models.game_config.destroy({
        where: {
            id: id,
        },
    });
    if (count) {
        // 游戏配置删除成功
        updateRedis(gameSequelize, redis);
    }
};

/**
 * 更新redis数据
 * @param {*} gameSequelize
 * @param {*} redis
 * @param {*} key
 * @param {*} value
 */
async function updateRedis(gameSequelize, redis, key, value) {
    const gameConfig = await gameSequelize.models.game_config.findAll({
        raw: true,
    });

    // 更新所有配置
    await redis.set("game:gameConfig", JSON.stringify(gameConfig), "EX", 86400 * 3);

    // 如果key为总开关，则更新总开关配置
    if (key === "shareSwitch") {
        await redis.set("game:shareSwitch", JSON.stringify(Number(value)), "EX", 86400 * 3);
    }

    // 如果key为地区开关，则更新地区开关
    if (key === "regionSwitch") {
        await redis.set("game:regionSwitch", JSON.stringify(Number(value)), "EX", 86400 * 3);
    }

    // 审核版本号
    if (key === "proVersion" || key === "pro_version") {
        await redis.set("game:proVersion", JSON.stringify(value), "EX", 86400 * 3);
    }

    // ip缓存开关
    if (key === "ipCacheSwitch") {
        await redis.set("game:ipCacheSwitch", JSON.stringify(Number(value)), "EX", 86400 * 3);
    }
    // pre-config
    if (key === "uiPattern") {
        await redis.set("game:uiPattern", JSON.stringify(Number(value)), "EX", 86400 * 3);
    }
}
