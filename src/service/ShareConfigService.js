import { Op } from "sequelize";
import GlobalError from "@/common/GlobalError";
import { PARAM_ERROR_CODE } from "@/constant/ResponseCode";
import dayjs from "dayjs";

/**
 * 查询
 */
export const query = async (gameSequelize, params) => {
    let where = {};
    if (params.share_title) {
        where.share_title = {
            [Op.like]: `%${params.share_title}%`,
        };
    }
    let { page = 1, size = 50 } = params;
    const result = await gameSequelize.models.share_config.findAndCountAll({
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
 * 新增
 */
export const add = async (gameSequelize, redis, params) => {
    const count = await gameSequelize.models.share_config.count({
        where: {
            share_key: params.share_key,
        },
    });
    if (count) {
        throw new GlobalError(PARAM_ERROR_CODE, `【${params.share_key}】已经存在`);
    }
    const result = await gameSequelize.models.share_config.create(params);
    updateRedis(redis);
    return result;
};

/**
 * 编辑
 * @param {*} params
 */
export const edit = async (gameSequelize, redis, params) => {
    const gameConfig = await gameSequelize.models.share_config.findByPk(params.id, { raw: true });
    if (!gameConfig) {
        throw new GlobalError(PARAM_ERROR_CODE, "配置项不存在");
    }
    const [count] = await gameSequelize.models.share_config.update(
        {
            share_title: params.share_title,
            share_img: params.share_img,
            client_logo: params.client_logo,
            logo_status: params.logo_status,
            status: params.status,
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
        updateRedis(redis);
    }
};

/**
 * 删除
 * @param {*} params
 */
export const del = async (gameSequelize, redis, { id }) => {
    const count = await gameSequelize.models.share_config.destroy({
        where: {
            id: id,
        },
    });
    if (count) {
        // 游戏配置删除成功
        updateRedis(redis);
    }
};

/**
 * 更新redis数据
 * @param {*} redis
 */
async function updateRedis(redis) {
    await redis.del("game:shareConfig");
    await redis.del("game:shareKeyConfig");
}
