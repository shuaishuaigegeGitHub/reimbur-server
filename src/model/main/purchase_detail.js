import Sequelize from "sequelize";

export default (sequelize) => {
    let purchase_detail = sequelize.define(
        "purchase_detail",
        {
            id: {
                type: Sequelize.STRING(36),
                comment: "UUID",
                primaryKey: true,
            },
            p_id: {
                type: Sequelize.INTEGER,
                comment: "采购ID",
            },
            name: {
                type: Sequelize.STRING(50),
                comment: "物品名称",
            },
            norm: {
                type: Sequelize.STRING(20),
                comment: "规格",
            },
            money: {
                type: Sequelize.DECIMAL(10, 2),
                comment: "单价(元)",
            },
            number: {
                type: Sequelize.INTEGER,
                comment: "数量",
            },
            unit: {
                type: Sequelize.STRING(10),
                comment: "单位",
            },
            index: {
                type: Sequelize.INTEGER,
                comment: "索引排序（从小到大排）",
            },
            status: {
                type: Sequelize.TINYINT(4),
                comment: "是否报销（0：否，1：是）",
            },
        },
        {
            tableName: "purchase_detail",
        }
    );
    return purchase_detail;
};
