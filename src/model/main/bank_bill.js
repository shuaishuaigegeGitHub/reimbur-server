import Sequelize from "sequelize";

export default (sequelize) => {
    let bank_bill = sequelize.define(
        "bank_bill",
        {
            id: {
                type: Sequelize.INTEGER,
                comment: "",
                primaryKey: true,
                autoIncrement: true,
            },
            cb_id: {
                type: Sequelize.INTEGER,
                comment: "公司ID（company_body表的ID）",
            },
            trsseq: {
                type: Sequelize.STRING(100),
                comment: "业务流水号（目前工商没有，招商有且唯一）",
            },
            busref: {
                type: Sequelize.STRING(100),
                comment:
                    "业务参考号（目前工商没有，招商可能有,通常是我们自己生成的）",
            },
            account: {
                type: Sequelize.STRING(100),
                comment: "账号",
            },
            account_name: {
                type: Sequelize.STRING(100),
                comment: "户名",
            },
            outlet_number: {
                type: Sequelize.STRING(100),
                comment: "网点号",
            },
            day: {
                type: Sequelize.STRING(20),
                comment: "日期",
            },
            transaction_type: {
                type: Sequelize.STRING(100),
                comment: "交易类型",
            },
            certificate_type: {
                type: Sequelize.STRING(100),
                comment: "凭证种类",
            },
            certificate_no: {
                type: Sequelize.STRING(50),
                comment: "凭证号",
            },
            other_account_name: {
                type: Sequelize.STRING(100),
                comment: "对方户名",
            },
            other_account: {
                type: Sequelize.STRING(100),
                comment: "对方账号",
            },
            summary: {
                type: Sequelize.STRING(255),
                comment: "摘要",
            },
            balance: {
                type: Sequelize.DECIMAL(11, 2),
                comment: "余额",
            },
            debit_money: {
                type: Sequelize.DECIMAL(11, 2),
                comment: "借方发生额",
            },
            lender_money: {
                type: Sequelize.DECIMAL(11, 2),
                comment: "贷方发生额",
            },
            origin_name: {
                type: Sequelize.STRING(255),
                comment: "文件原名称",
            },
            save_path: {
                type: Sequelize.STRING(255),
                comment: "文件存储路径",
            },
            origin: {
                type: Sequelize.STRING(20),
                comment: "账单来源。excel导入，手动录入，接口采集",
            },
            status: {
                type: Sequelize.TINYINT(4),
                comment:
                    "状态。1：未结算；2：已结算；3：普通核销；4：腾讯账单核销",
            },
            remark: {
                type: Sequelize.STRING(255),
                comment: "备注",
            },
            createtime: {
                type: Sequelize.INTEGER,
                comment: "创建时间",
            },
            updatetime: {
                type: Sequelize.INTEGER,
                comment: "更新时间",
            },
        },
        {
            tableName: "bank_bill",
            createdAt: "createtime",
            updatedAt: "updatetime",
        }
    );
    return bank_bill;
};
