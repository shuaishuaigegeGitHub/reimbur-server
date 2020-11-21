import Sequelize from "sequelize";

export default (sequelize) => {
    let cbc_bank_bill_detail = sequelize.define(
        "cbc_bank_bill_detail",
        {
            id: {
                type: Sequelize.BIGINT(20),
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            bank_bill_id: {
                type: Sequelize.INTEGER,
                comment: "银行账单ID，对应cbc_bank_bill的id",
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
            tableName: "cbc_bank_bill_detail",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return cbc_bank_bill_detail;
};
