import Sequelize from "sequelize";

export default (sequelize) => {
    let reimbur_detail = sequelize.define(
        "reimbur_detail",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            r_id: {
                type: Sequelize.INTEGER,
                comment: "报销ID",
            },
            pd_id: {
                type: Sequelize.STRING(36),
                comment: "采购明细ID",
            },
            payment_id: {
                type: Sequelize.INTEGER,
                comment: "买量账单ID（买量才有用）",
            },
            start_date: {
                type: Sequelize.STRING(10),
                comment: "开始日期（买量才有用）",
            },
            end_date: {
                type: Sequelize.STRING(10),
                comment: "结束日期（买量才有用）",
            },
            name: {
                type: Sequelize.STRING(100),
                comment: "物品名称",
            },
            money: {
                type: Sequelize.DECIMAL(12, 2),
                comment: "单价",
            },
            number: {
                type: Sequelize.INTEGER,
                comment: "数量",
            },
            unit: {
                type: Sequelize.STRING(10),
                comment: "单位",
            },
            subject_id: {
                type: Sequelize.STRING(20),
                comment: "科目ID",
            },
            receipt_number: {
                type: Sequelize.STRING(255),
                comment: "发票号",
            },
            remark: {
                type: Sequelize.STRING(255),
                comment: "备注",
            },
        },
        {
            tableName: "reimbur_detail",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return reimbur_detail;
};
