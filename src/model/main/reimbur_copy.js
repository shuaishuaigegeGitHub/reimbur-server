import Sequelize from "sequelize";

export default (sequelize) => {
    let reimbur_copy = sequelize.define(
        "reimbur_copy",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            r_id: {
                type: Sequelize.INTEGER,
                comment: "报销单ID",
            },
            user_id: {
                type: Sequelize.INTEGER,
                comment: "用户ID",
            },
            user_name: {
                type: Sequelize.STRING(50),
                comment: "用户名",
            },
            avatar: {
                type: Sequelize.STRING(255),
                comment: "头像",
            },
        },
        {
            tableName: "reimbur_copy",
        }
    );
    return reimbur_copy;
};
