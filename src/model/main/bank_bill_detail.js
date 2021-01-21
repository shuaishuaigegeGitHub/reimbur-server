import Sequelize from "sequelize";

export default (sequelize) => {
    let bank_bill_detail = sequelize.define(
        "bank_bill_detail",
        {
            id: {
                type: Sequelize.BIGINT(20),
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            cb_id: {
                type: Sequelize.INTEGER,
                comment: "公司主体ID(company_body的ID)",
            },
            bank_bill_id: {
                type: Sequelize.INTEGER,
                comment: "银行账单ID",
            },
            tb_id: {
                type: Sequelize.INTEGER,
                comment: "腾讯账单ID(tencent_bill的ID)，有则表示是腾讯账单核销",
            },
            day: {
                type: Sequelize.STRING(20),
                comment: "日期：2020-07-20",
            },
            money: {
                type: Sequelize.DECIMAL(12, 2),
                comment: "金额",
            },
            subject: {
                type: Sequelize.STRING(20),
                comment: "科目ID",
            },
            summary: {
                type: Sequelize.STRING(255),
                comment: "摘要",
            },
            remark: {
                type: Sequelize.STRING(255),
                comment: "备注",
            },
            status: {
                type: Sequelize.TINYINT(4),
                comment: "1：刚核销完，2：已被整理到subject_money_statistics表",
            },
            createtime: {
                type: Sequelize.INTEGER,
                comment: "创建时间",
            },
            updatetime: {
                type: Sequelize.INTEGER,
                comment: "最后更新时间",
            },
            create_by: {
                type: Sequelize.STRING(50),
                comment: "创建者",
            },
            update_by: {
                type: Sequelize.STRING(50),
                comment: "最后更新者",
            },
        },
        {
            tableName: "bank_bill_detail",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return bank_bill_detail;
};
