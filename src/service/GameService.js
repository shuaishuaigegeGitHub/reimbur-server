import sequelize from "../model/index";
import { Op } from "sequelize";
import GlobalError from "@/common/GlobalError";
import { PARAM_ERROR_CODE } from "@/constant/ResponseCode";
import config from "@/config/index";
import { getDatabaseList, syncDatabase } from "@/util/mysql";
import dayjs from "dayjs";

const { models } = sequelize;

/**
 * 游戏查询
 */
export const query = async (params) => {
    const where = {};
    if (params.channel_id) {
        where.channel_id = params.channel_id;
    }
    if (params.name) {
        where.name = {
            [Op.like]: `%${params.name}%`,
        };
    }
    const result = await models.game_channel.findAll({
        attributes: [
            "id",
            "name",
            "appid",
            "secret",
            "channel_id",
            "logo",
            "redis_host",
            "redis_select",
            "base_host",
            "base_name",
            "status",
            "class_id",
        ],
        where,
        raw: true,
    });
    return result;
};

/**
 * 新增游戏
 * 部署游戏数据库（Mysql，Redis）
 * @param {*} params
 */
export const add = async (params) => {
    const { name, class_id, channel_id } = params;
    const classified = await models.classified.findOne({
        where: {
            id: class_id,
        },
        raw: true,
    });
    if (!classified) {
        throw new GlobalError(PARAM_ERROR_CODE, "分类不存在");
    }
    const channel = await models.channel.findOne({
        where: {
            id: channel_id,
        },
        raw: true,
    });
    if (!channel) {
        throw new GlobalError(PARAM_ERROR_CODE, "平台不存在");
    }
    // 该Redis数据库已经使用的db数量（db从0开始）
    const redisUseCount = await models.game_channel.count({
        where: {
            redis_host: config.game.redis_host,
            redis_port: config.game.redis_port,
        },
    });
    // 数据库名称 = 渠道英文名称_类型英文名称_游戏名称首字母小写
    let databaseName = [channel.en_name, classified.en_name, name.spell("first", "low")].join("_");

    await createDatabase({ ...params, databaseName, redisUseCount });
};

/**
 * 创建游戏数据库
 * @param {*} params
 */
async function createDatabase(params) {
    const connectData = {
        host: config.game.db_host,
        port: config.game.db_port,
        user: config.game.db_username,
        password: config.game.db_password,
    };

    // 该数据库名被使用的次数
    const databaseNameCount = await models.game_channel.count({
        where: {
            base_name: {
                [Op.like]: `${params.databaseName}%`,
            },
        },
    });

    // 对应数据库服务器的数据库列表
    let databaseList = await getDatabaseList(connectData);
    // 数据库名字，如果有重复的数据库名字，贼在原有基础上加上数字
    let databaseName = params.databaseName;
    if (databaseNameCount) {
        databaseList = databaseList.filter((item) => {
            return item.startsWith(databaseName);
        });
        if (databaseList.length) {
            databaseName = databaseName + databaseList.length;
        } else {
            databaseName = databaseName + databaseNameCount;
        }
    }
    databaseName = databaseName.toLowerCase();

    await models.game_channel.create({
        name: params.name,
        appid: params.appid,
        secret: params.secret,
        logo: params.icon,
        status: params.status,
        class_id: params.class_id,
        channel_id: params.channel_id,
        weigh: 1,
        type: 1,
        port: "",

        redis_host: config.game.redis_host,
        redis_port: config.game.redis_port,
        redis_pwd: config.game.redis_password,
        redis_select: params.redisUseCount,
        base_host: config.game.db_host,
        base_name: databaseName,
        base_username: config.game.db_username,
        base_password: config.game.db_password,
        base_dialect: config.game.db_dialect,
        qiniu_access: config.game.qiniu_access,
        qiniu_secret: config.game.qiniu_secret,
        qiniu_bucket: config.game.qiniu_bucket,
        qiniu_host: config.game.qiniu_host,
    });

    // 原数据库连接配置
    const dbConfig = {};
    if (params.copy_appid) {
        // 有选择要复制的游戏数据库
        const copyGame = await models.game_channel.findOne({
            where: {
                appid: params.copy_appid,
            },
        });
        if (copyGame) {
            dbConfig.host = copyGame.base_host;
            dbConfig.user = copyGame.base_username;
            dbConfig.password = copyGame.base_password;
            dbConfig.databaseName = copyGame.base_name;
            dbConfig.appid = copyGame.appid;
        }
    } else {
        dbConfig.host = config.game.copy_db_host;
        dbConfig.user = config.game.copy_db_username;
        dbConfig.port = config.game.copy_db_port;
        dbConfig.password = config.game.copy_db_password;
        dbConfig.databaseName = config.game.copy_db_database;
    }

    // 同步数据库
    await syncDatabase(connectData, databaseName, dbConfig);
}

/**
 * 删除指定游戏
 * @param {*} params
 */
export const del = async (params) => {
    await models.game_channel.destroy({
        where: {
            id: params.id,
        },
    });
};

/**
 * 编辑游戏配置
 * @param {*} params
 */
export const edit = async (params) => {
    let game = await models.game_channel.findOne({
        where: {
            appid: params.appid,
        },
        raw: true,
    });
    if (game && game.id != params.id) {
        // 该appid已被其他游戏使用
        throw new GlobalError(PARAM_ERROR_CODE, `appid【${params.appid}】已被【${game.name}】使用`);
    }
    await models.game_channel.update(
        {
            name: params.name,
            appid: params.appid,
            secret: params.secret,
            channel_id: params.channel_id,
            class_id: params.class_id,
            logo: params.icon,
            status: params.status,
            put_leading: params.put_leading,
            updatetime: dayjs().unix(),
        },
        {
            where: {
                id: params.id,
            },
        }
    );
};
