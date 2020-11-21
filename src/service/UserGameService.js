import sequelize from "../model/index";

const { models } = sequelize;

/**
 * 查询指定用户的游戏权限
 * @param {*} id
 */
export const query = async (id) => {
    const userGame = await models.user_game.findByPk(id, { raw: true });
    if (userGame) {
        userGame.game_ids = userGame.game_ids.split(",").map((item) => Number(item));
    }
    return userGame;
};

/**
 * 查询指定用户的游戏权限
 * @param {*} params
 */
export const save = async (params) => {
    params.game_ids = params.game_ids.join(",");
    const userGame = await models.user_game.findByPk(params.user_id, { raw: true });
    if (userGame) {
        await models.user_game.update(
            {
                game_ids: params.game_ids,
            },
            {
                where: {
                    user_id: params.user_id,
                },
            }
        );
    } else {
        await models.user_game.create(params);
    }
};
