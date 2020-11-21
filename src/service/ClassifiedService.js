import sequelize from "../model/index";
import { Op } from "sequelize";
import GlobalError from "@/common/GlobalError";
import { PARAM_ERROR_CODE } from "@/constant/ResponseCode";
import dayjs from "dayjs";

const { models } = sequelize;

/**
 * 查询
 */
export const query = async (params) => {
    let where = {};
    if (params.name) {
        where[Op.or] = {
            name: {
                [Op.like]: `%${params.name}%`,
            },
            en_name: {
                [Op.like]: `%${params.name}%`,
            },
        };
    }
    const result = await models.classified.findAll({
        where,
        raw: true,
    });
    return result.map((item) => {
        item.updatetime = dayjs.unix(item.updatetime).format("YYYY-MM-DD HH:mm:ss");
        return item;
    });
};

/**
 * 新增
 */
export const add = async (params) => {
    const count = await models.classified.count({
        where: {
            en_name: params.en_name,
        },
    });
    if (count) {
        throw new GlobalError(PARAM_ERROR_CODE, `【${params.en_name}】已经存在`);
    }
    return await models.classified.create(params);
};

/**
 * 编辑
 * @param {*} params
 */
export const edit = async (params) => {
    const classified = await models.classified.findOne({
        where: {
            en_name: params.en_name,
        },
        raw: true,
    });
    if (classified && classified.id != params.id) {
        // 如果已经存在en_name，并且不是正在编辑的分类
        throw new GlobalError(PARAM_ERROR_CODE, `【${params.en_name}】已经存在`);
    }
    await models.classified.update(
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
            class_id: id,
        },
    });
    if (count) {
        throw new GlobalError(PARAM_ERROR_CODE, "该分类已被使用，无法删除");
    }
    await models.classified.destroy({
        where: {
            id: id,
        },
    });
};
