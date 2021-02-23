import Sequelize from "sequelize";

export default (sequelize) => {
    let company_bank = sequelize.define(
        "company_bank",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            cb_id: {
                type: Sequelize.INTEGER,
                comment: "公司主体ID",
            },
            bank_name: {
                type: Sequelize.STRING(100),
                comment: "银行名称",
            },
            bank_account: {
                type: Sequelize.STRING(100),
                comment: "银行卡号",
            },
            money: {
                type: Sequelize.DECIMAL(16, 2),
                comment: "账户余额",
            },
            online_pay: {
                type: Sequelize.TINYINT(4),
                comment: "线上打款",
            },
            createtime: {
                type: Sequelize.INTEGER,
                comment: "创建时间",
            },
            updatetime: {
                type: Sequelize.INTEGER,
                comment: "最后更新时间",
            },
        },
        {
            tableName: "company_bank",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return company_bank;
};
