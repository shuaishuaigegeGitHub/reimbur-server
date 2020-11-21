import sequelize from "../model/index";
import { Op } from "sequelize";
import GlobalError from "@/common/GlobalError";
import { PARAM_ERROR_CODE } from "@/constant/ResponseCode";
import dayjs from "dayjs";
import * as util from "@/util/index";

const { models } = sequelize;

/**
 * 查询平台-渠道-游戏
 * @param {*} params
 */
export const option = async (uid) => {
    const allChannel = await models.channel.findAll({
        raw: true,
    });
    // 用户所拥有的游戏权限
    const userGame = await models.user_game.findByPk(uid);
    let where = {
        id: [],
    };
    if (userGame && userGame.game_ids) {
        where = {
            id: userGame.game_ids.split(","),
        };
    }
    const allGame = await models.game_channel.findAll({
        where,
        raw: true,
    });

    // 把游戏放到对应的渠道对象的gameList数组中
    allGame.forEach((item) => {
        const channel = allChannel.find((channelItem) => {
            return channelItem.id === item.channel_id;
        });
        if (channel) {
            if (channel.gameList) {
                channel.gameList.push(item);
            } else {
                channel.gameList = [item];
            }
        }
    });
    const result = util.groupBy(allChannel, "platform");
    return result;
};

/**
 * 查询
 */
export const query = async (params) => {
    let where = {};
    if (params.name) {
        where.name = {
            [Op.like]: `%${params.name}%`,
        };
    }
    const result = await models.channel.findAll({
        where,
        raw: true,
    });
    return result;
};

/**
 * 新增
 */
export const add = async (params) => {
    const count = await models.channel.count({
        where: {
            en_name: params.en_name,
        },
    });
    if (count) {
        throw new GlobalError(PARAM_ERROR_CODE, `【${params.en_name}】已被使用`);
    }
    return await models.platform.create(params);
};

/**
 * 编辑
 * @param {*} params
 */
export const edit = async (params) => {
    const platform = await models.channel.findOne({
        where: {
            en_name: params.en_name,
        },
        raw: true,
    });
    if (platform && platform.id != params.id) {
        // 如果已经存在en_name，并且不是正在编辑的平台数据
        throw new GlobalError(PARAM_ERROR_CODE, `【${params.en_name}】已被使用`);
    }
    await models.channel.update(
        {
            ...params,
            updatetime: dayjs().unix(),
        },
        {
            where: {
                id: params.id,
            },
        }
    );
};

/**
 * 删除
 * @param {*} params
 */
export const del = async ({ id }) => {
    const count = await models.game_channel.count({
        where: {
            platform_id: id,
        },
    });
    if (count) {
        throw new GlobalError(PARAM_ERROR_CODE, "该平台已被使用，无法删除");
    }
    await models.channel.destroy({
        where: {
            id: id,
        },
    });
};
