import Sequelize from "sequelize";

export default (sequelize) => {
    let bank_settle = sequelize.define(
        "bank_settle",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "ID",
                primaryKey: true,
                autoIncrement: true,
            },
            cb_id: {
                type: Sequelize.INTEGER,
                comment: "公司主体ID(company_body的ID)",
            },
            settle_id: {
                type: Sequelize.STRING(50),
                comment: "结算ID",
            },
            bank_bill_id: {
                type: Sequelize.INTEGER,
                comment: "银行账单ID（type=0时有值）",
            },
            day: {
                type: Sequelize.STRING(30),
                comment: "日期（或者时间段）",
            },
            order_id: {
                type: Sequelize.INTEGER,
                comment: "买卖量，抵扣账单ID（type!=0时有值）",
            },
            our_account_name: {
                type: Sequelize.STRING(50),
                comment: "我方户名（银行账户名或者公司名称）",
            },
            our_account: {
                type: Sequelize.STRING(50),
                comment: "我方银行账号",
            },
            other_account_name: {
                type: Sequelize.STRING(50),
                comment: "对方户名（银行账户名或者公司名称）",
            },
            other_account: {
                type: Sequelize.STRING(50),
                comment: "对方银行账号",
            },
            type: {
                type: Sequelize.TINYINT(4),
                comment: "账单类型。0：银行账单，1：卖量，2：买量，3：抵扣",
            },
            money: {
                type: Sequelize.DECIMAL(12, 2),
                comment: "系统金额（买量、卖量、抵扣的应收款），type!=0时使用",
            },
            debit_money: {
                type: Sequelize.DECIMAL(12, 2),
                comment: "借方发生额（付款），type=0时使用",
            },
            lender_money: {
                type: Sequelize.DECIMAL(12, 2),
                comment: "贷方发生额（收款），type=0时使用",
            },
            summary: {
                type: Sequelize.STRING(255),
                comment: "摘要",
            },
            subject_id: {
                type: Sequelize.STRING(20),
                comment: "所属科目",
            },
            status: {
                type: Sequelize.TINYINT(4),
                comment: "1：刚结算完，2：已被整理到subject_money_statistics表",
            },
            remark: {
                type: Sequelize.STRING(255),
                comment: "备注",
            },
            createtime: {
                type: Sequelize.INTEGER,
                comment: "创建时间",
            },
        },
        {
            tableName: "bank_settle",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return bank_settle;
};
