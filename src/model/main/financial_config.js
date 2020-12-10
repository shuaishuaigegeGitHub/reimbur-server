import Sequelize from "sequelize";

export default (sequelize) => {
    let financial_config = sequelize.define(
        "financial_config",
        {
            name: {
                type: Sequelize.STRING(50),
                comment: "配置名称",
                primaryKey: true,
            },
            value: {
                type: Sequelize.INTEGER,
                comment: "数值",
            },
            remark: {
                type: Sequelize.STRING(255),
                comment: "备注",
            },
        },
        {
            tableName: "financial_config",
        }
    );
    return financial_config;
};
