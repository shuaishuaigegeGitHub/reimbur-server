import Sequelize from "sequelize";

export default (sequelize) => {
    let reimbur_receipt = sequelize.define(
        "reimbur_receipt",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            receipt_number: {
                type: Sequelize.STRING(10),
                comment: "发票号",
            },
            w_id: {
                type: Sequelize.INTEGER,
                comment: "对应的报销流程ID",
            },
        },
        {
            tableName: "reimbur_receipt",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return reimbur_receipt;
};
